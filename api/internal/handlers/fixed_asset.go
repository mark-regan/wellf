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
	"github.com/mark-regan/wellf/pkg/validator"
)

type FixedAssetHandler struct {
	fixedAssetRepo *repository.FixedAssetRepository
}

func NewFixedAssetHandler(fixedAssetRepo *repository.FixedAssetRepository) *FixedAssetHandler {
	return &FixedAssetHandler{fixedAssetRepo: fixedAssetRepo}
}

type CreateFixedAssetRequest struct {
	Name           string   `json:"name"`
	Category       string   `json:"category"`
	Description    string   `json:"description"`
	PurchaseDate   string   `json:"purchase_date"`
	PurchasePrice  *float64 `json:"purchase_price"`
	CurrentValue   float64  `json:"current_value"`
	Currency       string   `json:"currency"`
	ValuationDate  string   `json:"valuation_date"`
	ValuationNotes string   `json:"valuation_notes"`
}

func (h *FixedAssetHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateFixedAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}

	validCategories := map[string]bool{
		models.FixedAssetCategoryProperty:    true,
		models.FixedAssetCategoryVehicle:     true,
		models.FixedAssetCategoryCollectible: true,
		models.FixedAssetCategoryOther:       true,
	}
	if !validCategories[req.Category] {
		Error(w, http.StatusBadRequest, "Invalid category")
		return
	}

	if req.CurrentValue < 0 {
		Error(w, http.StatusBadRequest, "Current value cannot be negative")
		return
	}

	if req.Currency == "" {
		req.Currency = "GBP"
	}
	if !validator.IsValidCurrency(req.Currency) {
		Error(w, http.StatusBadRequest, "Invalid currency")
		return
	}

	asset := &models.FixedAsset{
		UserID:         userID,
		Name:           req.Name,
		Category:       req.Category,
		Description:    req.Description,
		PurchasePrice:  req.PurchasePrice,
		CurrentValue:   req.CurrentValue,
		Currency:       req.Currency,
		ValuationNotes: req.ValuationNotes,
	}

	if req.PurchaseDate != "" {
		purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid purchase date format (use YYYY-MM-DD)")
			return
		}
		asset.PurchaseDate = &purchaseDate
	}

	if req.ValuationDate != "" {
		valuationDate, err := time.Parse("2006-01-02", req.ValuationDate)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid valuation date format (use YYYY-MM-DD)")
			return
		}
		asset.ValuationDate = &valuationDate
	}

	if err := h.fixedAssetRepo.Create(r.Context(), asset); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create fixed asset")
		return
	}

	JSON(w, http.StatusCreated, asset)
}

func (h *FixedAssetHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	assets, err := h.fixedAssetRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch fixed assets")
		return
	}

	if assets == nil {
		assets = []*models.FixedAsset{}
	}

	JSON(w, http.StatusOK, assets)
}

func (h *FixedAssetHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid asset ID")
		return
	}

	asset, err := h.fixedAssetRepo.GetByID(r.Context(), assetID)
	if err != nil {
		if errors.Is(err, repository.ErrFixedAssetNotFound) {
			Error(w, http.StatusNotFound, "Fixed asset not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch fixed asset")
		return
	}

	if asset.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, asset)
}

func (h *FixedAssetHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid asset ID")
		return
	}

	belongs, err := h.fixedAssetRepo.BelongsToUser(r.Context(), assetID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req CreateFixedAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	asset, err := h.fixedAssetRepo.GetByID(r.Context(), assetID)
	if err != nil {
		if errors.Is(err, repository.ErrFixedAssetNotFound) {
			Error(w, http.StatusNotFound, "Fixed asset not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch asset")
		return
	}

	if req.Name != "" {
		asset.Name = req.Name
	}
	if req.Category != "" {
		asset.Category = req.Category
	}
	if req.Description != "" {
		asset.Description = req.Description
	}
	if req.PurchasePrice != nil {
		asset.PurchasePrice = req.PurchasePrice
	}
	if req.CurrentValue > 0 {
		asset.CurrentValue = req.CurrentValue
	}
	if req.Currency != "" {
		asset.Currency = req.Currency
	}
	if req.ValuationNotes != "" {
		asset.ValuationNotes = req.ValuationNotes
	}

	if req.PurchaseDate != "" {
		purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
		if err == nil {
			asset.PurchaseDate = &purchaseDate
		}
	}

	if req.ValuationDate != "" {
		valuationDate, err := time.Parse("2006-01-02", req.ValuationDate)
		if err == nil {
			asset.ValuationDate = &valuationDate
		}
	}

	if err := h.fixedAssetRepo.Update(r.Context(), asset); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update fixed asset")
		return
	}

	JSON(w, http.StatusOK, asset)
}

func (h *FixedAssetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid asset ID")
		return
	}

	belongs, err := h.fixedAssetRepo.BelongsToUser(r.Context(), assetID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.fixedAssetRepo.Delete(r.Context(), assetID); err != nil {
		if errors.Is(err, repository.ErrFixedAssetNotFound) {
			Error(w, http.StatusNotFound, "Fixed asset not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to delete fixed asset")
		return
	}

	NoContent(w)
}
