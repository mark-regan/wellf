package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/pkg/validator"
)

type CashAccountHandler struct {
	cashRepo      *repository.CashAccountRepository
	portfolioRepo *repository.PortfolioRepository
}

func NewCashAccountHandler(cashRepo *repository.CashAccountRepository, portfolioRepo *repository.PortfolioRepository) *CashAccountHandler {
	return &CashAccountHandler{
		cashRepo:      cashRepo,
		portfolioRepo: portfolioRepo,
	}
}

type CreateCashAccountRequest struct {
	AccountName  string   `json:"account_name"`
	AccountType  string   `json:"account_type"`
	Institution  string   `json:"institution"`
	Balance      float64  `json:"balance"`
	Currency     string   `json:"currency"`
	InterestRate *float64 `json:"interest_rate"`
}

func (h *CashAccountHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req CreateCashAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.AccountName == "" {
		Error(w, http.StatusBadRequest, "Account name is required")
		return
	}

	validAccountTypes := map[string]bool{
		models.CashAccountTypeCurrent:     true,
		models.CashAccountTypeSavings:     true,
		models.CashAccountTypeMoneyMarket: true,
	}
	if !validAccountTypes[req.AccountType] {
		Error(w, http.StatusBadRequest, "Invalid account type")
		return
	}

	if req.Currency == "" {
		req.Currency = "GBP"
	}
	if !validator.IsValidCurrency(req.Currency) {
		Error(w, http.StatusBadRequest, "Invalid currency")
		return
	}

	account := &models.CashAccount{
		PortfolioID:  portfolioID,
		AccountName:  req.AccountName,
		AccountType:  req.AccountType,
		Institution:  req.Institution,
		Balance:      req.Balance,
		Currency:     req.Currency,
		InterestRate: req.InterestRate,
	}

	if err := h.cashRepo.Create(r.Context(), account); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create cash account")
		return
	}

	JSON(w, http.StatusCreated, account)
}

func (h *CashAccountHandler) List(w http.ResponseWriter, r *http.Request) {
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

	accounts, err := h.cashRepo.GetByPortfolioID(r.Context(), portfolioID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch cash accounts")
		return
	}

	if accounts == nil {
		accounts = []*models.CashAccount{}
	}

	JSON(w, http.StatusOK, accounts)
}

func (h *CashAccountHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	accountID, err := uuid.Parse(chi.URLParam(r, "accountId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid account ID")
		return
	}

	belongs, err := h.cashRepo.BelongsToUser(r.Context(), accountID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req CreateCashAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	account, err := h.cashRepo.GetByID(r.Context(), accountID)
	if err != nil {
		if errors.Is(err, repository.ErrCashAccountNotFound) {
			Error(w, http.StatusNotFound, "Cash account not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch account")
		return
	}

	if req.AccountName != "" {
		account.AccountName = req.AccountName
	}
	if req.AccountType != "" {
		account.AccountType = req.AccountType
	}
	if req.Institution != "" {
		account.Institution = req.Institution
	}
	account.Balance = req.Balance
	if req.Currency != "" {
		account.Currency = req.Currency
	}
	account.InterestRate = req.InterestRate

	if err := h.cashRepo.Update(r.Context(), account); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update account")
		return
	}

	JSON(w, http.StatusOK, account)
}

func (h *CashAccountHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	accounts, err := h.cashRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch cash accounts")
		return
	}

	if accounts == nil {
		accounts = []*models.CashAccount{}
	}

	JSON(w, http.StatusOK, accounts)
}

func (h *CashAccountHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	accountID, err := uuid.Parse(chi.URLParam(r, "accountId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid account ID")
		return
	}

	belongs, err := h.cashRepo.BelongsToUser(r.Context(), accountID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.cashRepo.Delete(r.Context(), accountID); err != nil {
		if errors.Is(err, repository.ErrCashAccountNotFound) {
			Error(w, http.StatusNotFound, "Cash account not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to delete account")
		return
	}

	NoContent(w)
}
