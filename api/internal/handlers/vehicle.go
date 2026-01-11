package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
)

type VehicleHandler struct {
	vehicleRepo   *repository.VehicleRepository
	householdRepo *repository.HouseholdRepository
}

func NewVehicleHandler(vehicleRepo *repository.VehicleRepository, householdRepo *repository.HouseholdRepository) *VehicleHandler {
	return &VehicleHandler{
		vehicleRepo:   vehicleRepo,
		householdRepo: householdRepo,
	}
}

// List returns all vehicles for the user's household
func (h *VehicleHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.Vehicle{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	vehicles, err := h.vehicleRepo.GetByHouseholdID(r.Context(), household.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicles")
		return
	}

	if vehicles == nil {
		vehicles = []*models.Vehicle{}
	}

	JSON(w, http.StatusOK, vehicles)
}

// Get returns a single vehicle by ID
func (h *VehicleHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	vehicle, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), vehicle.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, vehicle)
}

// Create creates a new vehicle
func (h *VehicleHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusBadRequest, "No household found")
		return
	}

	var vehicle models.Vehicle
	if err := json.NewDecoder(r.Body).Decode(&vehicle); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if vehicle.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}
	if vehicle.VehicleType == "" {
		Error(w, http.StatusBadRequest, "Vehicle type is required")
		return
	}

	vehicle.HouseholdID = household.ID

	if err := h.vehicleRepo.Create(r.Context(), &vehicle); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create vehicle")
		return
	}

	JSON(w, http.StatusCreated, vehicle)
}

// Update updates a vehicle
func (h *VehicleHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	existing, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), existing.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var updates models.Vehicle
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updates.ID = vehicleID
	updates.HouseholdID = existing.HouseholdID
	updates.CreatedAt = existing.CreatedAt

	if err := h.vehicleRepo.Update(r.Context(), &updates); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update vehicle")
		return
	}

	JSON(w, http.StatusOK, updates)
}

// Delete deletes a vehicle
func (h *VehicleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	vehicle, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), vehicle.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.vehicleRepo.Delete(r.Context(), vehicleID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete vehicle")
		return
	}

	NoContent(w)
}

// AddUser adds a user to a vehicle
func (h *VehicleHandler) AddUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	vehicle, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), vehicle.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		PersonID           uuid.UUID `json:"person_id"`
		IsPrimaryDriver    bool      `json:"is_primary_driver"`
		IsNamedOnInsurance bool      `json:"is_named_on_insurance"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	vehicleUser := &models.VehicleUser{
		VehicleID:          vehicleID,
		PersonID:           req.PersonID,
		IsPrimaryDriver:    req.IsPrimaryDriver,
		IsNamedOnInsurance: req.IsNamedOnInsurance,
	}

	if err := h.vehicleRepo.AddUser(r.Context(), vehicleUser); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to add user")
		return
	}

	JSON(w, http.StatusCreated, vehicleUser)
}

// RemoveUser removes a user from a vehicle
func (h *VehicleHandler) RemoveUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "personId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	vehicle, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), vehicle.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.vehicleRepo.RemoveUser(r.Context(), vehicleID, personID); err != nil {
		if errors.Is(err, repository.ErrVehicleUserNotFound) {
			Error(w, http.StatusNotFound, "User not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to remove user")
		return
	}

	NoContent(w)
}

// AddServiceRecord adds a service record to a vehicle
func (h *VehicleHandler) AddServiceRecord(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	vehicle, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), vehicle.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var record models.VehicleServiceRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	record.VehicleID = vehicleID

	if err := h.vehicleRepo.AddServiceRecord(r.Context(), &record); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to add service record")
		return
	}

	JSON(w, http.StatusCreated, record)
}

// GetServiceRecords returns service records for a vehicle
func (h *VehicleHandler) GetServiceRecords(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	vehicle, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), vehicle.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	records, err := h.vehicleRepo.GetServiceRecords(r.Context(), vehicleID, limit)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch service records")
		return
	}

	if records == nil {
		records = []models.VehicleServiceRecord{}
	}

	JSON(w, http.StatusOK, records)
}

// DeleteServiceRecord deletes a service record
func (h *VehicleHandler) DeleteServiceRecord(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vehicleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid vehicle ID")
		return
	}

	recordID, err := uuid.Parse(chi.URLParam(r, "recordId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid record ID")
		return
	}

	vehicle, err := h.vehicleRepo.GetByID(r.Context(), vehicleID)
	if err != nil {
		if errors.Is(err, repository.ErrVehicleNotFound) {
			Error(w, http.StatusNotFound, "Vehicle not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicle")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), vehicle.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.vehicleRepo.DeleteServiceRecord(r.Context(), recordID); err != nil {
		if errors.Is(err, repository.ErrServiceRecordNotFound) {
			Error(w, http.StatusNotFound, "Service record not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to delete service record")
		return
	}

	NoContent(w)
}

// GetUpcomingMOTs returns vehicles with MOT expiring soon
func (h *VehicleHandler) GetUpcomingMOTs(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.Vehicle{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	daysAhead := 30
	if d := r.URL.Query().Get("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			daysAhead = parsed
		}
	}

	vehicles, err := h.vehicleRepo.GetUpcomingMOTs(r.Context(), household.ID, daysAhead)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch vehicles")
		return
	}

	if vehicles == nil {
		vehicles = []*models.Vehicle{}
	}

	JSON(w, http.StatusOK, vehicles)
}
