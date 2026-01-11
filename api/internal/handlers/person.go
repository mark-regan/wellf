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
)

type PersonHandler struct {
	personRepo    *repository.PersonRepository
	householdRepo *repository.HouseholdRepository
}

func NewPersonHandler(personRepo *repository.PersonRepository, householdRepo *repository.HouseholdRepository) *PersonHandler {
	return &PersonHandler{
		personRepo:    personRepo,
		householdRepo: householdRepo,
	}
}

type CreatePersonRequest struct {
	HouseholdID            uuid.UUID              `json:"household_id"`
	FirstName              string                 `json:"first_name"`
	LastName               string                 `json:"last_name"`
	Nickname               string                 `json:"nickname"`
	DateOfBirth            string                 `json:"date_of_birth"` // YYYY-MM-DD format
	Gender                 string                 `json:"gender"`
	Email                  string                 `json:"email"`
	Phone                  string                 `json:"phone"`
	BloodType              string                 `json:"blood_type"`
	MedicalNotes           string                 `json:"medical_notes"`
	EmergencyContactName   string                 `json:"emergency_contact_name"`
	EmergencyContactPhone  string                 `json:"emergency_contact_phone"`
	AvatarURL              string                 `json:"avatar_url"`
	IsPrimaryAccountHolder bool                   `json:"is_primary_account_holder"`
	Metadata               *models.PersonMetadata `json:"metadata"`
}

type AddRelationshipRequest struct {
	RelatedPersonID  uuid.UUID `json:"related_person_id"`
	RelationshipType string    `json:"relationship_type"`
}

// List returns all people in the user's default household
func (h *PersonHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get household_id from query param or use default
	var householdID uuid.UUID
	householdIDStr := r.URL.Query().Get("household_id")
	if householdIDStr != "" {
		var err error
		householdID, err = uuid.Parse(householdIDStr)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid household ID")
			return
		}
	} else {
		// Get default household
		household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
		if err != nil {
			if errors.Is(err, repository.ErrHouseholdNotFound) {
				JSON(w, http.StatusOK, []models.Person{})
				return
			}
			Error(w, http.StatusInternalServerError, "Failed to get household")
			return
		}
		householdID = household.ID
	}

	// Check access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), householdID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	people, err := h.personRepo.GetByHouseholdID(r.Context(), householdID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch people")
		return
	}

	if people == nil {
		people = []*models.Person{}
	}

	JSON(w, http.StatusOK, people)
}

// Create creates a new person
func (h *PersonHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreatePersonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.FirstName == "" {
		Error(w, http.StatusBadRequest, "First name is required")
		return
	}

	// If no household_id provided, use default
	householdID := req.HouseholdID
	if householdID == uuid.Nil {
		household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
		if err != nil {
			Error(w, http.StatusBadRequest, "Household ID is required")
			return
		}
		householdID = household.ID
	}

	// Check access - only owner or admin can add people
	role, err := h.householdRepo.GetUserRole(r.Context(), householdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role != models.HouseholdRoleOwner && role != models.HouseholdRoleAdmin && role != models.HouseholdRoleMember {
		Error(w, http.StatusForbidden, "Insufficient permissions")
		return
	}

	person := &models.Person{
		HouseholdID:            householdID,
		FirstName:              req.FirstName,
		LastName:               req.LastName,
		Nickname:               req.Nickname,
		Gender:                 req.Gender,
		Email:                  req.Email,
		Phone:                  req.Phone,
		BloodType:              req.BloodType,
		MedicalNotes:           req.MedicalNotes,
		EmergencyContactName:   req.EmergencyContactName,
		EmergencyContactPhone:  req.EmergencyContactPhone,
		AvatarURL:              req.AvatarURL,
		IsPrimaryAccountHolder: req.IsPrimaryAccountHolder,
		Metadata:               req.Metadata,
	}

	// Parse date of birth
	if req.DateOfBirth != "" {
		dob, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid date of birth format (use YYYY-MM-DD)")
			return
		}
		person.DateOfBirth = &dob
	}

	if err := h.personRepo.Create(r.Context(), person); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create person")
		return
	}

	// Calculate computed fields
	person.Age = person.CalculateAge()
	person.FullName = person.GetFullName()

	JSON(w, http.StatusCreated, person)
}

// Get returns a person by ID
func (h *PersonHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	person, err := h.personRepo.GetByID(r.Context(), personID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch person")
		return
	}

	// Check access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), person.HouseholdID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	// Get relationships
	relationships, err := h.personRepo.GetRelationships(r.Context(), personID)
	if err == nil {
		person.Relationships = relationships
	}

	JSON(w, http.StatusOK, person)
}

// Update updates a person
func (h *PersonHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	person, err := h.personRepo.GetByID(r.Context(), personID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch person")
		return
	}

	// Check access
	role, err := h.householdRepo.GetUserRole(r.Context(), person.HouseholdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role == models.HouseholdRoleViewer {
		Error(w, http.StatusForbidden, "Insufficient permissions")
		return
	}

	var req CreatePersonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Update fields
	if req.FirstName != "" {
		person.FirstName = req.FirstName
	}
	person.LastName = req.LastName
	person.Nickname = req.Nickname
	person.Gender = req.Gender
	person.Email = req.Email
	person.Phone = req.Phone
	person.BloodType = req.BloodType
	person.MedicalNotes = req.MedicalNotes
	person.EmergencyContactName = req.EmergencyContactName
	person.EmergencyContactPhone = req.EmergencyContactPhone
	if req.AvatarURL != "" {
		person.AvatarURL = req.AvatarURL
	}
	person.IsPrimaryAccountHolder = req.IsPrimaryAccountHolder
	if req.Metadata != nil {
		person.Metadata = req.Metadata
	}

	// Parse date of birth
	if req.DateOfBirth != "" {
		dob, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid date of birth format (use YYYY-MM-DD)")
			return
		}
		person.DateOfBirth = &dob
	} else {
		person.DateOfBirth = nil
	}

	if err := h.personRepo.Update(r.Context(), person); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update person")
		return
	}

	// Calculate computed fields
	person.Age = person.CalculateAge()
	person.FullName = person.GetFullName()

	JSON(w, http.StatusOK, person)
}

// Delete deletes a person
func (h *PersonHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	person, err := h.personRepo.GetByID(r.Context(), personID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch person")
		return
	}

	// Check access - only owner or admin can delete
	role, err := h.householdRepo.GetUserRole(r.Context(), person.HouseholdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role != models.HouseholdRoleOwner && role != models.HouseholdRoleAdmin {
		Error(w, http.StatusForbidden, "Only owner or admin can delete people")
		return
	}

	// Prevent deleting primary account holder
	if person.IsPrimaryAccountHolder {
		Error(w, http.StatusForbidden, "Cannot delete primary account holder")
		return
	}

	if err := h.personRepo.Delete(r.Context(), personID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete person")
		return
	}

	NoContent(w)
}

// AddRelationship adds a relationship between two people
func (h *PersonHandler) AddRelationship(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	person, err := h.personRepo.GetByID(r.Context(), personID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch person")
		return
	}

	// Check access
	role, err := h.householdRepo.GetUserRole(r.Context(), person.HouseholdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role == models.HouseholdRoleViewer {
		Error(w, http.StatusForbidden, "Insufficient permissions")
		return
	}

	var req AddRelationshipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.RelatedPersonID == uuid.Nil {
		Error(w, http.StatusBadRequest, "Related person ID is required")
		return
	}

	// Validate relationship type
	validTypes := map[string]bool{}
	for _, t := range models.ValidRelationshipTypes() {
		validTypes[t] = true
	}
	if !validTypes[req.RelationshipType] {
		Error(w, http.StatusBadRequest, "Invalid relationship type")
		return
	}

	// Verify related person is in same household
	relatedPerson, err := h.personRepo.GetByID(r.Context(), req.RelatedPersonID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Related person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch related person")
		return
	}
	if relatedPerson.HouseholdID != person.HouseholdID {
		Error(w, http.StatusBadRequest, "Related person must be in the same household")
		return
	}

	relationship := &models.FamilyRelationship{
		HouseholdID:      person.HouseholdID,
		PersonID:         personID,
		RelatedPersonID:  req.RelatedPersonID,
		RelationshipType: req.RelationshipType,
	}

	if err := h.personRepo.AddRelationship(r.Context(), relationship); err != nil {
		if errors.Is(err, repository.ErrRelationshipExists) {
			Error(w, http.StatusConflict, "Relationship already exists")
			return
		}
		if errors.Is(err, repository.ErrSelfRelationship) {
			Error(w, http.StatusBadRequest, "Cannot create relationship with self")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to add relationship")
		return
	}

	JSON(w, http.StatusCreated, relationship)
}

// RemoveRelationship removes a relationship
func (h *PersonHandler) RemoveRelationship(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	relationshipID, err := uuid.Parse(chi.URLParam(r, "relId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid relationship ID")
		return
	}

	person, err := h.personRepo.GetByID(r.Context(), personID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch person")
		return
	}

	// Check access
	role, err := h.householdRepo.GetUserRole(r.Context(), person.HouseholdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role == models.HouseholdRoleViewer {
		Error(w, http.StatusForbidden, "Insufficient permissions")
		return
	}

	if err := h.personRepo.RemoveRelationship(r.Context(), relationshipID); err != nil {
		if errors.Is(err, repository.ErrRelationshipNotFound) {
			Error(w, http.StatusNotFound, "Relationship not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to remove relationship")
		return
	}

	NoContent(w)
}

// GetRelationships returns all relationships for a person
func (h *PersonHandler) GetRelationships(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	person, err := h.personRepo.GetByID(r.Context(), personID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch person")
		return
	}

	// Check access
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), person.HouseholdID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	relationships, err := h.personRepo.GetRelationships(r.Context(), personID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch relationships")
		return
	}

	if relationships == nil {
		relationships = []models.FamilyRelationship{}
	}

	JSON(w, http.StatusOK, relationships)
}
