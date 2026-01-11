package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/config"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/paperless"
	"github.com/mark-regan/wellf/internal/repository"
)

type DocumentLinkHandler struct {
	config           *config.Config
	documentLinkRepo *repository.DocumentLinkRepository
	householdRepo    *repository.HouseholdRepository
	personRepo       *repository.PersonRepository
	propertyRepo     *repository.PropertyRepository
	vehicleRepo      *repository.VehicleRepository
	insuranceRepo    *repository.InsuranceRepository
}

func NewDocumentLinkHandler(
	cfg *config.Config,
	documentLinkRepo *repository.DocumentLinkRepository,
	householdRepo *repository.HouseholdRepository,
	personRepo *repository.PersonRepository,
	propertyRepo *repository.PropertyRepository,
	vehicleRepo *repository.VehicleRepository,
	insuranceRepo *repository.InsuranceRepository,
) *DocumentLinkHandler {
	return &DocumentLinkHandler{
		config:           cfg,
		documentLinkRepo: documentLinkRepo,
		householdRepo:    householdRepo,
		personRepo:       personRepo,
		propertyRepo:     propertyRepo,
		vehicleRepo:      vehicleRepo,
		insuranceRepo:    insuranceRepo,
	}
}

// getPaperlessClient creates a Paperless client using environment config
func (h *DocumentLinkHandler) getPaperlessClient() (*paperless.Client, error) {
	if h.config.Paperless.URL == "" {
		return nil, errors.New("Paperless not configured - set PAPERLESS_URL environment variable")
	}

	if h.config.Paperless.APIToken == "" {
		return nil, errors.New("Paperless API token not configured - set PAPERLESS_API_KEY environment variable")
	}

	return paperless.NewClient(h.config.Paperless.URL, h.config.Paperless.APIToken), nil
}

// populateURLs adds the proxy URLs to document links
func (h *DocumentLinkHandler) populateURLs(links []*models.DocumentLink, apiBaseURL string) {
	for _, link := range links {
		link.PopulateURLs(apiBaseURL)
	}
}

// List returns all document links for the user's household
func (h *DocumentLinkHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.DocumentLink{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	links, err := h.documentLinkRepo.GetByHouseholdID(r.Context(), household.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document links")
		return
	}

	if links == nil {
		links = []*models.DocumentLink{}
	}

	// Get base URL for proxy URLs
	apiBaseURL := "/api/v1"
	h.populateURLs(links, apiBaseURL)

	JSON(w, http.StatusOK, links)
}

// Create creates a new document link
func (h *DocumentLinkHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req models.CreateDocumentLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.PaperlessDocumentID <= 0 {
		Error(w, http.StatusBadRequest, "Paperless document ID is required")
		return
	}

	// Check if link already exists
	exists, err := h.documentLinkRepo.ExistsByPaperlessID(r.Context(), household.ID, req.PaperlessDocumentID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to check existing link")
		return
	}
	if exists {
		Error(w, http.StatusConflict, "Document link already exists")
		return
	}

	// Get Paperless client to fetch document metadata
	client, err := h.getPaperlessClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Fetch document from Paperless to get metadata
	doc, err := client.GetDocument(r.Context(), req.PaperlessDocumentID)
	if err != nil {
		Error(w, http.StatusBadRequest, "Failed to fetch document from Paperless: "+err.Error())
		return
	}

	// Build document link
	link := &models.DocumentLink{
		HouseholdID:         household.ID,
		PaperlessDocumentID: req.PaperlessDocumentID,
		PaperlessTitle:      &doc.Title,
		Category:            req.Category,
		Description:         req.Description,
	}

	// Set correspondent name if available
	if doc.CorrespondentName != "" {
		link.PaperlessCorrespondent = &doc.CorrespondentName
	}

	// Set document type name if available
	if doc.DocumentTypeName != "" {
		link.PaperlessDocumentType = &doc.DocumentTypeName
	}

	// Parse and set created date
	if doc.CreatedDate != "" {
		if t, err := time.Parse("2006-01-02", doc.CreatedDate); err == nil {
			link.PaperlessCreated = &t
		}
	}

	// Parse and set linked entity IDs
	if req.LinkedPersonID != nil && *req.LinkedPersonID != "" {
		if id, err := uuid.Parse(*req.LinkedPersonID); err == nil {
			link.LinkedPersonID = &id
		}
	}
	if req.LinkedPropertyID != nil && *req.LinkedPropertyID != "" {
		if id, err := uuid.Parse(*req.LinkedPropertyID); err == nil {
			link.LinkedPropertyID = &id
		}
	}
	if req.LinkedVehicleID != nil && *req.LinkedVehicleID != "" {
		if id, err := uuid.Parse(*req.LinkedVehicleID); err == nil {
			link.LinkedVehicleID = &id
		}
	}
	if req.LinkedPolicyID != nil && *req.LinkedPolicyID != "" {
		if id, err := uuid.Parse(*req.LinkedPolicyID); err == nil {
			link.LinkedPolicyID = &id
		}
	}

	if err := h.documentLinkRepo.Create(r.Context(), link); err != nil {
		if errors.Is(err, repository.ErrDocumentLinkAlreadyExists) {
			Error(w, http.StatusConflict, "Document link already exists")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to create document link")
		return
	}

	// Populate URLs
	link.PopulateURLs("/api/v1")

	JSON(w, http.StatusCreated, link)
}

// Delete deletes a document link
func (h *DocumentLinkHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	linkID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document link ID")
		return
	}

	// Get the link to verify ownership
	link, err := h.documentLinkRepo.GetByID(r.Context(), linkID)
	if err != nil {
		if errors.Is(err, repository.ErrDocumentLinkNotFound) {
			Error(w, http.StatusNotFound, "Document link not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch document link")
		return
	}

	// Verify user belongs to the household
	belongs, err := h.householdRepo.BelongsToUser(r.Context(), link.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.documentLinkRepo.Delete(r.Context(), linkID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete document link")
		return
	}

	NoContent(w)
}

// GetByPerson returns document links for a specific person
func (h *DocumentLinkHandler) GetByPerson(w http.ResponseWriter, r *http.Request) {
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

	// Verify person belongs to user's household
	person, err := h.personRepo.GetByID(r.Context(), personID)
	if err != nil {
		if errors.Is(err, repository.ErrPersonNotFound) {
			Error(w, http.StatusNotFound, "Person not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch person")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), person.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	links, err := h.documentLinkRepo.GetByPersonID(r.Context(), personID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document links")
		return
	}

	if links == nil {
		links = []*models.DocumentLink{}
	}

	h.populateURLs(links, "/api/v1")
	JSON(w, http.StatusOK, links)
}

// GetByProperty returns document links for a specific property
func (h *DocumentLinkHandler) GetByProperty(w http.ResponseWriter, r *http.Request) {
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

	// Verify property belongs to user's household
	property, err := h.propertyRepo.GetByID(r.Context(), propertyID)
	if err != nil {
		if errors.Is(err, repository.ErrPropertyNotFound) {
			Error(w, http.StatusNotFound, "Property not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch property")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), property.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	links, err := h.documentLinkRepo.GetByPropertyID(r.Context(), propertyID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document links")
		return
	}

	if links == nil {
		links = []*models.DocumentLink{}
	}

	h.populateURLs(links, "/api/v1")
	JSON(w, http.StatusOK, links)
}

// GetByVehicle returns document links for a specific vehicle
func (h *DocumentLinkHandler) GetByVehicle(w http.ResponseWriter, r *http.Request) {
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

	// Verify vehicle belongs to user's household
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

	links, err := h.documentLinkRepo.GetByVehicleID(r.Context(), vehicleID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document links")
		return
	}

	if links == nil {
		links = []*models.DocumentLink{}
	}

	h.populateURLs(links, "/api/v1")
	JSON(w, http.StatusOK, links)
}

// GetByPolicy returns document links for a specific insurance policy
func (h *DocumentLinkHandler) GetByPolicy(w http.ResponseWriter, r *http.Request) {
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

	// Verify policy belongs to user's household
	policy, err := h.insuranceRepo.GetByID(r.Context(), policyID)
	if err != nil {
		if errors.Is(err, repository.ErrPolicyNotFound) {
			Error(w, http.StatusNotFound, "Insurance policy not found")
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

	links, err := h.documentLinkRepo.GetByPolicyID(r.Context(), policyID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document links")
		return
	}

	if links == nil {
		links = []*models.DocumentLink{}
	}

	h.populateURLs(links, "/api/v1")
	JSON(w, http.StatusOK, links)
}
