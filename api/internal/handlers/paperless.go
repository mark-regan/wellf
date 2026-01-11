package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/mark-regan/wellf/internal/config"
	"github.com/mark-regan/wellf/internal/paperless"
)

type PaperlessHandler struct {
	config *config.Config
}

func NewPaperlessHandler(cfg *config.Config) *PaperlessHandler {
	return &PaperlessHandler{
		config: cfg,
	}
}

// getClient creates a Paperless client using environment config
func (h *PaperlessHandler) getClient() (*paperless.Client, error) {
	if h.config.Paperless.URL == "" {
		return nil, errors.New("Paperless not configured - set PAPERLESS_URL environment variable")
	}

	if h.config.Paperless.APIToken == "" {
		return nil, errors.New("Paperless API token not configured - set PAPERLESS_API_KEY environment variable")
	}

	return paperless.NewClient(h.config.Paperless.URL, h.config.Paperless.APIToken), nil
}

// GetConfig returns the current Paperless configuration status
func (h *PaperlessHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	isConfigured := h.config.Paperless.URL != "" && h.config.Paperless.APIToken != ""

	JSON(w, http.StatusOK, map[string]interface{}{
		"paperless_url": h.config.Paperless.URL,
		"is_configured": isConfigured,
	})
}

// TestConnection tests the Paperless connection
func (h *PaperlessHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := client.TestConnection(r.Context()); err != nil {
		Error(w, http.StatusBadRequest, "Connection failed: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Connection successful",
	})
}

// SearchDocuments searches for documents in Paperless
func (h *PaperlessHandler) SearchDocuments(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	query := r.URL.Query().Get("query")
	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	result, err := client.SearchDocuments(r.Context(), query, page)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to search documents: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, result)
}

// GetDocument returns a single document from Paperless
func (h *PaperlessHandler) GetDocument(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	doc, err := client.GetDocument(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, doc)
}

// ProxyThumbnail proxies a document thumbnail from Paperless
func (h *PaperlessHandler) ProxyThumbnail(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	data, contentType, err := client.ProxyThumbnail(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch thumbnail: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600") // Cache for 1 hour
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// ProxyPreview proxies a document preview from Paperless
func (h *PaperlessHandler) ProxyPreview(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	data, contentType, err := client.ProxyPreview(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch preview: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// ProxyDownload proxies a document download from Paperless
func (h *PaperlessHandler) ProxyDownload(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	data, contentType, filename, err := client.ProxyDownload(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", contentType)
	if filename != "" {
		w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	}
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// GetCorrespondents returns all correspondents from Paperless
func (h *PaperlessHandler) GetCorrespondents(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	correspondents, err := client.GetCorrespondents(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch correspondents: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, correspondents)
}

// GetDocumentTypes returns all document types from Paperless
func (h *PaperlessHandler) GetDocumentTypes(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	docTypes, err := client.GetDocumentTypes(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch document types: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, docTypes)
}

// GetTags returns all tags from Paperless
func (h *PaperlessHandler) GetTags(w http.ResponseWriter, r *http.Request) {
	client, err := h.getClient()
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	tags, err := client.GetTags(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch tags: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, tags)
}
