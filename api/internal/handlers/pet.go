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
)

type PetHandler struct {
	petRepo       *repository.PetRepository
	householdRepo *repository.HouseholdRepository
}

func NewPetHandler(petRepo *repository.PetRepository, householdRepo *repository.HouseholdRepository) *PetHandler {
	return &PetHandler{
		petRepo:       petRepo,
		householdRepo: householdRepo,
	}
}

// List returns all pets for the user's household
func (h *PetHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.Pet{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	pets, err := h.petRepo.GetByHouseholdID(r.Context(), household.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch pets")
		return
	}

	if pets == nil {
		pets = []*models.Pet{}
	}

	JSON(w, http.StatusOK, pets)
}

// Get returns a single pet by ID
func (h *PetHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	petID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	pet, err := h.petRepo.GetByID(r.Context(), petID)
	if err != nil {
		if errors.Is(err, repository.ErrPetNotFound) {
			Error(w, http.StatusNotFound, "Pet not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch pet")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), pet.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, pet)
}

// Create creates a new pet
func (h *PetHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var pet models.Pet
	if err := json.NewDecoder(r.Body).Decode(&pet); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if pet.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}
	if pet.PetType == "" {
		Error(w, http.StatusBadRequest, "Pet type is required")
		return
	}

	pet.HouseholdID = household.ID

	if err := h.petRepo.Create(r.Context(), &pet); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create pet")
		return
	}

	pet.CalculateAge()
	JSON(w, http.StatusCreated, pet)
}

// Update updates a pet
func (h *PetHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	petID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	existing, err := h.petRepo.GetByID(r.Context(), petID)
	if err != nil {
		if errors.Is(err, repository.ErrPetNotFound) {
			Error(w, http.StatusNotFound, "Pet not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch pet")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), existing.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var updates models.Pet
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updates.ID = petID
	updates.HouseholdID = existing.HouseholdID
	updates.CreatedAt = existing.CreatedAt

	if err := h.petRepo.Update(r.Context(), &updates); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update pet")
		return
	}

	updates.CalculateAge()
	JSON(w, http.StatusOK, updates)
}

// Delete deletes a pet
func (h *PetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	petID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	pet, err := h.petRepo.GetByID(r.Context(), petID)
	if err != nil {
		if errors.Is(err, repository.ErrPetNotFound) {
			Error(w, http.StatusNotFound, "Pet not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch pet")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), pet.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.petRepo.Delete(r.Context(), petID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete pet")
		return
	}

	NoContent(w)
}
