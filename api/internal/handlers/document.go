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

type DocumentHandler struct {
	documentRepo  *repository.DocumentRepository
	householdRepo *repository.HouseholdRepository
}

func NewDocumentHandler(documentRepo *repository.DocumentRepository, householdRepo *repository.HouseholdRepository) *DocumentHandler {
	return &DocumentHandler{
		documentRepo:  documentRepo,
		householdRepo: householdRepo,
	}
}

// List returns all documents for the user's household
func (h *DocumentHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.Document{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	// Check for category filter
	category := r.URL.Query().Get("category")
	var docs []*models.Document

	if category != "" {
		docs, err = h.documentRepo.GetByCategory(r.Context(), household.ID, category)
	} else {
		docs, err = h.documentRepo.GetByHouseholdID(r.Context(), household.ID)
	}

	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch documents")
		return
	}

	if docs == nil {
		docs = []*models.Document{}
	}

	JSON(w, http.StatusOK, docs)
}

// Get returns a single document by ID
func (h *DocumentHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	doc, err := h.documentRepo.GetByID(r.Context(), docID)
	if err != nil {
		if errors.Is(err, repository.ErrDocumentNotFound) {
			Error(w, http.StatusNotFound, "Document not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch document")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), doc.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, doc)
}

// Create creates a new document
func (h *DocumentHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var doc models.Document
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if doc.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}
	if doc.Category == "" {
		Error(w, http.StatusBadRequest, "Category is required")
		return
	}
	if doc.URL == "" {
		Error(w, http.StatusBadRequest, "URL is required")
		return
	}

	doc.HouseholdID = household.ID

	if err := h.documentRepo.Create(r.Context(), &doc); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create document")
		return
	}

	JSON(w, http.StatusCreated, doc)
}

// Update updates a document
func (h *DocumentHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	existing, err := h.documentRepo.GetByID(r.Context(), docID)
	if err != nil {
		if errors.Is(err, repository.ErrDocumentNotFound) {
			Error(w, http.StatusNotFound, "Document not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch document")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), existing.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var updates models.Document
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updates.ID = docID
	updates.HouseholdID = existing.HouseholdID
	updates.CreatedAt = existing.CreatedAt

	if err := h.documentRepo.Update(r.Context(), &updates); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update document")
		return
	}

	JSON(w, http.StatusOK, updates)
}

// Delete deletes a document
func (h *DocumentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	doc, err := h.documentRepo.GetByID(r.Context(), docID)
	if err != nil {
		if errors.Is(err, repository.ErrDocumentNotFound) {
			Error(w, http.StatusNotFound, "Document not found")
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch document")
		return
	}

	belongs, err := h.householdRepo.BelongsToUser(r.Context(), doc.HouseholdID, userID)
	if err != nil || !belongs {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.documentRepo.Delete(r.Context(), docID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete document")
		return
	}

	NoContent(w)
}

// GetExpiringDocuments returns documents with upcoming expiry dates
func (h *DocumentHandler) GetExpiringDocuments(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, []*models.Document{})
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

	docs, err := h.documentRepo.GetExpiringDocuments(r.Context(), household.ID, daysAhead)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch documents")
		return
	}

	if docs == nil {
		docs = []*models.Document{}
	}

	JSON(w, http.StatusOK, docs)
}

// GetByPerson returns documents linked to a specific person
func (h *DocumentHandler) GetByPerson(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	personID, err := uuid.Parse(chi.URLParam(r, "personId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid person ID")
		return
	}

	// Get household to verify access
	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusBadRequest, "No household found")
		return
	}

	docs, err := h.documentRepo.GetByPersonID(r.Context(), personID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch documents")
		return
	}

	// Filter to only include docs from user's household
	var filtered []*models.Document
	for _, doc := range docs {
		if doc.HouseholdID == household.ID {
			filtered = append(filtered, doc)
		}
	}

	if filtered == nil {
		filtered = []*models.Document{}
	}

	JSON(w, http.StatusOK, filtered)
}

// GetCategoryStats returns document count by category
func (h *DocumentHandler) GetCategoryStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrHouseholdNotFound) {
			JSON(w, http.StatusOK, map[string]int{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	stats, err := h.documentRepo.GetCountByCategory(r.Context(), household.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch stats")
		return
	}

	JSON(w, http.StatusOK, stats)
}
