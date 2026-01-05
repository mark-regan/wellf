package handlers

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
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

type csvRow struct {
	TransactionDate string
	Symbol          string
	TransactionType string
	Quantity        float64
	Price           float64
	Currency        string
	Notes           string
}

type ImportResponse struct {
	Success        bool     `json:"success"`
	Imported       int      `json:"imported,omitempty"`
	Message        string   `json:"message"`
	Error          string   `json:"error,omitempty"`
	InvalidSymbols []string `json:"invalid_symbols,omitempty"`
	RowErrors      []string `json:"row_errors,omitempty"`
}

func (h *TransactionHandler) Import(w http.ResponseWriter, r *http.Request) {
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

	// Get portfolio to check its default currency
	portfolio, err := h.portfolioRepo.GetByID(r.Context(), portfolioID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolio")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		Error(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	// Get the mode (replace or append)
	mode := r.FormValue("mode")
	if mode != "replace" && mode != "append" {
		mode = "append"
	}

	// Get the file
	file, _, err := r.FormFile("file")
	if err != nil {
		Error(w, http.StatusBadRequest, "No file uploaded")
		return
	}
	defer file.Close()

	// Parse CSV
	reader := csv.NewReader(file)

	// Read header
	header, err := reader.Read()
	if err != nil {
		JSON(w, http.StatusBadRequest, ImportResponse{
			Success: false,
			Error:   "Failed to read CSV header",
			Message: "The CSV file appears to be empty or malformed",
		})
		return
	}

	// Map header columns
	colIndex := make(map[string]int)
	for i, col := range header {
		colIndex[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Validate required columns
	requiredCols := []string{"transaction_date", "symbol", "transaction_type", "quantity", "price"}
	for _, col := range requiredCols {
		if _, exists := colIndex[col]; !exists {
			JSON(w, http.StatusBadRequest, ImportResponse{
				Success: false,
				Error:   "Missing required column: " + col,
				Message: "Required columns: transaction_date, symbol, transaction_type, quantity, price",
			})
			return
		}
	}

	// Parse all rows and collect errors
	var rows []csvRow
	var rowErrors []string
	lineNum := 1
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			JSON(w, http.StatusBadRequest, ImportResponse{
				Success: false,
				Error:   fmt.Sprintf("Error reading line %d: %v", lineNum+1, err),
				Message: "CSV parsing error",
			})
			return
		}
		lineNum++

		var lineErrors []string

		// Parse row
		row := csvRow{
			TransactionDate: strings.TrimSpace(record[colIndex["transaction_date"]]),
			Symbol:          strings.ToUpper(strings.TrimSpace(record[colIndex["symbol"]])),
			TransactionType: strings.ToUpper(strings.TrimSpace(record[colIndex["transaction_type"]])),
		}

		// Validate date format and not in future
		txDate, err := time.Parse("2006-01-02", row.TransactionDate)
		if err != nil {
			lineErrors = append(lineErrors, "invalid date format (use YYYY-MM-DD)")
		} else if txDate.After(time.Now()) {
			lineErrors = append(lineErrors, "transaction date cannot be in the future")
		}

		// Validate symbol is not empty
		if row.Symbol == "" {
			lineErrors = append(lineErrors, "symbol is required")
		}

		// Validate transaction type
		if row.TransactionType != "BUY" && row.TransactionType != "SELL" {
			lineErrors = append(lineErrors, fmt.Sprintf("invalid transaction type '%s' (use BUY or SELL)", row.TransactionType))
		}

		// Parse quantity
		quantityStr := strings.TrimSpace(record[colIndex["quantity"]])
		quantity, err := strconv.ParseFloat(quantityStr, 64)
		if err != nil || quantity <= 0 {
			lineErrors = append(lineErrors, "quantity must be a positive number")
		} else {
			row.Quantity = quantity
		}

		// Parse price
		priceStr := strings.TrimSpace(record[colIndex["price"]])
		price, err := strconv.ParseFloat(priceStr, 64)
		if err != nil || price <= 0 {
			lineErrors = append(lineErrors, "price must be a positive number")
		} else {
			row.Price = price
		}

		// If there are errors for this line, add them to rowErrors
		if len(lineErrors) > 0 {
			rowErrors = append(rowErrors, fmt.Sprintf("Line %d: %s", lineNum, strings.Join(lineErrors, "; ")))
			continue
		}

		// Optional currency
		if idx, exists := colIndex["currency"]; exists && idx < len(record) {
			currency := strings.ToUpper(strings.TrimSpace(record[idx]))
			if currency != "" {
				row.Currency = currency
			}
		}
		if row.Currency == "" {
			row.Currency = portfolio.Currency
		}

		// Optional notes
		if idx, exists := colIndex["notes"]; exists && idx < len(record) {
			row.Notes = strings.TrimSpace(record[idx])
		}

		rows = append(rows, row)
	}

	// If there were row errors, return them all
	if len(rowErrors) > 0 {
		JSON(w, http.StatusBadRequest, ImportResponse{
			Success:   false,
			Error:     "Validation errors found",
			Message:   fmt.Sprintf("Found %d row(s) with errors", len(rowErrors)),
			RowErrors: rowErrors,
		})
		return
	}

	if len(rows) == 0 {
		JSON(w, http.StatusBadRequest, ImportResponse{
			Success: false,
			Error:   "No transactions found",
			Message: "The CSV file contains no valid transactions",
		})
		return
	}

	// Collect unique symbols
	symbolSet := make(map[string]bool)
	for _, row := range rows {
		symbolSet[row.Symbol] = true
	}

	// Validate all symbols against Yahoo Finance
	var invalidSymbols []string
	symbolToAsset := make(map[string]*models.Asset)

	for symbol := range symbolSet {
		asset, err := h.yahooService.GetOrCreateAsset(r.Context(), symbol)
		if err != nil {
			invalidSymbols = append(invalidSymbols, symbol)
		} else {
			symbolToAsset[symbol] = asset
		}
	}

	if len(invalidSymbols) > 0 {
		sort.Strings(invalidSymbols)
		JSON(w, http.StatusBadRequest, ImportResponse{
			Success:        false,
			Error:          "Invalid symbols found",
			InvalidSymbols: invalidSymbols,
			Message:        fmt.Sprintf("The following symbols could not be found: %s", strings.Join(invalidSymbols, ", ")),
		})
		return
	}

	// Sort rows by date for sell validation
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].TransactionDate < rows[j].TransactionDate
	})

	// Validate sell quantities - ensure we have enough holdings to sell
	// Build initial holdings map based on mode
	holdingsBalance := make(map[string]float64)

	if mode == "append" {
		// Get existing holdings for this portfolio
		existingHoldings, err := h.holdingRepo.GetByPortfolioID(r.Context(), portfolioID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "Failed to fetch existing holdings")
			return
		}
		for _, h := range existingHoldings {
			if h.Asset != nil {
				holdingsBalance[h.Asset.Symbol] = h.Quantity
			}
		}
	}
	// For replace mode, holdingsBalance starts empty

	// Simulate the transactions chronologically to check for insufficient holdings
	var sellErrors []string
	for i, row := range rows {
		if row.TransactionType == "BUY" {
			holdingsBalance[row.Symbol] += row.Quantity
		} else if row.TransactionType == "SELL" {
			if holdingsBalance[row.Symbol] < row.Quantity {
				available := holdingsBalance[row.Symbol]
				sellErrors = append(sellErrors, fmt.Sprintf("Line %d: Cannot sell %.4f %s (only %.4f available at this point)", i+2, row.Quantity, row.Symbol, available))
			} else {
				holdingsBalance[row.Symbol] -= row.Quantity
			}
		}
	}

	if len(sellErrors) > 0 {
		JSON(w, http.StatusBadRequest, ImportResponse{
			Success:   false,
			Error:     "Insufficient holdings for sell orders",
			Message:   fmt.Sprintf("Found %d sell order(s) that exceed available holdings", len(sellErrors)),
			RowErrors: sellErrors,
		})
		return
	}

	// If replace mode, delete existing transactions and holdings
	if mode == "replace" {
		if err := h.txRepo.DeleteByPortfolioID(r.Context(), portfolioID); err != nil {
			Error(w, http.StatusInternalServerError, "Failed to clear existing transactions")
			return
		}
		if err := h.holdingRepo.DeleteByPortfolioID(r.Context(), portfolioID); err != nil {
			Error(w, http.StatusInternalServerError, "Failed to clear existing holdings")
			return
		}
	}

	// Rows already sorted by date from sell validation above

	// Process each row
	imported := 0
	for _, row := range rows {
		txDate, _ := time.Parse("2006-01-02", row.TransactionDate)
		asset := symbolToAsset[row.Symbol]

		tx := &models.Transaction{
			PortfolioID:     portfolioID,
			AssetID:         &asset.ID,
			TransactionType: row.TransactionType,
			Quantity:        &row.Quantity,
			Price:           &row.Price,
			TotalAmount:     row.Quantity * row.Price,
			Currency:        row.Currency,
			TransactionDate: txDate,
			Notes:           row.Notes,
		}

		if err := h.txRepo.Create(r.Context(), tx); err != nil {
			// Continue with other transactions, but log the error
			continue
		}

		// Update holdings
		if row.TransactionType == models.TransactionTypeBuy {
			h.holdingRepo.AddToHolding(r.Context(), portfolioID, asset.ID, row.Quantity, row.Price, &txDate)
		} else {
			h.holdingRepo.RemoveFromHolding(r.Context(), portfolioID, asset.ID, row.Quantity)
		}

		imported++
	}

	JSON(w, http.StatusOK, ImportResponse{
		Success:  true,
		Imported: imported,
		Message:  fmt.Sprintf("Successfully imported %d transactions", imported),
	})
}
