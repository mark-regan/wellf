package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/mark-regan/wellf/internal/database"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/pkg/validator"
)

type HealthHandler struct {
	db    *database.DB
	redis *database.RedisClient
}

func NewHealthHandler(db *database.DB, redis *database.RedisClient) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redis,
	}
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Services  map[string]string `json:"services,omitempty"`
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	services := make(map[string]string)
	allHealthy := true

	// Check database
	if err := h.db.Health(ctx); err != nil {
		services["database"] = "unhealthy"
		allHealthy = false
	} else {
		services["database"] = "healthy"
	}

	// Check Redis
	if err := h.redis.Health(ctx); err != nil {
		services["redis"] = "unhealthy"
		allHealthy = false
	} else {
		services["redis"] = "healthy"
	}

	status := http.StatusOK
	statusText := "ok"
	if !allHealthy {
		status = http.StatusServiceUnavailable
		statusText = "degraded"
	}

	JSON(w, status, HealthResponse{
		Status:    statusText,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  services,
	})
}

func (h *HealthHandler) Currencies(w http.ResponseWriter, r *http.Request) {
	currencies := []string{"GBP", "USD", "EUR", "JPY", "CHF", "AUD", "CAD", "NZD", "SEK", "NOK", "DKK", "HKD", "SGD", "CNY", "INR"}
	JSON(w, http.StatusOK, currencies)
}

func (h *HealthHandler) AssetTypes(w http.ResponseWriter, r *http.Request) {
	assetTypes := []string{"STOCK", "ETF", "FUND", "CRYPTO", "BOND"}
	JSON(w, http.StatusOK, assetTypes)
}

func (h *HealthHandler) PortfolioTypes(w http.ResponseWriter, r *http.Request) {
	portfolioTypes := []string{"GIA", "ISA", "SIPP", "LISA", "JISA", "CRYPTO", "SAVINGS", "CASH"}
	JSON(w, http.StatusOK, portfolioTypes)
}

func (h *HealthHandler) TransactionTypes(w http.ResponseWriter, r *http.Request) {
	txTypes := []string{"BUY", "SELL", "DIVIDEND", "INTEREST", "FEE", "TRANSFER_IN", "TRANSFER_OUT", "DEPOSIT", "WITHDRAWAL"}
	JSON(w, http.StatusOK, txTypes)
}

func (h *HealthHandler) ValidateCurrency(w http.ResponseWriter, r *http.Request) {
	currency := r.URL.Query().Get("currency")
	if currency == "" {
		Error(w, http.StatusBadRequest, "Currency is required")
		return
	}

	JSON(w, http.StatusOK, map[string]bool{
		"valid": validator.IsValidCurrency(currency),
	})
}

func (h *HealthHandler) RelationshipTypes(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, models.ValidRelationshipTypes())
}

func (h *HealthHandler) Genders(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, models.ValidGenders())
}

func (h *HealthHandler) HouseholdRoles(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, models.ValidHouseholdRoles())
}

func (h *HealthHandler) PropertyTypes(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, models.ValidPropertyTypes())
}

func (h *HealthHandler) VehicleTypes(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, models.ValidVehicleTypes())
}

func (h *HealthHandler) FuelTypes(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, models.ValidFuelTypes())
}

func (h *HealthHandler) ServiceTypes(w http.ResponseWriter, r *http.Request) {
	JSON(w, http.StatusOK, models.ValidServiceTypes())
}
