package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type HoldingHandler struct {
	holdingRepo   *repository.HoldingRepository
	portfolioRepo *repository.PortfolioRepository
	yahooService  *services.YahooService
}

func NewHoldingHandler(
	holdingRepo *repository.HoldingRepository,
	portfolioRepo *repository.PortfolioRepository,
	yahooService *services.YahooService,
) *HoldingHandler {
	return &HoldingHandler{
		holdingRepo:   holdingRepo,
		portfolioRepo: portfolioRepo,
		yahooService:  yahooService,
	}
}

type CreateHoldingRequest struct {
	Symbol      string     `json:"symbol"`
	Quantity    float64    `json:"quantity"`
	AverageCost *float64   `json:"average_cost,omitempty"`
	PurchasedAt *time.Time `json:"purchased_at,omitempty"`
}

func (h *HoldingHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req CreateHoldingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Symbol == "" {
		Error(w, http.StatusBadRequest, "Symbol is required")
		return
	}
	if req.Quantity <= 0 {
		Error(w, http.StatusBadRequest, "Quantity must be positive")
		return
	}
	if req.AverageCost != nil && *req.AverageCost < 0 {
		Error(w, http.StatusBadRequest, "Average cost cannot be negative")
		return
	}

	// Get or create asset from Yahoo Finance
	asset, err := h.yahooService.GetOrCreateAsset(r.Context(), req.Symbol)
	if err != nil {
		Error(w, http.StatusBadRequest, "Failed to find asset: "+err.Error())
		return
	}

	// Determine the cost to use
	var cost float64
	if req.AverageCost != nil {
		// User provided an override
		cost = *req.AverageCost
	} else if req.PurchasedAt != nil {
		// Fetch historical price for the purchased date
		historicalPrice, err := h.yahooService.GetHistoricalPrice(r.Context(), req.Symbol, *req.PurchasedAt)
		if err != nil {
			Error(w, http.StatusBadRequest, "Failed to fetch historical price: "+err.Error())
			return
		}
		cost = historicalPrice
	} else {
		// Use current price
		if asset.LastPrice != nil {
			cost = *asset.LastPrice
		} else {
			Error(w, http.StatusBadRequest, "Unable to determine price - please provide average_cost")
			return
		}
	}

	// Try to add to existing holding or create new one
	err = h.holdingRepo.AddToHolding(r.Context(), portfolioID, asset.ID, req.Quantity, cost, req.PurchasedAt)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create holding")
		return
	}

	// Fetch the updated holding
	holding, err := h.holdingRepo.GetByPortfolioAndAsset(r.Context(), portfolioID, asset.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch holding")
		return
	}

	holding.Asset = asset

	JSON(w, http.StatusCreated, holding)
}

func (h *HoldingHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	holdingID, err := uuid.Parse(chi.URLParam(r, "holdingId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid holding ID")
		return
	}

	belongs, err := h.holdingRepo.BelongsToUser(r.Context(), holdingID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		Quantity    *float64 `json:"quantity"`
		AverageCost *float64 `json:"average_cost"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	holding, err := h.holdingRepo.GetByID(r.Context(), holdingID)
	if err != nil {
		if errors.Is(err, repository.ErrHoldingNotFound) {
			Error(w, http.StatusNotFound, "Holding not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch holding")
		return
	}

	if req.Quantity != nil {
		if *req.Quantity < 0 {
			Error(w, http.StatusBadRequest, "Quantity cannot be negative")
			return
		}
		holding.Quantity = *req.Quantity
	}
	if req.AverageCost != nil {
		if *req.AverageCost < 0 {
			Error(w, http.StatusBadRequest, "Average cost cannot be negative")
			return
		}
		holding.AverageCost = *req.AverageCost
	}

	if err := h.holdingRepo.Update(r.Context(), holding); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update holding")
		return
	}

	JSON(w, http.StatusOK, holding)
}

func (h *HoldingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	holdingID, err := uuid.Parse(chi.URLParam(r, "holdingId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid holding ID")
		return
	}

	belongs, err := h.holdingRepo.BelongsToUser(r.Context(), holdingID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.holdingRepo.Delete(r.Context(), holdingID); err != nil {
		if errors.Is(err, repository.ErrHoldingNotFound) {
			Error(w, http.StatusNotFound, "Holding not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to delete holding")
		return
	}

	NoContent(w)
}

func (h *HoldingHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	holdingID, err := uuid.Parse(chi.URLParam(r, "holdingId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid holding ID")
		return
	}

	belongs, err := h.holdingRepo.BelongsToUser(r.Context(), holdingID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	holding, err := h.holdingRepo.GetByID(r.Context(), holdingID)
	if err != nil {
		if errors.Is(err, repository.ErrHoldingNotFound) {
			Error(w, http.StatusNotFound, "Holding not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch holding")
		return
	}

	JSON(w, http.StatusOK, holding)
}

func (h *HoldingHandler) ListByPortfolio(w http.ResponseWriter, r *http.Request) {
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

	holdings, err := h.holdingRepo.GetByPortfolioID(r.Context(), portfolioID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch holdings")
		return
	}

	if holdings == nil {
		holdings = []*models.Holding{}
	}

	JSON(w, http.StatusOK, holdings)
}

// ListAll returns all holdings for the authenticated user across all portfolios
func (h *HoldingHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	holdings, err := h.holdingRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch holdings")
		return
	}

	if holdings == nil {
		holdings = []*models.HoldingWithPortfolio{}
	}

	JSON(w, http.StatusOK, holdings)
}

// GetHistoricalPrice returns the closing price for a symbol on a specific date
func (h *HoldingHandler) GetHistoricalPrice(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	symbol := r.URL.Query().Get("symbol")
	if symbol == "" {
		Error(w, http.StatusBadRequest, "Symbol is required")
		return
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		Error(w, http.StatusBadRequest, "Date is required")
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid date format (use YYYY-MM-DD)")
		return
	}

	price, err := h.yahooService.GetHistoricalPrice(r.Context(), symbol, date)
	if err != nil {
		Error(w, http.StatusBadRequest, "Failed to fetch historical price: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"symbol": symbol,
		"date":   dateStr,
		"price":  price,
	})
}
