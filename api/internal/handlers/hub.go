package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type HubHandler struct {
	portfolioRepo    *repository.PortfolioRepository
	holdingRepo      *repository.HoldingRepository
	cashRepo         *repository.CashAccountRepository
	fixedAssetRepo   *repository.FixedAssetRepository
	userRepo         *repository.UserRepository
	activityRepo     *repository.ActivityRepository
	recipeRepo       *repository.RecipeRepository
	bookRepo         *repository.BookRepository
	readingListRepo  *repository.ReadingListRepository
	plantRepo        *repository.PlantRepository
	githubConfigRepo *repository.GitHubConfigRepository
	snippetRepo      *repository.SnippetRepository
	repoCacheRepo    *repository.GitHubRepoCacheRepository
	householdRepo    *repository.HouseholdRepository
	yahooService     *services.YahooService
}

func NewHubHandler(
	portfolioRepo *repository.PortfolioRepository,
	holdingRepo *repository.HoldingRepository,
	cashRepo *repository.CashAccountRepository,
	fixedAssetRepo *repository.FixedAssetRepository,
	userRepo *repository.UserRepository,
	activityRepo *repository.ActivityRepository,
	yahooService *services.YahooService,
) *HubHandler {
	return &HubHandler{
		portfolioRepo:  portfolioRepo,
		holdingRepo:    holdingRepo,
		cashRepo:       cashRepo,
		fixedAssetRepo: fixedAssetRepo,
		userRepo:       userRepo,
		activityRepo:   activityRepo,
		yahooService:   yahooService,
	}
}

// SetRecipeRepo sets the recipe repository for cooking summary
func (h *HubHandler) SetRecipeRepo(repo *repository.RecipeRepository) {
	h.recipeRepo = repo
}

// SetReadingRepos sets the book and reading list repositories for reading summary
func (h *HubHandler) SetReadingRepos(bookRepo *repository.BookRepository, readingListRepo *repository.ReadingListRepository) {
	h.bookRepo = bookRepo
	h.readingListRepo = readingListRepo
}

// SetPlantRepo sets the plant repository for plants summary
func (h *HubHandler) SetPlantRepo(repo *repository.PlantRepository) {
	h.plantRepo = repo
}

// SetCodingRepos sets the coding repositories for coding summary
func (h *HubHandler) SetCodingRepos(githubConfigRepo *repository.GitHubConfigRepository, snippetRepo *repository.SnippetRepository, repoCacheRepo *repository.GitHubRepoCacheRepository) {
	h.githubConfigRepo = githubConfigRepo
	h.snippetRepo = snippetRepo
	h.repoCacheRepo = repoCacheRepo
}

// SetHouseholdRepo sets the household repository for household summary
func (h *HubHandler) SetHouseholdRepo(repo *repository.HouseholdRepository) {
	h.householdRepo = repo
}

// Summary returns the hub summary with domain cards
func (h *HubHandler) Summary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	// Get finance summary
	financeSummary := h.getFinanceSummary(r, userID, user.BaseCurrency)

	// Get cooking summary
	cookingSummary := h.getCookingSummary(r, userID)

	// Get reading summary
	readingSummary := h.getReadingSummary(r, userID)

	// Get plants summary
	plantsSummary := h.getPlantsSummary(r, userID)

	// Get coding summary
	codingSummary := h.getCodingSummary(r, userID)

	// Get household summary
	householdSummary := h.getHouseholdSummary(r, userID)

	// Build domain summaries
	domains := []models.DomainSummary{
		financeSummary,
		householdSummary,
		cookingSummary,
		readingSummary,
		plantsSummary,
		codingSummary,
	}

	displayName := user.DisplayName
	if displayName == "" {
		displayName = user.Email
	}

	summary := models.HubSummary{
		DisplayName: displayName,
		Domains:     domains,
	}

	JSON(w, http.StatusOK, summary)
}

// getFinanceSummary calculates the finance domain summary
func (h *HubHandler) getFinanceSummary(r *http.Request, userID uuid.UUID, baseCurrency string) models.DomainSummary {
	// Get all portfolios
	portfolios, err := h.portfolioRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		return models.DomainSummary{
			Domain:      models.DomainFinance,
			Title:       "Finance",
			Icon:        "Wallet",
			Value:       "Error",
			Subtitle:    "Unable to load",
			Link:        "/dashboard",
			IsAvailable: true,
		}
	}

	var totalValue float64
	for _, p := range portfolios {
		summary, err := h.portfolioRepo.GetSummary(r.Context(), p.ID)
		if err == nil {
			totalValue += summary.TotalValue
		}
	}

	// Get cash from cash_accounts
	cashTotal, _ := h.cashRepo.GetTotalByUserID(r.Context(), userID)
	totalValue += cashTotal

	// Get fixed assets total
	fixedAssetsTotal, _ := h.fixedAssetRepo.GetTotalByUserID(r.Context(), userID)
	totalValue += fixedAssetsTotal

	// Format the value
	valueStr := formatCurrency(totalValue, baseCurrency)

	return models.DomainSummary{
		Domain:      models.DomainFinance,
		Title:       "Finance",
		Icon:        "Wallet",
		Value:       valueStr,
		Subtitle:    "Net Worth",
		Link:        "/dashboard",
		IsAvailable: true,
		Metric:      totalValue,
	}
}

// Activity returns the recent activity feed
func (h *HubHandler) Activity(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get limit from query params
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Get domain filter
	domain := r.URL.Query().Get("domain")

	var activities []*models.ActivityLog
	var err error

	if domain != "" {
		activities, err = h.activityRepo.GetByDomain(r.Context(), userID, domain, limit)
	} else {
		activities, err = h.activityRepo.GetByUserID(r.Context(), userID, limit)
	}

	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch activity")
		return
	}

	if activities == nil {
		activities = []*models.ActivityLog{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"activities": activities,
	})
}

// Upcoming returns upcoming reminders and events
func (h *HubHandler) Upcoming(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// For now, return empty list since we don't have other domains implemented yet
	// This will be populated as we add more modules
	_ = userID

	reminders := []models.UpcomingReminder{}

	JSON(w, http.StatusOK, map[string]interface{}{
		"reminders": reminders,
	})
}

// LogActivity creates a new activity log entry
func (h *HubHandler) LogActivity(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		Domain      string                 `json:"domain"`
		Action      string                 `json:"action"`
		EntityType  string                 `json:"entity_type"`
		EntityID    *string                `json:"entity_id,omitempty"`
		EntityName  string                 `json:"entity_name,omitempty"`
		Description string                 `json:"description,omitempty"`
		Metadata    map[string]interface{} `json:"metadata,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if input.Domain == "" || input.Action == "" || input.EntityType == "" {
		Error(w, http.StatusBadRequest, "Domain, action, and entity_type are required")
		return
	}

	activity := &models.ActivityLog{
		UserID:      userID,
		Domain:      input.Domain,
		Action:      input.Action,
		EntityType:  input.EntityType,
		EntityName:  input.EntityName,
		Description: input.Description,
		Metadata:    input.Metadata,
	}

	if input.EntityID != nil {
		id, err := uuid.Parse(*input.EntityID)
		if err == nil {
			activity.EntityID = &id
		}
	}

	if err := h.activityRepo.Create(r.Context(), activity); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to log activity")
		return
	}

	JSON(w, http.StatusCreated, activity)
}

// getCookingSummary returns the cooking domain summary
func (h *HubHandler) getCookingSummary(r *http.Request, userID uuid.UUID) models.DomainSummary {
	// Check if recipe repo is available
	if h.recipeRepo == nil {
		return models.DomainSummary{
			Domain:      models.DomainCooking,
			Title:       "Cooking",
			Icon:        "ChefHat",
			Value:       "Coming Soon",
			Subtitle:    "Recipes & meal planning",
			Link:        "/cooking",
			IsAvailable: false,
		}
	}

	// Get recipe count
	recipeCount, err := h.recipeRepo.CountByUser(r.Context(), userID)
	if err != nil || recipeCount == 0 {
		return models.DomainSummary{
			Domain:      models.DomainCooking,
			Title:       "Cooking",
			Icon:        "ChefHat",
			Value:       "0 recipes",
			Subtitle:    "Add your first recipe",
			Link:        "/cooking",
			IsAvailable: true,
			Metric:      0,
		}
	}

	// Get favourites count
	favCount, _ := h.recipeRepo.CountFavouritesByUser(r.Context(), userID)

	subtitle := fmt.Sprintf("%d favourites", favCount)
	if favCount == 0 {
		subtitle = "Recipes & meal planning"
	}

	return models.DomainSummary{
		Domain:      models.DomainCooking,
		Title:       "Cooking",
		Icon:        "ChefHat",
		Value:       fmt.Sprintf("%d recipes", recipeCount),
		Subtitle:    subtitle,
		Link:        "/cooking",
		IsAvailable: true,
		Metric:      float64(recipeCount),
	}
}

// getReadingSummary returns the reading domain summary
func (h *HubHandler) getReadingSummary(r *http.Request, userID uuid.UUID) models.DomainSummary {
	// Check if book repo is available
	if h.bookRepo == nil {
		return models.DomainSummary{
			Domain:      models.DomainBooks,
			Title:       "Reading",
			Icon:        "BookOpen",
			Value:       "Coming Soon",
			Subtitle:    "Reading lists & goals",
			Link:        "/reading",
			IsAvailable: false,
		}
	}

	// Get book count
	bookCount, err := h.bookRepo.Count(r.Context(), userID)
	if err != nil || bookCount == 0 {
		return models.DomainSummary{
			Domain:      models.DomainBooks,
			Title:       "Reading",
			Icon:        "BookOpen",
			Value:       "0 books",
			Subtitle:    "Start your library",
			Link:        "/reading",
			IsAvailable: true,
			Metric:      0,
		}
	}

	// Get currently reading count
	currentlyReading, _ := h.readingListRepo.GetCurrentlyReading(r.Context(), userID, 10)
	currentCount := len(currentlyReading)

	subtitle := "In your library"
	if currentCount > 0 {
		subtitle = fmt.Sprintf("%d currently reading", currentCount)
	}

	return models.DomainSummary{
		Domain:      models.DomainBooks,
		Title:       "Reading",
		Icon:        "BookOpen",
		Value:       fmt.Sprintf("%d books", bookCount),
		Subtitle:    subtitle,
		Link:        "/reading",
		IsAvailable: true,
		Metric:      float64(bookCount),
	}
}

// getPlantsSummary returns the plants domain summary
func (h *HubHandler) getPlantsSummary(r *http.Request, userID uuid.UUID) models.DomainSummary {
	// Check if plant repo is available
	if h.plantRepo == nil {
		return models.DomainSummary{
			Domain:      models.DomainPlants,
			Title:       "Plants",
			Icon:        "Leaf",
			Value:       "Coming Soon",
			Subtitle:    "Plant care tracking",
			Link:        "/plants",
			IsAvailable: false,
		}
	}

	// Get plant count
	plantCount, err := h.plantRepo.Count(r.Context(), userID, true)
	if err != nil || plantCount == 0 {
		return models.DomainSummary{
			Domain:      models.DomainPlants,
			Title:       "Plants",
			Icon:        "Leaf",
			Value:       "0 plants",
			Subtitle:    "Add your first plant",
			Link:        "/plants",
			IsAvailable: true,
			Metric:      0,
		}
	}

	// Get plants needing water
	needingWater, _ := h.plantRepo.GetNeedingWater(r.Context(), userID, 0)
	needWaterCount := len(needingWater)

	subtitle := "All plants happy"
	if needWaterCount > 0 {
		subtitle = fmt.Sprintf("%d need water", needWaterCount)
	}

	return models.DomainSummary{
		Domain:      models.DomainPlants,
		Title:       "Plants",
		Icon:        "Leaf",
		Value:       fmt.Sprintf("%d plants", plantCount),
		Subtitle:    subtitle,
		Link:        "/plants",
		IsAvailable: true,
		Metric:      float64(plantCount),
	}
}

// getCodingSummary returns the coding domain summary
func (h *HubHandler) getCodingSummary(r *http.Request, userID uuid.UUID) models.DomainSummary {
	// Check if repos are available
	if h.snippetRepo == nil {
		return models.DomainSummary{
			Domain:      models.DomainCode,
			Title:       "Code",
			Icon:        "Code",
			Value:       "Coming Soon",
			Subtitle:    "GitHub & snippets",
			Link:        "/code",
			IsAvailable: false,
		}
	}

	// Get snippet count
	snippetCount, err := h.snippetRepo.Count(r.Context(), userID)
	if err != nil {
		snippetCount = 0
	}

	// Get repo count from cache
	var repoCount int
	if h.repoCacheRepo != nil {
		repoCount, _ = h.repoCacheRepo.Count(r.Context(), userID)
	}

	// Check if GitHub is connected
	var isConnected bool
	if h.githubConfigRepo != nil {
		config, _ := h.githubConfigRepo.Get(r.Context(), userID)
		isConnected = config != nil && config.GitHubToken != ""
	}

	if snippetCount == 0 && repoCount == 0 {
		subtitle := "Add snippets & repos"
		if !isConnected {
			subtitle = "Connect GitHub to start"
		}
		return models.DomainSummary{
			Domain:      models.DomainCode,
			Title:       "Code",
			Icon:        "Code",
			Value:       "0 snippets",
			Subtitle:    subtitle,
			Link:        "/code",
			IsAvailable: true,
			Metric:      0,
		}
	}

	subtitle := fmt.Sprintf("%d repos synced", repoCount)
	if repoCount == 0 {
		subtitle = "GitHub & snippets"
	}

	return models.DomainSummary{
		Domain:      models.DomainCode,
		Title:       "Code",
		Icon:        "Code",
		Value:       fmt.Sprintf("%d snippets", snippetCount),
		Subtitle:    subtitle,
		Link:        "/code",
		IsAvailable: true,
		Metric:      float64(snippetCount),
	}
}

// getHouseholdSummary returns the household domain summary
func (h *HubHandler) getHouseholdSummary(r *http.Request, userID uuid.UUID) models.DomainSummary {
	// Check if household repo is available
	if h.householdRepo == nil {
		return models.DomainSummary{
			Domain:      models.DomainHousehold,
			Title:       "Household",
			Icon:        "Home",
			Value:       "Coming Soon",
			Subtitle:    "Bills & subscriptions",
			Link:        "/household",
			IsAvailable: false,
		}
	}

	// Get household summary
	summary, err := h.householdRepo.GetHouseholdSummary(r.Context(), userID, "GBP")
	if err != nil {
		return models.DomainSummary{
			Domain:      models.DomainHousehold,
			Title:       "Household",
			Icon:        "Home",
			Value:       "Error",
			Subtitle:    "Unable to load",
			Link:        "/household",
			IsAvailable: true,
		}
	}

	totalItems := summary.TotalBills + summary.TotalSubscriptions + summary.TotalPolicies

	if totalItems == 0 {
		return models.DomainSummary{
			Domain:      models.DomainHousehold,
			Title:       "Household",
			Icon:        "Home",
			Value:       "0 items",
			Subtitle:    "Add bills & subscriptions",
			Link:        "/household",
			IsAvailable: true,
			Metric:      0,
		}
	}

	// Format monthly spending (bills + subscriptions)
	monthlySpending := summary.MonthlyBillsTotal + summary.MonthlySubsTotal
	valueStr := formatCurrency(monthlySpending, "GBP") + "/mo"

	// Build subtitle based on what needs attention
	subtitle := fmt.Sprintf("%d bills, %d subscriptions", summary.TotalBills, summary.TotalSubscriptions)
	if summary.OverdueBills > 0 {
		subtitle = fmt.Sprintf("%d bills overdue", summary.OverdueBills)
	} else if summary.BillsDueThisMonth > 0 {
		subtitle = fmt.Sprintf("%d due this month", summary.BillsDueThisMonth)
	}

	return models.DomainSummary{
		Domain:      models.DomainHousehold,
		Title:       "Household",
		Icon:        "Home",
		Value:       valueStr,
		Subtitle:    subtitle,
		Link:        "/household",
		IsAvailable: true,
		Metric:      monthlySpending,
	}
}

// formatCurrency formats a value with the appropriate currency symbol
func formatCurrency(value float64, currency string) string {
	symbol := "£"
	switch currency {
	case "USD":
		symbol = "$"
	case "EUR":
		symbol = "€"
	case "GBP":
		symbol = "£"
	}

	if value >= 1000000 {
		return fmt.Sprintf("%s%.1fM", symbol, value/1000000)
	} else if value >= 1000 {
		return fmt.Sprintf("%s%.0fK", symbol, value/1000)
	}
	return fmt.Sprintf("%s%.0f", symbol, value)
}
