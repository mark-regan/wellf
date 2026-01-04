package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type AssetHandler struct {
	assetRepo    *repository.AssetRepository
	yahooService *services.YahooService
}

func NewAssetHandler(assetRepo *repository.AssetRepository, yahooService *services.YahooService) *AssetHandler {
	return &AssetHandler{
		assetRepo:    assetRepo,
		yahooService: yahooService,
	}
}

func (h *AssetHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		Error(w, http.StatusBadRequest, "Search query is required")
		return
	}

	if len(query) < 2 {
		Error(w, http.StatusBadRequest, "Search query must be at least 2 characters")
		return
	}

	results, err := h.yahooService.Search(r.Context(), query)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Search failed")
		return
	}

	JSON(w, http.StatusOK, results)
}

func (h *AssetHandler) GetDetails(w http.ResponseWriter, r *http.Request) {
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		Error(w, http.StatusBadRequest, "Symbol is required")
		return
	}

	details, err := h.yahooService.GetAssetDetails(r.Context(), symbol)
	if err != nil {
		Error(w, http.StatusNotFound, "Asset not found")
		return
	}

	JSON(w, http.StatusOK, details)
}

func (h *AssetHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		Error(w, http.StatusBadRequest, "Symbol is required")
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "1y"
	}

	// Validate period
	validPeriods := map[string]bool{
		"1d": true, "5d": true, "1mo": true, "3mo": true,
		"6mo": true, "1y": true, "5y": true, "max": true,
	}
	if !validPeriods[period] {
		Error(w, http.StatusBadRequest, "Invalid period")
		return
	}

	history, err := h.yahooService.GetHistory(r.Context(), symbol, period)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch history")
		return
	}

	JSON(w, http.StatusOK, history)
}

func (h *AssetHandler) RefreshPrices(w http.ResponseWriter, r *http.Request) {
	assets, err := h.assetRepo.GetAll(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch assets")
		return
	}

	if len(assets) == 0 {
		JSON(w, http.StatusOK, map[string]string{"message": "No assets to refresh"})
		return
	}

	symbols := make([]string, len(assets))
	for i, a := range assets {
		symbols[i] = a.Symbol
	}

	if err := h.yahooService.RefreshPrices(r.Context(), symbols); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to refresh prices")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Prices refreshed",
		"count":   len(symbols),
	})
}
