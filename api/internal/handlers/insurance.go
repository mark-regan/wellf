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

type InsuranceHandler struct {
	insuranceRepo *repository.InsuranceRepository
	householdRepo *repository.HouseholdRepository
}

func NewInsuranceHandler(insuranceRepo *repository.InsuranceRepository, householdRepo *repository.HouseholdRepository) *InsuranceHandler {
	return &InsuranceHandler{
		insuranceRepo: insuranceRepo,
		householdRepo: householdRepo,
	}
}

// List returns all insurance policies for the user's household
func (h *InsuranceHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.InsurancePolicy{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	policies, err := h.insuranceRepo.GetByHouseholdID(r.Context(), household.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch policies")
		return
	}

	if policies == nil {
		policies = []*models.InsurancePolicy{}
	}

	JSON(w, http.StatusOK, policies)
}

// Get returns a single policy by ID
func (h *InsuranceHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, policy)
}

// Create creates a new insurance policy
func (h *InsuranceHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var policy models.InsurancePolicy
	if err := json.NewDecoder(r.Body).Decode(&policy); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if policy.PolicyName == "" {
		Error(w, http.StatusBadRequest, "Policy name is required")
		return
	}
	if policy.PolicyType == "" {
		Error(w, http.StatusBadRequest, "Policy type is required")
		return
	}

	policy.HouseholdID = household.ID

	if err := h.insuranceRepo.Create(r.Context(), &policy); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create policy")
		return
	}

	JSON(w, http.StatusCreated, policy)
}

// Update updates an insurance policy
func (h *InsuranceHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	existing, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), existing.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var updates models.InsurancePolicy
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updates.ID = policyID
	updates.HouseholdID = existing.HouseholdID
	updates.CreatedAt = existing.CreatedAt

	if err := h.insuranceRepo.Update(r.Context(), &updates); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update policy")
		return
	}

	JSON(w, http.StatusOK, updates)
}

// Delete deletes an insurance policy
func (h *InsuranceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.insuranceRepo.Delete(r.Context(), policyID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete policy")
		return
	}

	NoContent(w)
}

// GetUpcomingRenewals returns policies with upcoming renewals
func (h *InsuranceHandler) GetUpcomingRenewals(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.InsurancePolicy{})
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

	policies, err := h.insuranceRepo.GetUpcomingRenewals(r.Context(), household.ID, daysAhead)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch policies")
		return
	}

	if policies == nil {
		policies = []*models.InsurancePolicy{}
	}

	JSON(w, http.StatusOK, policies)
}

// GetCoveredPeople returns covered people for a policy
func (h *InsuranceHandler) GetCoveredPeople(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	people, err := h.insuranceRepo.GetCoveredPeople(r.Context(), policyID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch covered people")
		return
	}

	if people == nil {
		people = []*models.InsuranceCoveredPerson{}
	}

	JSON(w, http.StatusOK, people)
}

// AddCoveredPerson adds a covered person to a policy
func (h *InsuranceHandler) AddCoveredPerson(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		PersonID     uuid.UUID `json:"person_id"`
		CoverageType string    `json:"coverage_type"`
		Notes        string    `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	coveredPerson := &models.InsuranceCoveredPerson{
		PolicyID: policyID,
		PersonID: req.PersonID,
	}
	if req.CoverageType != "" {
		coveredPerson.CoverageType = &req.CoverageType
	}
	if req.Notes != "" {
		coveredPerson.Notes = &req.Notes
	}

	if err := h.insuranceRepo.AddCoveredPerson(r.Context(), coveredPerson); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to add covered person")
		return
	}

	JSON(w, http.StatusCreated, coveredPerson)
}

// RemoveCoveredPerson removes a covered person from a policy
func (h *InsuranceHandler) RemoveCoveredPerson(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "personId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.insuranceRepo.RemoveCoveredPerson(r.Context(), policyID, personID); err != nil {
		if errors.Is(err, repository.ErrCoveredPersonNotFound) {
			Error(w, http.StatusNotFound, "Covered person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to remove covered person")
		return
	}

	NoContent(w)
}

// GetClaims returns claims for a policy
func (h *InsuranceHandler) GetClaims(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	claims, err := h.insuranceRepo.GetClaimsByPolicyID(r.Context(), policyID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch claims")
		return
	}

	if claims == nil {
		claims = []*models.InsuranceClaim{}
	}

	JSON(w, http.StatusOK, claims)
}

// AddClaim adds a claim to a policy
func (h *InsuranceHandler) AddClaim(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var claim models.InsuranceClaim
	if err := json.NewDecoder(r.Body).Decode(&claim); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if claim.ClaimDate == "" {
		Error(w, http.StatusBadRequest, "Claim date is required")
		return
	}

	claim.PolicyID = policyID
	if claim.Status == "" {
		claim.Status = models.ClaimStatusPending
	}

	if err := h.insuranceRepo.CreateClaim(r.Context(), &claim); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create claim")
		return
	}

	JSON(w, http.StatusCreated, claim)
}

// UpdateClaim updates a claim
func (h *InsuranceHandler) UpdateClaim(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	claimID, err := uuid.Parse(chi.URLParam(r, "claimId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid claim ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	existingClaim, err := h.insuranceRepo.GetClaimByID(r.Context(), claimID)
	if err != nil {
		if errors.Is(err, repository.ErrClaimNotFound) {
			Error(w, http.StatusNotFound, "Claim not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch claim")
		return
	}

	if existingClaim.PolicyID != policyID {
		Error(w, http.StatusBadRequest, "Claim does not belong to this policy")
		return
	}

	var updates models.InsuranceClaim
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updates.ID = claimID
	updates.PolicyID = policyID
	updates.CreatedAt = existingClaim.CreatedAt

	if err := h.insuranceRepo.UpdateClaim(r.Context(), &updates); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update claim")
		return
	}

	JSON(w, http.StatusOK, updates)
}

// DeleteClaim deletes a claim
func (h *InsuranceHandler) DeleteClaim(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid policy ID")
		return
	}

	claimID, err := uuid.Parse(chi.URLParam(r, "claimId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid claim ID")
		return
	}

	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Policy not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch policy")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), policy.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	existingClaim, err := h.insuranceRepo.GetClaimByID(r.Context(), claimID)
	if err != nil {
		if errors.Is(err, repository.ErrClaimNotFound) {
			Error(w, http.StatusNotFound, "Claim not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch claim")
		return
	}

	if existingClaim.PolicyID != policyID {
		Error(w, http.StatusBadRequest, "Claim does not belong to this policy")
		return
	}

	if err := h.insuranceRepo.DeleteClaim(r.Context(), claimID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete claim")
		return
	}

	NoContent(w)
}
