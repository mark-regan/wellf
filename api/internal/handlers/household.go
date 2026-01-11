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

type HouseholdHandler struct {
	householdRepo *repository.HouseholdRepository
	personRepo    *repository.PersonRepository
}

func NewHouseholdHandler(householdRepo *repository.HouseholdRepository, personRepo *repository.PersonRepository) *HouseholdHandler {
	return &HouseholdHandler{
		householdRepo: householdRepo,
		personRepo:    personRepo,
	}
}

type CreateHouseholdRequest struct {
	Name string `json:"name"`
}

type InviteMemberRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

type UpdateMemberRoleRequest struct {
	Role string `json:"role"`
}

// List returns all households the user is a member of
func (h *HouseholdHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	households, err := h.householdRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch households")
		return
	}

	if households == nil {
		households = []*models.Household{}
	}

	JSON(w, http.StatusOK, households)
}

// Create creates a new household
func (h *HouseholdHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateHouseholdRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}

	household := &models.Household{
		Name:        req.Name,
		OwnerUserID: userID,
	}

	if err := h.householdRepo.Create(r.Context(), household); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create household")
		return
	}

	JSON(w, http.StatusCreated, household)
}

// Get returns a household by ID
func (h *HouseholdHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid household ID")
		return
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

	household, err := h.householdRepo.GetByID(r.Context(), householdID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			Error(w, http.StatusNotFound, "Household not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	// Get members
	members, err := h.householdRepo.GetMembers(r.Context(), householdID)
	if err == nil {
		household.Members = members
	}

	JSON(w, http.StatusOK, household)
}

// Update updates a household
func (h *HouseholdHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid household ID")
		return
	}

	// Only owner or admin can update
	role, err := h.householdRepo.GetUserRole(r.Context(), householdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role != models.HouseholdRoleOwner && role != models.HouseholdRoleAdmin {
		Error(w, http.StatusForbidden, "Only owner or admin can update household")
		return
	}

	household, err := h.householdRepo.GetByID(r.Context(), householdID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			Error(w, http.StatusNotFound, "Household not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	var req CreateHouseholdRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name != "" {
		household.Name = req.Name
	}

	if err := h.householdRepo.Update(r.Context(), household); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update household")
		return
	}

	JSON(w, http.StatusOK, household)
}

// Delete deletes a household
func (h *HouseholdHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid household ID")
		return
	}

	// Only owner can delete
	isOwner, err := h.householdRepo.IsOwner(r.Context(), householdID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !isOwner {
		Error(w, http.StatusForbidden, "Only owner can delete household")
		return
	}

	if err := h.householdRepo.Delete(r.Context(), householdID); err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			Error(w, http.StatusNotFound, "Household not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to delete household")
		return
	}

	NoContent(w)
}

// GetMembers returns all members of a household
func (h *HouseholdHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid household ID")
		return
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

	members, err := h.householdRepo.GetMembers(r.Context(), householdID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch members")
		return
	}

	if members == nil {
		members = []models.HouseholdMember{}
	}

	JSON(w, http.StatusOK, members)
}

// InviteMember invites a new member to the household
func (h *HouseholdHandler) InviteMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid household ID")
		return
	}

	// Only owner or admin can invite
	role, err := h.householdRepo.GetUserRole(r.Context(), householdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role != models.HouseholdRoleOwner && role != models.HouseholdRoleAdmin {
		Error(w, http.StatusForbidden, "Only owner or admin can invite members")
		return
	}

	var req InviteMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" {
		Error(w, http.StatusBadRequest, "Email is required")
		return
	}

	// Validate role
	if req.Role == "" {
		req.Role = models.HouseholdRoleMember
	}
	validRoles := map[string]bool{
		models.HouseholdRoleAdmin:  true,
		models.HouseholdRoleMember: true,
		models.HouseholdRoleViewer: true,
	}
	if !validRoles[req.Role] {
		Error(w, http.StatusBadRequest, "Invalid role")
		return
	}

	member := &models.HouseholdMember{
		HouseholdID:  householdID,
		Role:         req.Role,
		InvitedEmail: req.Email,
		InviteStatus: models.InviteStatusPending,
	}

	if err := h.householdRepo.AddMember(r.Context(), member); err != nil {
		if errors.Is(err, repository.ErrMemberAlreadyExists) {
			Error(w, http.StatusConflict, "User is already a member")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to add member")
		return
	}

	// TODO: Send invitation email

	JSON(w, http.StatusCreated, member)
}

// RemoveMember removes a member from the household
func (h *HouseholdHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid household ID")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "memberId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid member ID")
		return
	}

	// Only owner or admin can remove members
	role, err := h.householdRepo.GetUserRole(r.Context(), householdID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to verify access")
		return
	}
	if role != models.HouseholdRoleOwner && role != models.HouseholdRoleAdmin {
		Error(w, http.StatusForbidden, "Only owner or admin can remove members")
		return
	}

	if err := h.householdRepo.RemoveMember(r.Context(), householdID, memberID); err != nil {
		if errors.Is(err, repository.ErrMemberNotFound) {
			Error(w, http.StatusNotFound, "Member not found")
			return
		}
		if errors.Is(err, repository.ErrCannotRemoveOwner) {
			Error(w, http.StatusForbidden, "Cannot remove the owner")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to remove member")
		return
	}

	NoContent(w)
}

// GetDefault returns the user's default household
func (h *HouseholdHandler) GetDefault(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			Error(w, http.StatusNotFound, "No household found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	// Get members
	members, err := h.householdRepo.GetMembers(r.Context(), household.ID)
	if err == nil {
		household.Members = members
	}

	JSON(w, http.StatusOK, household)
}
