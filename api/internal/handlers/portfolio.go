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

type PortfolioHandler struct {
	portfolioRepo   *repository.PortfolioRepository
	holdingRepo     *repository.HoldingRepository
	transactionRepo *repository.TransactionRepository
}

func NewPortfolioHandler(portfolioRepo *repository.PortfolioRepository, holdingRepo *repository.HoldingRepository, transactionRepo *repository.TransactionRepository) *PortfolioHandler {
	return &PortfolioHandler{
		portfolioRepo:   portfolioRepo,
		holdingRepo:     holdingRepo,
		transactionRepo: transactionRepo,
	}
}

type CreatePortfolioRequest struct {
	Name        string                   `json:"name"`
	Type        string                   `json:"type"`
	Currency    string                   `json:"currency"`
	Description string                   `json:"description"`
	Metadata    *models.PortfolioMetadata `json:"metadata,omitempty"`
}

type PortfolioWithMeta struct {
	*models.Portfolio
	HasTransactions bool `json:"has_transactions"`
}

func (h *PortfolioHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	portfolios, err := h.portfolioRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolios")
		return
	}

	if portfolios == nil {
		portfolios = []*models.Portfolio{}
	}

	// Check which portfolios have data (holdings or transactions)
	portfolioIDs := make([]uuid.UUID, len(portfolios))
	for i, p := range portfolios {
		portfolioIDs[i] = p.ID
	}

	hasData, err := h.transactionRepo.GetPortfoliosWithData(r.Context(), portfolioIDs)
	if err != nil {
		// Log error but continue without data check
		hasData = make(map[uuid.UUID]bool)
	}

	// Build response with data metadata
	result := make([]PortfolioWithMeta, len(portfolios))
	for i, p := range portfolios {
		result[i] = PortfolioWithMeta{
			Portfolio:       p,
			HasTransactions: hasData[p.ID],
		}
	}

	JSON(w, http.StatusOK, result)
}

func (h *PortfolioHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreatePortfolioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}

	if !validator.IsValidPortfolioType(req.Type) {
		Error(w, http.StatusBadRequest, "Invalid portfolio type")
		return
	}

	if req.Currency == "" {
		req.Currency = "GBP"
	}
	if !validator.IsValidCurrency(req.Currency) {
		Error(w, http.StatusBadRequest, "Invalid currency")
		return
	}

	portfolio := &models.Portfolio{
		UserID:      userID,
		Name:        req.Name,
		Type:        req.Type,
		Currency:    req.Currency,
		Description: req.Description,
		Metadata:    req.Metadata,
	}

	// Set default contribution limits based on portfolio type
	if portfolio.Metadata == nil {
		portfolio.Metadata = &models.PortfolioMetadata{}
	}
	switch req.Type {
	case models.PortfolioTypeISA:
		portfolio.Metadata.ContributionLimit = 20000 // 2024/25 limit
	case models.PortfolioTypeLISA:
		portfolio.Metadata.ContributionLimit = 4000 // LISA limit
	case models.PortfolioTypeJISA:
		portfolio.Metadata.ContributionLimit = 9000 // 2024/25 limit
	}

	if err := h.portfolioRepo.Create(r.Context(), portfolio); err != nil {
		if errors.Is(err, repository.ErrPortfolioAlreadyExists) {
			Error(w, http.StatusConflict, "Portfolio name already exists")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to create portfolio")
		return
	}

	JSON(w, http.StatusCreated, portfolio)
}

func (h *PortfolioHandler) Get(w http.ResponseWriter, r *http.Request) {
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

	portfolio, err := h.portfolioRepo.GetByID(r.Context(), portfolioID)
	if err != nil {
		if errors.Is(err, repository.ErrPortfolioNotFound) {
			Error(w, http.StatusNotFound, "Portfolio not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolio")
		return
	}

	if portfolio.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, portfolio)
}

func (h *PortfolioHandler) Update(w http.ResponseWriter, r *http.Request) {
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

	portfolio, err := h.portfolioRepo.GetByID(r.Context(), portfolioID)
	if err != nil {
		if errors.Is(err, repository.ErrPortfolioNotFound) {
			Error(w, http.StatusNotFound, "Portfolio not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolio")
		return
	}

	if portfolio.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req CreatePortfolioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name != "" {
		portfolio.Name = req.Name
	}
	if req.Type != "" {
		if !validator.IsValidPortfolioType(req.Type) {
			Error(w, http.StatusBadRequest, "Invalid portfolio type")
			return
		}
		portfolio.Type = req.Type
	}
	if req.Currency != "" {
		if !validator.IsValidCurrency(req.Currency) {
			Error(w, http.StatusBadRequest, "Invalid currency")
			return
		}
		portfolio.Currency = req.Currency
	}
	if req.Description != "" {
		portfolio.Description = req.Description
	}
	if req.Metadata != nil {
		portfolio.Metadata = req.Metadata
	}

	if err := h.portfolioRepo.Update(r.Context(), portfolio); err != nil {
		if errors.Is(err, repository.ErrPortfolioAlreadyExists) {
			Error(w, http.StatusConflict, "Portfolio name already exists")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to update portfolio")
		return
	}

	JSON(w, http.StatusOK, portfolio)
}

func (h *PortfolioHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	if err := h.portfolioRepo.Delete(r.Context(), portfolioID); err != nil {
		if errors.Is(err, repository.ErrPortfolioNotFound) {
			Error(w, http.StatusNotFound, "Portfolio not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to delete portfolio")
		return
	}

	NoContent(w)
}

func (h *PortfolioHandler) Summary(w http.ResponseWriter, r *http.Request) {
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

	summary, err := h.portfolioRepo.GetSummary(r.Context(), portfolioID)
	if err != nil {
		if errors.Is(err, repository.ErrPortfolioNotFound) {
			Error(w, http.StatusNotFound, "Portfolio not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to get summary")
		return
	}

	JSON(w, http.StatusOK, summary)
}

func (h *PortfolioHandler) Holdings(w http.ResponseWriter, r *http.Request) {
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
		Error(w, http.StatusInternalServerError, "Failed to get holdings")
		return
	}

	if holdings == nil {
		holdings = []*models.Holding{}
	}

	JSON(w, http.StatusOK, holdings)
}
