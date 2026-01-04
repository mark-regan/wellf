package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
	"github.com/mark-regan/wellf/pkg/validator"
)

func formatCurrency(amount float64, currency string) string {
	return fmt.Sprintf("%.2f %s", amount, currency)
}

type TransactionHandler struct {
	txRepo        *repository.TransactionRepository
	holdingRepo   *repository.HoldingRepository
	portfolioRepo *repository.PortfolioRepository
	yahooService  *services.YahooService
}

func NewTransactionHandler(
	txRepo *repository.TransactionRepository,
	holdingRepo *repository.HoldingRepository,
	portfolioRepo *repository.PortfolioRepository,
	yahooService *services.YahooService,
) *TransactionHandler {
	return &TransactionHandler{
		txRepo:        txRepo,
		holdingRepo:   holdingRepo,
		portfolioRepo: portfolioRepo,
		yahooService:  yahooService,
	}
}

type CreateTransactionRequest struct {
	Symbol          string  `json:"symbol"`
	TransactionType string  `json:"transaction_type"`
	Quantity        float64 `json:"quantity"`
	Price           float64 `json:"price"`
	TotalAmount     float64 `json:"total_amount"`
	Currency        string  `json:"currency"`
	TransactionDate string  `json:"transaction_date"`
	Notes           string  `json:"notes"`
}

func (h *TransactionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid portfolio ID")
		return
	}

	belongs, err := h.portfolioRepo.BelongsToUser(r.Context(), portfolioID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if !validator.IsValidTransactionType(req.TransactionType) {
		Error(w, http.StatusBadRequest, "Invalid transaction type")
		return
	}

	// Parse date
	txDate, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid date format (use YYYY-MM-DD)")
		return
	}

	if txDate.After(time.Now()) {
		Error(w, http.StatusBadRequest, "Transaction date cannot be in the future")
		return
	}

	if req.Currency == "" {
		req.Currency = "GBP"
	}

	tx := &models.Transaction{
		PortfolioID:     portfolioID,
		TransactionType: req.TransactionType,
		TotalAmount:     req.TotalAmount,
		Currency:        req.Currency,
		TransactionDate: txDate,
		Notes:           req.Notes,
	}

	// For buy/sell transactions, we need an asset
	if req.TransactionType == models.TransactionTypeBuy || req.TransactionType == models.TransactionTypeSell {
		if req.Symbol == "" {
			Error(w, http.StatusBadRequest, "Symbol is required for buy/sell transactions")
			return
		}
		if req.Quantity <= 0 {
			Error(w, http.StatusBadRequest, "Quantity must be positive")
			return
		}
		if req.Price <= 0 {
			Error(w, http.StatusBadRequest, "Price must be positive")
			return
		}

		// Get or create asset
		asset, err := h.yahooService.GetOrCreateAsset(r.Context(), req.Symbol)
		if err != nil {
			Error(w, http.StatusBadRequest, "Failed to find asset: "+err.Error())
			return
		}

		tx.AssetID = &asset.ID
		tx.Quantity = &req.Quantity
		tx.Price = &req.Price
		tx.TotalAmount = req.Quantity * req.Price

		// Update holdings
		if req.TransactionType == models.TransactionTypeBuy {
			err = h.holdingRepo.AddToHolding(r.Context(), portfolioID, asset.ID, req.Quantity, req.Price, &tx.TransactionDate)
		} else {
			err = h.holdingRepo.RemoveFromHolding(r.Context(), portfolioID, asset.ID, req.Quantity)
		}

		if err != nil {
			if errors.Is(err, repository.ErrInsufficientHoldings) {
				Error(w, http.StatusBadRequest, "Insufficient holdings: you don't have enough units to sell")
				return
			}
			if errors.Is(err, repository.ErrHoldingNotFound) {
				Error(w, http.StatusBadRequest, "No holdings found: you don't own any of this asset")
				return
			}
			Error(w, http.StatusInternalServerError, "Failed to update holdings")
			return
		}
	}

	// For deposit/withdrawal transactions (CASH portfolios)
	if req.TransactionType == models.TransactionTypeDeposit || req.TransactionType == models.TransactionTypeWithdrawal {
		if req.TotalAmount <= 0 {
			Error(w, http.StatusBadRequest, "Amount must be positive")
			return
		}

		// For withdrawals, check that there's sufficient balance
		if req.TransactionType == models.TransactionTypeWithdrawal {
			balance, err := h.txRepo.GetCashBalance(r.Context(), portfolioID)
			if err != nil {
				Error(w, http.StatusInternalServerError, "Failed to check balance")
				return
			}
			if balance < req.TotalAmount {
				Error(w, http.StatusBadRequest, "Insufficient balance: you only have "+formatCurrency(balance, req.Currency)+" available")
				return
			}
		}
	}

	// For dividend transactions
	if req.TransactionType == models.TransactionTypeDividend {
		if req.Symbol != "" {
			asset, err := h.yahooService.GetOrCreateAsset(r.Context(), req.Symbol)
			if err == nil {
				tx.AssetID = &asset.ID
			}
		}
	}

	if err := h.txRepo.Create(r.Context(), tx); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create transaction")
		return
	}

	// Track contributions for ISA/LISA/JISA portfolios
	if req.TransactionType == models.TransactionTypeBuy || req.TransactionType == models.TransactionTypeDeposit || req.TransactionType == models.TransactionTypeTransferIn {
		portfolio, err := h.portfolioRepo.GetByID(r.Context(), portfolioID)
		if err == nil && repository.HasContributionLimit(portfolio.Type) {
			// Add contribution to metadata
			contributionAmount := tx.TotalAmount
			if err := h.portfolioRepo.AddContribution(r.Context(), portfolioID, contributionAmount); err != nil {
				// Log but don't fail the transaction
				// The contribution tracking is secondary to the main transaction
			}
		}
	}

	JSON(w, http.StatusCreated, tx)
}

func (h *TransactionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid portfolio ID")
		return
	}

	belongs, err := h.portfolioRepo.BelongsToUser(r.Context(), portfolioID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	// Pagination
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	offset := (page - 1) * perPage

	transactions, total, err := h.txRepo.GetByPortfolioID(r.Context(), portfolioID, perPage, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch transactions")
		return
	}

	if transactions == nil {
		transactions = []*models.Transaction{}
	}

	Paginated(w, transactions, total, page, perPage)
}

func (h *TransactionHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	txID, err := uuid.Parse(chi.URLParam(r, "txId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid transaction ID")
		return
	}

	belongs, err := h.txRepo.BelongsToUser(r.Context(), txID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	tx, err := h.txRepo.GetByID(r.Context(), txID)
	if err != nil {
		if errors.Is(err, repository.ErrTransactionNotFound) {
			Error(w, http.StatusNotFound, "Transaction not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch transaction")
		return
	}

	JSON(w, http.StatusOK, tx)
}

func (h *TransactionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	txID, err := uuid.Parse(chi.URLParam(r, "txId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid transaction ID")
		return
	}

	belongs, err := h.txRepo.BelongsToUser(r.Context(), txID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	// Note: Deleting a transaction doesn't automatically reverse the holding changes
	// This is intentional - the user should manually adjust holdings if needed

	if err := h.txRepo.Delete(r.Context(), txID); err != nil {
		if errors.Is(err, repository.ErrTransactionNotFound) {
			Error(w, http.StatusNotFound, "Transaction not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to delete transaction")
		return
	}

	NoContent(w)
}
