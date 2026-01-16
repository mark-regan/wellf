package handlers

import (
	"archive/zip"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/mark-regan/wellf/internal/github"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
)

// CodingHandler handles coding-related HTTP requests
type CodingHandler struct {
	configRepo   *repository.GitHubConfigRepository
	snippetRepo  *repository.SnippetRepository
	templateRepo *repository.TemplateRepository
	repoCacheRepo *repository.GitHubRepoCacheRepository
}

// NewCodingHandler creates a new coding handler
func NewCodingHandler(
	configRepo *repository.GitHubConfigRepository,
	snippetRepo *repository.SnippetRepository,
	templateRepo *repository.TemplateRepository,
	repoCacheRepo *repository.GitHubRepoCacheRepository,
) *CodingHandler {
	return &CodingHandler{
		configRepo:   configRepo,
		snippetRepo:  snippetRepo,
		templateRepo: templateRepo,
		repoCacheRepo: repoCacheRepo,
	}
}

// Routes returns the coding routes
func (h *CodingHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// GitHub Config
	r.Get("/github/config", h.getGitHubConfig)
	r.Put("/github/config", h.updateGitHubConfig)
	r.Post("/github/config/test", h.testGitHubConnection)
	r.Delete("/github/config", h.deleteGitHubConfig)

	// GitHub Repos
	r.Get("/github/repos", h.listGitHubRepos)
	r.Post("/github/repos/sync", h.syncGitHubRepos)
	r.Get("/github/repos/{owner}/{repo}", h.getGitHubRepo)
	r.Get("/github/repos/{owner}/{repo}/commits", h.getRepoCommitActivity)
	r.Get("/github/repos/{owner}/{repo}/workflows", h.getRepoWorkflows)
	r.Get("/github/repos/{owner}/{repo}/runs", h.getRepoWorkflowRuns)

	// Code Snippets
	r.Get("/snippets", h.listSnippets)
	r.Post("/snippets", h.createSnippet)
	r.Get("/snippets/{id}", h.getSnippet)
	r.Put("/snippets/{id}", h.updateSnippet)
	r.Delete("/snippets/{id}", h.deleteSnippet)

	// Project Templates
	r.Get("/templates", h.listTemplates)
	r.Post("/templates", h.createTemplate)
	r.Get("/templates/{id}", h.getTemplate)
	r.Put("/templates/{id}", h.updateTemplate)
	r.Delete("/templates/{id}", h.deleteTemplate)
	r.Post("/templates/{id}/download", h.downloadTemplate)

	// Summary
	r.Get("/summary", h.getSummary)

	return r
}

// =============================================================================
// GitHub Config Handlers
// =============================================================================

func (h *CodingHandler) getGitHubConfig(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Return empty config
			JSON(w, http.StatusOK, &models.GitHubConfig{
				UserID:            userID,
				DefaultVisibility: "private",
			})
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, config)
}

func (h *CodingHandler) updateGitHubConfig(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.UpdateGitHubConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Get existing or create new config
	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil && err != pgx.ErrNoRows {
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if config == nil {
		config = &models.GitHubConfig{
			UserID:            userID,
			DefaultVisibility: "private",
		}
	}

	// Apply updates
	if req.GitHubUsername != nil {
		config.GitHubUsername = *req.GitHubUsername
	}
	if req.GitHubToken != nil {
		config.GitHubToken = *req.GitHubToken
	}
	if req.DefaultVisibility != nil {
		config.DefaultVisibility = *req.DefaultVisibility
	}
	if req.ShowArchived != nil {
		config.ShowArchived = *req.ShowArchived
	}

	if err := h.configRepo.Upsert(r.Context(), config); err != nil {
		http.Error(w, "failed to update config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	config.HasToken = config.GitHubToken != ""
	JSON(w, http.StatusOK, config)
}

func (h *CodingHandler) testGitHubConnection(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "GitHub not configured", http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if config.GitHubToken == "" {
		http.Error(w, "GitHub token not set", http.StatusBadRequest)
		return
	}

	client := github.NewClient(config.GitHubToken)
	user, err := client.GetAuthenticatedUser(r.Context())
	if err != nil {
		http.Error(w, "GitHub connection failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"username": user.Login,
		"name":     user.Name,
	})
}

func (h *CodingHandler) deleteGitHubConfig(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	if err := h.configRepo.Delete(r.Context(), userID); err != nil {
		http.Error(w, "failed to delete config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Also clear the repo cache
	h.repoCacheRepo.DeleteAll(r.Context(), userID)

	w.WriteHeader(http.StatusNoContent)
}

// =============================================================================
// GitHub Repos Handlers
// =============================================================================

func (h *CodingHandler) listGitHubRepos(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			JSON(w, http.StatusOK, []models.GitHubRepo{})
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	includeArchived := config.ShowArchived
	if r.URL.Query().Get("include_archived") == "true" {
		includeArchived = true
	}

	repos, err := h.repoCacheRepo.List(r.Context(), userID, includeArchived)
	if err != nil {
		http.Error(w, "failed to list repos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if repos == nil {
		repos = []models.GitHubRepo{}
	}

	JSON(w, http.StatusOK, repos)
}

func (h *CodingHandler) syncGitHubRepos(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "GitHub not configured", http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if config.GitHubToken == "" {
		http.Error(w, "GitHub token not set", http.StatusBadRequest)
		return
	}

	client := github.NewClient(config.GitHubToken)
	apiRepos, err := client.ListAllRepos(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch repos from GitHub: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert and cache
	repos := github.ConvertReposToModels(userID, apiRepos)
	if err := h.repoCacheRepo.BulkUpsert(r.Context(), repos); err != nil {
		http.Error(w, "failed to cache repos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"synced":  len(repos),
	})
}

func (h *CodingHandler) getGitHubRepo(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	owner := chi.URLParam(r, "owner")
	repo := chi.URLParam(r, "repo")

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "GitHub not configured", http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if config.GitHubToken == "" {
		http.Error(w, "GitHub token not set", http.StatusBadRequest)
		return
	}

	client := github.NewClient(config.GitHubToken)
	apiRepo, err := client.GetRepo(r.Context(), owner, repo)
	if err != nil {
		http.Error(w, "failed to get repo: "+err.Error(), http.StatusNotFound)
		return
	}

	repoModel := github.ConvertRepoToModel(userID, apiRepo)
	JSON(w, http.StatusOK, repoModel)
}

// =============================================================================
// Snippet Handlers
// =============================================================================

func (h *CodingHandler) listSnippets(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	language := r.URL.Query().Get("language")
	favouritesOnly := r.URL.Query().Get("favourites") == "true"

	snippets, err := h.snippetRepo.List(r.Context(), userID, language, favouritesOnly)
	if err != nil {
		http.Error(w, "failed to list snippets: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if snippets == nil {
		snippets = []models.CodeSnippet{}
	}

	JSON(w, http.StatusOK, snippets)
}

func (h *CodingHandler) createSnippet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateSnippetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Code == "" {
		http.Error(w, "title and code are required", http.StatusBadRequest)
		return
	}

	snippet := &models.CodeSnippet{
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		Language:    req.Language,
		Filename:    req.Filename,
		Code:        req.Code,
		Tags:        req.Tags,
		IsPublic:    req.IsPublic,
		SourceURL:   req.SourceURL,
		SourceRepo:  req.SourceRepo,
	}

	if err := h.snippetRepo.Create(r.Context(), snippet); err != nil {
		http.Error(w, "failed to create snippet: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, snippet)
}

func (h *CodingHandler) getSnippet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	snippetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid snippet ID", http.StatusBadRequest)
		return
	}

	snippet, err := h.snippetRepo.GetByID(r.Context(), userID, snippetID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "snippet not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get snippet: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, snippet)
}

func (h *CodingHandler) updateSnippet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	snippetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid snippet ID", http.StatusBadRequest)
		return
	}

	snippet, err := h.snippetRepo.GetByID(r.Context(), userID, snippetID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "snippet not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get snippet: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateSnippetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Title != nil {
		snippet.Title = *req.Title
	}
	if req.Description != nil {
		snippet.Description = *req.Description
	}
	if req.Language != nil {
		snippet.Language = *req.Language
	}
	if req.Filename != nil {
		snippet.Filename = *req.Filename
	}
	if req.Code != nil {
		snippet.Code = *req.Code
	}
	if req.Tags != nil {
		snippet.Tags = req.Tags
	}
	if req.IsFavourite != nil {
		snippet.IsFavourite = *req.IsFavourite
	}
	if req.IsPublic != nil {
		snippet.IsPublic = *req.IsPublic
	}
	if req.SourceURL != nil {
		snippet.SourceURL = *req.SourceURL
	}
	if req.SourceRepo != nil {
		snippet.SourceRepo = *req.SourceRepo
	}

	if err := h.snippetRepo.Update(r.Context(), snippet); err != nil {
		http.Error(w, "failed to update snippet: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, snippet)
}

func (h *CodingHandler) deleteSnippet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	snippetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid snippet ID", http.StatusBadRequest)
		return
	}

	if err := h.snippetRepo.Delete(r.Context(), userID, snippetID); err != nil {
		http.Error(w, "failed to delete snippet: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// =============================================================================
// Template Handlers
// =============================================================================

func (h *CodingHandler) listTemplates(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	category := r.URL.Query().Get("category")

	templates, err := h.templateRepo.List(r.Context(), userID, category)
	if err != nil {
		http.Error(w, "failed to list templates: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if templates == nil {
		templates = []models.ProjectTemplate{}
	}

	JSON(w, http.StatusOK, templates)
}

func (h *CodingHandler) createTemplate(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.TemplateType == "" {
		http.Error(w, "name and template_type are required", http.StatusBadRequest)
		return
	}

	template := &models.ProjectTemplate{
		UserID:              userID,
		Name:                req.Name,
		Description:         req.Description,
		TemplateType:        req.TemplateType,
		GitHubTemplateRepo:  req.GitHubTemplateRepo,
		GitHubTemplateOwner: req.GitHubTemplateOwner,
		Files:               req.Files,
		SetupCommands:       req.SetupCommands,
		DefaultBranch:       req.DefaultBranch,
		Variables:           req.Variables,
		Category:            req.Category,
		Tags:                req.Tags,
	}

	if template.DefaultBranch == "" {
		template.DefaultBranch = "main"
	}

	if err := h.templateRepo.Create(r.Context(), template); err != nil {
		http.Error(w, "failed to create template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, template)
}

func (h *CodingHandler) getTemplate(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid template ID", http.StatusBadRequest)
		return
	}

	template, err := h.templateRepo.GetByID(r.Context(), userID, templateID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "template not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, template)
}

func (h *CodingHandler) updateTemplate(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid template ID", http.StatusBadRequest)
		return
	}

	template, err := h.templateRepo.GetByID(r.Context(), userID, templateID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "template not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Name != nil {
		template.Name = *req.Name
	}
	if req.Description != nil {
		template.Description = *req.Description
	}
	if req.TemplateType != nil {
		template.TemplateType = *req.TemplateType
	}
	if req.GitHubTemplateRepo != nil {
		template.GitHubTemplateRepo = *req.GitHubTemplateRepo
	}
	if req.GitHubTemplateOwner != nil {
		template.GitHubTemplateOwner = *req.GitHubTemplateOwner
	}
	if req.Files != nil {
		template.Files = req.Files
	}
	if req.SetupCommands != nil {
		template.SetupCommands = req.SetupCommands
	}
	if req.DefaultBranch != nil {
		template.DefaultBranch = *req.DefaultBranch
	}
	if req.Variables != nil {
		template.Variables = req.Variables
	}
	if req.Category != nil {
		template.Category = *req.Category
	}
	if req.Tags != nil {
		template.Tags = req.Tags
	}

	if err := h.templateRepo.Update(r.Context(), template); err != nil {
		http.Error(w, "failed to update template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, template)
}

func (h *CodingHandler) deleteTemplate(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid template ID", http.StatusBadRequest)
		return
	}

	if err := h.templateRepo.Delete(r.Context(), userID, templateID); err != nil {
		http.Error(w, "failed to delete template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DownloadTemplateRequest contains variable values for template generation
type DownloadTemplateRequest struct {
	Variables map[string]string `json:"variables"`
}

func (h *CodingHandler) downloadTemplate(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid template ID", http.StatusBadRequest)
		return
	}

	template, err := h.templateRepo.GetByID(r.Context(), userID, templateID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "template not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Parse request for variable values
	var req DownloadTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Empty body is OK, just use empty variables
		req.Variables = make(map[string]string)
	}

	// Add default values for variables not provided
	for _, v := range template.Variables {
		if _, ok := req.Variables[v.Name]; !ok && v.Default != "" {
			req.Variables[v.Name] = v.Default
		}
	}

	// Create ZIP file
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+template.Name+".zip\"")

	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	// Process each file in the template
	for _, file := range template.Files {
		content := file.Content

		// Replace variables in content
		for varName, varValue := range req.Variables {
			placeholder := "{{" + varName + "}}"
			content = strings.ReplaceAll(content, placeholder, varValue)
		}

		// Also replace in filename
		filename := file.Filename
		for varName, varValue := range req.Variables {
			placeholder := "{{" + varName + "}}"
			filename = strings.ReplaceAll(filename, placeholder, varValue)
		}

		// Create file in ZIP
		f, err := zipWriter.Create(filename)
		if err != nil {
			http.Error(w, "failed to create zip file: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if _, err := f.Write([]byte(content)); err != nil {
			http.Error(w, "failed to write to zip: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

// =============================================================================
// GitHub Commit Activity & Actions Handlers
// =============================================================================

func (h *CodingHandler) getRepoCommitActivity(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	owner := chi.URLParam(r, "owner")
	repo := chi.URLParam(r, "repo")

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "GitHub not configured", http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if config.GitHubToken == "" {
		http.Error(w, "GitHub token not set", http.StatusBadRequest)
		return
	}

	client := github.NewClient(config.GitHubToken)
	activity, err := client.GetCommitActivity(r.Context(), owner, repo)
	if err != nil {
		// Handle "stats being computed" gracefully
		if strings.Contains(err.Error(), "being computed") {
			JSON(w, http.StatusAccepted, map[string]interface{}{
				"status":  "computing",
				"message": "Statistics are being computed, please try again in a few seconds",
			})
			return
		}
		http.Error(w, "failed to get commit activity: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, activity)
}

func (h *CodingHandler) getRepoWorkflows(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	owner := chi.URLParam(r, "owner")
	repo := chi.URLParam(r, "repo")

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "GitHub not configured", http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if config.GitHubToken == "" {
		http.Error(w, "GitHub token not set", http.StatusBadRequest)
		return
	}

	client := github.NewClient(config.GitHubToken)
	workflows, err := client.ListWorkflows(r.Context(), owner, repo)
	if err != nil {
		http.Error(w, "failed to get workflows: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if workflows == nil {
		workflows = []github.Workflow{}
	}

	JSON(w, http.StatusOK, workflows)
}

func (h *CodingHandler) getRepoWorkflowRuns(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	owner := chi.URLParam(r, "owner")
	repo := chi.URLParam(r, "repo")

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "GitHub not configured", http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to get config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if config.GitHubToken == "" {
		http.Error(w, "GitHub token not set", http.StatusBadRequest)
		return
	}

	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	client := github.NewClient(config.GitHubToken)
	runs, err := client.ListWorkflowRuns(r.Context(), owner, repo, limit)
	if err != nil {
		http.Error(w, "failed to get workflow runs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if runs == nil {
		runs = []github.WorkflowRun{}
	}

	JSON(w, http.StatusOK, runs)
}

// =============================================================================
// Summary Handler
// =============================================================================

func (h *CodingHandler) getSummary(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	summary := &models.CodingSummary{}

	// Get counts
	repoCount, _ := h.repoCacheRepo.Count(r.Context(), userID)
	snippetCount, _ := h.snippetRepo.Count(r.Context(), userID)
	templateCount, _ := h.templateRepo.Count(r.Context(), userID)

	summary.TotalRepos = repoCount
	summary.TotalSnippets = snippetCount
	summary.TotalTemplates = templateCount

	// Get recent repos
	recentRepos, _ := h.repoCacheRepo.GetRecent(r.Context(), userID, 5)
	summary.RecentRepos = recentRepos

	// Get recent snippets
	recentSnippets, _ := h.snippetRepo.GetRecent(r.Context(), userID, 5)
	summary.RecentSnippets = recentSnippets

	// Get language stats
	langStats, _ := h.repoCacheRepo.GetByLanguage(r.Context(), userID)
	summary.TopLanguages = langStats

	JSON(w, http.StatusOK, summary)
}
