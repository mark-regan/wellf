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
	"github.com/shopspring/decimal"
)

type PropertyHandler struct {
	propertyRepo  *repository.PropertyRepository
	householdRepo *repository.HouseholdRepository
}

func NewPropertyHandler(propertyRepo *repository.PropertyRepository, householdRepo *repository.HouseholdRepository) *PropertyHandler {
	return &PropertyHandler{
		propertyRepo:  propertyRepo,
		householdRepo: householdRepo,
	}
}

// List returns all properties for the user's household
func (h *PropertyHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user's default household
	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.Property{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	properties, err := h.propertyRepo.GetByHouseholdID(r.Context(), household.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch properties")
		return
	}

	if properties == nil {
		properties = []*models.Property{}
	}

	JSON(w, http.StatusOK, properties)
}

// Get returns a single property by ID
func (h *PropertyHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	propertyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid property ID")
		return
	}

	property, err := h.propertyRepo.GetByID(r.Context(), propertyID)
	if err != nil {
		if errors.Is(err, repository.ErrPropertyNotFound) {
			Error(w, http.StatusNotFound, "Property not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch property")
		return
	}

	// Verify access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), property.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, property)
}

// Create creates a new property
func (h *PropertyHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var property models.Property
	if err := json.NewDecoder(r.Body).Decode(&property); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if property.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}
	if property.PropertyType == "" {
		Error(w, http.StatusBadRequest, "Property type is required")
		return
	}

	property.HouseholdID = household.ID

	if err := h.propertyRepo.Create(r.Context(), &property); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create property")
		return
	}

	JSON(w, http.StatusCreated, property)
}

// Update updates a property
func (h *PropertyHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	propertyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid property ID")
		return
	}

	existing, err := h.propertyRepo.GetByID(r.Context(), propertyID)
	if err != nil {
		if errors.Is(err, repository.ErrPropertyNotFound) {
			Error(w, http.StatusNotFound, "Property not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch property")
		return
	}

	// Verify access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), existing.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var updates models.Property
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Apply updates
	updates.ID = propertyID
	updates.HouseholdID = existing.HouseholdID
	updates.CreatedAt = existing.CreatedAt

	if err := h.propertyRepo.Update(r.Context(), &updates); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update property")
		return
	}

	JSON(w, http.StatusOK, updates)
}

// Delete deletes a property
func (h *PropertyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	propertyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid property ID")
		return
	}

	property, err := h.propertyRepo.GetByID(r.Context(), propertyID)
	if err != nil {
		if errors.Is(err, repository.ErrPropertyNotFound) {
			Error(w, http.StatusNotFound, "Property not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch property")
		return
	}

	// Verify access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), property.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.propertyRepo.Delete(r.Context(), propertyID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete property")
		return
	}

	NoContent(w)
}

// AddOwner adds an owner to a property
func (h *PropertyHandler) AddOwner(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	propertyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid property ID")
		return
	}

	property, err := h.propertyRepo.GetByID(r.Context(), propertyID)
	if err != nil {
		if errors.Is(err, repository.ErrPropertyNotFound) {
			Error(w, http.StatusNotFound, "Property not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch property")
		return
	}

	// Verify access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), property.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		PersonID            uuid.UUID       `json:"person_id"`
		OwnershipPercentage decimal.Decimal `json:"ownership_percentage"`
		OwnershipType       string          `json:"ownership_type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	owner := &models.PropertyOwner{
		PropertyID:          propertyID,
		PersonID:            req.PersonID,
		OwnershipPercentage: req.OwnershipPercentage,
		OwnershipType:       req.OwnershipType,
	}

	if err := h.propertyRepo.AddOwner(r.Context(), owner); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to add owner")
		return
	}

	JSON(w, http.StatusCreated, owner)
}

// RemoveOwner removes an owner from a property
func (h *PropertyHandler) RemoveOwner(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	propertyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid property ID")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "personId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	property, err := h.propertyRepo.GetByID(r.Context(), propertyID)
	if err != nil {
		if errors.Is(err, repository.ErrPropertyNotFound) {
			Error(w, http.StatusNotFound, "Property not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch property")
		return
	}

	// Verify access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), property.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.propertyRepo.RemoveOwner(r.Context(), propertyID, personID); err != nil {
		if errors.Is(err, repository.ErrOwnerNotFound) {
			Error(w, http.StatusNotFound, "Owner not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to remove owner")
		return
	}

	NoContent(w)
}
