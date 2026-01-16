package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type CookingHandler struct {
	recipeRepo       *repository.RecipeRepository
	collectionRepo   *repository.CollectionRepository
	mealPlanRepo     *repository.MealPlanRepository
	shoppingListRepo *repository.ShoppingListRepository
	activityRepo     *repository.ActivityRepository
	recipeScraper    *services.RecipeScraper
}

func NewCookingHandler(
	recipeRepo *repository.RecipeRepository,
	collectionRepo *repository.CollectionRepository,
	mealPlanRepo *repository.MealPlanRepository,
	shoppingListRepo *repository.ShoppingListRepository,
	activityRepo *repository.ActivityRepository,
) *CookingHandler {
	return &CookingHandler{
		recipeRepo:       recipeRepo,
		collectionRepo:   collectionRepo,
		mealPlanRepo:     mealPlanRepo,
		shoppingListRepo: shoppingListRepo,
		activityRepo:     activityRepo,
		recipeScraper:    services.NewRecipeScraper(),
	}
}

// =============================================================================
// Recipe Handlers
// =============================================================================

// ListRecipes returns all recipes for the user with optional filters
func (h *CookingHandler) ListRecipes(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	filters := repository.RecipeFilters{
		Search:         r.URL.Query().Get("search"),
		Course:         r.URL.Query().Get("course"),
		Cuisine:        r.URL.Query().Get("cuisine"),
		FavouritesOnly: r.URL.Query().Get("favourites") == "true",
		SortBy:         r.URL.Query().Get("sort"),
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			filters.Limit = l
		}
	}

	recipes, err := h.recipeRepo.GetByUserID(r.Context(), userID, filters)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch recipes")
		return
	}

	if recipes == nil {
		recipes = []*models.Recipe{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"recipes": recipes,
	})
}

// GetRecipe returns a single recipe by ID
func (h *CookingHandler) GetRecipe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	recipeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid recipe ID")
		return
	}

	recipe, err := h.recipeRepo.GetByID(r.Context(), recipeID)
	if err != nil {
		Error(w, http.StatusNotFound, "Recipe not found")
		return
	}

	// Verify ownership
	if recipe.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	// Get collections for this recipe
	collections, _ := h.collectionRepo.GetCollectionsForRecipe(r.Context(), recipeID)

	JSON(w, http.StatusOK, map[string]interface{}{
		"recipe":      recipe,
		"collections": collections,
	})
}

// CreateRecipe creates a new recipe
func (h *CookingHandler) CreateRecipe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title == "" {
		Error(w, http.StatusBadRequest, "Title is required")
		return
	}

	recipe := &models.Recipe{
		UserID:           userID,
		Title:            req.Title,
		Description:      req.Description,
		SourceURL:        req.SourceURL,
		SourceName:       req.SourceName,
		ImageURL:         req.ImageURL,
		PrepTimeMinutes:  req.PrepTimeMinutes,
		CookTimeMinutes:  req.CookTimeMinutes,
		TotalTimeMinutes: req.TotalTimeMinutes,
		Servings:         req.Servings,
		ServingsUnit:     req.ServingsUnit,
		Ingredients:      req.Ingredients,
		Instructions:     req.Instructions,
		Cuisine:          req.Cuisine,
		Course:           req.Course,
		DietTags:         req.DietTags,
		CustomTags:       req.CustomTags,
		Notes:            req.Notes,
	}

	if recipe.SourceName == "" && recipe.SourceURL == "" {
		recipe.SourceName = "Manual"
	}

	if err := h.recipeRepo.Create(r.Context(), recipe); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create recipe")
		return
	}

	// Log activity
	h.activityRepo.Log(r.Context(), userID, models.DomainCooking, models.ActionCreated, "recipe", &recipe.ID, recipe.Title, "Added new recipe")

	JSON(w, http.StatusCreated, recipe)
}

// UpdateRecipe updates an existing recipe
func (h *CookingHandler) UpdateRecipe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	recipeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid recipe ID")
		return
	}

	recipe, err := h.recipeRepo.GetByID(r.Context(), recipeID)
	if err != nil {
		Error(w, http.StatusNotFound, "Recipe not found")
		return
	}

	if recipe.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req models.UpdateRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Update fields if provided
	if req.Title != nil {
		recipe.Title = *req.Title
	}
	if req.Description != nil {
		recipe.Description = *req.Description
	}
	if req.SourceURL != nil {
		recipe.SourceURL = *req.SourceURL
	}
	if req.SourceName != nil {
		recipe.SourceName = *req.SourceName
	}
	if req.ImageURL != nil {
		recipe.ImageURL = *req.ImageURL
	}
	if req.PrepTimeMinutes != nil {
		recipe.PrepTimeMinutes = req.PrepTimeMinutes
	}
	if req.CookTimeMinutes != nil {
		recipe.CookTimeMinutes = req.CookTimeMinutes
	}
	if req.TotalTimeMinutes != nil {
		recipe.TotalTimeMinutes = req.TotalTimeMinutes
	}
	if req.Servings != nil {
		recipe.Servings = req.Servings
	}
	if req.ServingsUnit != nil {
		recipe.ServingsUnit = *req.ServingsUnit
	}
	if req.Ingredients != nil {
		recipe.Ingredients = req.Ingredients
	}
	if req.Instructions != nil {
		recipe.Instructions = req.Instructions
	}
	if req.Cuisine != nil {
		recipe.Cuisine = *req.Cuisine
	}
	if req.Course != nil {
		recipe.Course = *req.Course
	}
	if req.DietTags != nil {
		recipe.DietTags = req.DietTags
	}
	if req.CustomTags != nil {
		recipe.CustomTags = req.CustomTags
	}
	if req.Rating != nil {
		recipe.Rating = req.Rating
	}
	if req.Notes != nil {
		recipe.Notes = *req.Notes
	}
	if req.IsFavourite != nil {
		recipe.IsFavourite = *req.IsFavourite
	}

	if err := h.recipeRepo.Update(r.Context(), recipe); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update recipe")
		return
	}

	JSON(w, http.StatusOK, recipe)
}

// DeleteRecipe deletes a recipe
func (h *CookingHandler) DeleteRecipe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	recipeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid recipe ID")
		return
	}

	recipe, err := h.recipeRepo.GetByID(r.Context(), recipeID)
	if err != nil {
		Error(w, http.StatusNotFound, "Recipe not found")
		return
	}

	if recipe.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.recipeRepo.Delete(r.Context(), recipeID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete recipe")
		return
	}

	// Log activity
	h.activityRepo.Log(r.Context(), userID, models.DomainCooking, models.ActionDeleted, "recipe", nil, recipe.Title, "Deleted recipe")

	JSON(w, http.StatusOK, map[string]string{"message": "Recipe deleted"})
}

// MarkRecipeCooked marks a recipe as cooked
func (h *CookingHandler) MarkRecipeCooked(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	recipeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid recipe ID")
		return
	}

	recipe, err := h.recipeRepo.GetByID(r.Context(), recipeID)
	if err != nil {
		Error(w, http.StatusNotFound, "Recipe not found")
		return
	}

	if recipe.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.recipeRepo.MarkCooked(r.Context(), recipeID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to mark recipe as cooked")
		return
	}

	// Log activity
	h.activityRepo.Log(r.Context(), userID, models.DomainCooking, models.ActionCompleted, "recipe", &recipeID, recipe.Title, "Cooked "+recipe.Title)

	JSON(w, http.StatusOK, map[string]string{"message": "Recipe marked as cooked"})
}

// ToggleFavourite toggles the favourite status
func (h *CookingHandler) ToggleFavourite(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	recipeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid recipe ID")
		return
	}

	recipe, err := h.recipeRepo.GetByID(r.Context(), recipeID)
	if err != nil {
		Error(w, http.StatusNotFound, "Recipe not found")
		return
	}

	if recipe.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	isFavourite, err := h.recipeRepo.ToggleFavourite(r.Context(), recipeID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to toggle favourite")
		return
	}

	JSON(w, http.StatusOK, map[string]bool{"is_favourite": isFavourite})
}

// ImportFromURL imports a recipe from a URL by scraping structured data
func (h *CookingHandler) ImportFromURL(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.ScrapeRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.URL == "" {
		Error(w, http.StatusBadRequest, "URL is required")
		return
	}

	// Scrape the recipe
	scraped, err := h.recipeScraper.ScrapeRecipe(req.URL)
	if err != nil {
		Error(w, http.StatusBadRequest, "Failed to import recipe: "+err.Error())
		return
	}

	// Convert to recipe model
	recipe := &models.Recipe{
		UserID:           userID,
		Title:            scraped.Title,
		Description:      scraped.Description,
		SourceURL:        scraped.SourceURL,
		SourceName:       scraped.SourceName,
		ImageURL:         scraped.ImageURL,
		PrepTimeMinutes:  scraped.PrepTimeMinutes,
		CookTimeMinutes:  scraped.CookTimeMinutes,
		TotalTimeMinutes: scraped.TotalTimeMinutes,
		Servings:         scraped.Servings,
		ServingsUnit:     scraped.ServingsUnit,
		Ingredients:      scraped.Ingredients,
		Instructions:     scraped.Instructions,
		Cuisine:          scraped.Cuisine,
		Course:           scraped.Course,
		DietTags:         scraped.DietTags,
		Nutrition:        scraped.Nutrition,
	}

	if err := h.recipeRepo.Create(r.Context(), recipe); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to save recipe")
		return
	}

	// Log activity
	h.activityRepo.Log(r.Context(), userID, models.DomainCooking, models.ActionCreated, "recipe", &recipe.ID, recipe.Title, "Imported from "+scraped.SourceName)

	JSON(w, http.StatusCreated, recipe)
}

// SearchByIngredients searches recipes by available ingredients
func (h *CookingHandler) SearchByIngredients(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Support both GET (query params) and POST (JSON body)
	var ingredients []string
	var limit int

	if r.Method == http.MethodGet {
		// Parse from query string: ?ingredients=chicken,rice,tomato
		ingredientsStr := r.URL.Query().Get("ingredients")
		if ingredientsStr == "" {
			Error(w, http.StatusBadRequest, "ingredients parameter is required")
			return
		}
		ingredients = strings.Split(ingredientsStr, ",")
		for i := range ingredients {
			ingredients[i] = strings.TrimSpace(ingredients[i])
		}

		if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
				limit = l
			}
		}
	} else {
		var req models.SearchByIngredientsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			Error(w, http.StatusBadRequest, "Invalid request body")
			return
		}
		ingredients = req.Ingredients
		limit = req.Limit
	}

	if len(ingredients) == 0 {
		Error(w, http.StatusBadRequest, "At least one ingredient is required")
		return
	}

	if limit <= 0 {
		limit = 20
	}

	matches, err := h.recipeRepo.SearchByIngredients(r.Context(), userID, ingredients, limit)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to search recipes")
		return
	}

	if matches == nil {
		matches = []*models.RecipeMatch{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"results":            matches,
		"searched_for":       ingredients,
		"total_results":      len(matches),
	})
}

// GetCookingSummary returns the cooking domain summary
func (h *CookingHandler) GetCookingSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	summary, err := h.recipeRepo.GetSummary(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get summary")
		return
	}

	// Get today's meal plans
	today := time.Now().Truncate(24 * time.Hour)
	mealPlans, _ := h.mealPlanRepo.GetByDate(r.Context(), userID, today)
	summary.MealPlansToday = make([]models.MealPlan, len(mealPlans))
	for i, mp := range mealPlans {
		summary.MealPlansToday[i] = *mp
	}

	JSON(w, http.StatusOK, summary)
}

// =============================================================================
// Collection Handlers
// =============================================================================

// ListCollections returns all collections for the user
func (h *CookingHandler) ListCollections(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	collections, err := h.collectionRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch collections")
		return
	}

	if collections == nil {
		collections = []*models.RecipeCollection{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"collections": collections,
	})
}

// GetCollection returns a collection with its recipes
func (h *CookingHandler) GetCollection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid collection ID")
		return
	}

	collection, err := h.collectionRepo.GetByID(r.Context(), collectionID)
	if err != nil {
		Error(w, http.StatusNotFound, "Collection not found")
		return
	}

	if collection.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	recipes, err := h.collectionRepo.GetRecipesInCollection(r.Context(), collectionID)
	if err != nil {
		recipes = []*models.Recipe{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"collection": collection,
		"recipes":    recipes,
	})
}

// CreateCollection creates a new collection
func (h *CookingHandler) CreateCollection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		Error(w, http.StatusBadRequest, "Name is required")
		return
	}

	collection := &models.RecipeCollection{
		UserID:        userID,
		Name:          req.Name,
		Description:   req.Description,
		CoverImageURL: req.CoverImageURL,
	}

	if err := h.collectionRepo.Create(r.Context(), collection); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create collection")
		return
	}

	JSON(w, http.StatusCreated, collection)
}

// UpdateCollection updates a collection
func (h *CookingHandler) UpdateCollection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid collection ID")
		return
	}

	collection, err := h.collectionRepo.GetByID(r.Context(), collectionID)
	if err != nil {
		Error(w, http.StatusNotFound, "Collection not found")
		return
	}

	if collection.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	var req models.CreateCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name != "" {
		collection.Name = req.Name
	}
	collection.Description = req.Description
	collection.CoverImageURL = req.CoverImageURL

	if err := h.collectionRepo.Update(r.Context(), collection); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update collection")
		return
	}

	JSON(w, http.StatusOK, collection)
}

// DeleteCollection deletes a collection
func (h *CookingHandler) DeleteCollection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid collection ID")
		return
	}

	collection, err := h.collectionRepo.GetByID(r.Context(), collectionID)
	if err != nil {
		Error(w, http.StatusNotFound, "Collection not found")
		return
	}

	if collection.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.collectionRepo.Delete(r.Context(), collectionID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete collection")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Collection deleted"})
}

// AddRecipeToCollection adds a recipe to a collection
func (h *CookingHandler) AddRecipeToCollection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid collection ID")
		return
	}

	var req struct {
		RecipeID string `json:"recipe_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	recipeID, err := uuid.Parse(req.RecipeID)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid recipe ID")
		return
	}

	// Verify ownership of both
	collection, err := h.collectionRepo.GetByID(r.Context(), collectionID)
	if err != nil || collection.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	recipe, err := h.recipeRepo.GetByID(r.Context(), recipeID)
	if err != nil || recipe.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.collectionRepo.AddRecipe(r.Context(), collectionID, recipeID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to add recipe to collection")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Recipe added to collection"})
}

// RemoveRecipeFromCollection removes a recipe from a collection
func (h *CookingHandler) RemoveRecipeFromCollection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid collection ID")
		return
	}

	recipeID, err := uuid.Parse(chi.URLParam(r, "recipeId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid recipe ID")
		return
	}

	// Verify ownership
	collection, err := h.collectionRepo.GetByID(r.Context(), collectionID)
	if err != nil || collection.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.collectionRepo.RemoveRecipe(r.Context(), collectionID, recipeID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to remove recipe from collection")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Recipe removed from collection"})
}

// =============================================================================
// Meal Plan Handlers
// =============================================================================

// GetMealPlans returns meal plans for a date range
func (h *CookingHandler) GetMealPlans(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Default to current week
	startStr := r.URL.Query().Get("start_date")
	endStr := r.URL.Query().Get("end_date")

	var startDate, endDate time.Time
	var err error

	if startStr != "" {
		startDate, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid start_date format (use YYYY-MM-DD)")
			return
		}
	} else {
		now := time.Now()
		startDate = now.AddDate(0, 0, -int(now.Weekday()))
	}

	if endStr != "" {
		endDate, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid end_date format (use YYYY-MM-DD)")
			return
		}
	} else {
		endDate = startDate.AddDate(0, 0, 6)
	}

	plans, err := h.mealPlanRepo.GetByDateRange(r.Context(), userID, startDate, endDate)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch meal plans")
		return
	}

	if plans == nil {
		plans = []*models.MealPlan{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"meal_plans": plans,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
	})
}

// CreateMealPlan creates or updates a meal plan entry
func (h *CookingHandler) CreateMealPlan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateMealPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	planDate, err := time.Parse("2006-01-02", req.PlanDate)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid plan_date format (use YYYY-MM-DD)")
		return
	}

	if req.MealType == "" {
		Error(w, http.StatusBadRequest, "meal_type is required")
		return
	}

	plan := &models.MealPlan{
		UserID:     userID,
		PlanDate:   planDate,
		MealType:   req.MealType,
		RecipeID:   req.RecipeID,
		CustomMeal: req.CustomMeal,
		Servings:   req.Servings,
		Notes:      req.Notes,
	}

	if err := h.mealPlanRepo.Create(r.Context(), plan); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create meal plan")
		return
	}

	JSON(w, http.StatusCreated, plan)
}

// DeleteMealPlan deletes a meal plan entry
func (h *CookingHandler) DeleteMealPlan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	planID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid meal plan ID")
		return
	}

	plan, err := h.mealPlanRepo.GetByID(r.Context(), planID)
	if err != nil {
		Error(w, http.StatusNotFound, "Meal plan not found")
		return
	}

	if plan.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.mealPlanRepo.Delete(r.Context(), planID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete meal plan")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Meal plan deleted"})
}

// MarkMealCooked marks a meal plan as cooked
func (h *CookingHandler) MarkMealCooked(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	planID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid meal plan ID")
		return
	}

	plan, err := h.mealPlanRepo.GetByID(r.Context(), planID)
	if err != nil {
		Error(w, http.StatusNotFound, "Meal plan not found")
		return
	}

	if plan.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.mealPlanRepo.MarkCooked(r.Context(), planID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to mark meal as cooked")
		return
	}

	// Log activity
	mealName := plan.CustomMeal
	if plan.Recipe != nil {
		mealName = plan.Recipe.Title
	}
	h.activityRepo.Log(r.Context(), userID, models.DomainCooking, models.ActionCompleted, "meal", &planID, mealName, "Cooked "+mealName)

	JSON(w, http.StatusOK, map[string]string{"message": "Meal marked as cooked"})
}

// GenerateShoppingList generates a shopping list from meal plans
func (h *CookingHandler) GenerateShoppingList(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.GenerateShoppingListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid start_date format")
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid end_date format")
		return
	}

	items, err := h.mealPlanRepo.GetIngredientsForDateRange(r.Context(), userID, startDate, endDate)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate shopping list")
		return
	}

	// Add to shopping list
	for i := range items {
		items[i].UserID = userID
	}

	if err := h.shoppingListRepo.CreateBatch(r.Context(), items); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to save shopping list")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"items_added": len(items),
		"message":     "Shopping list generated",
	})
}

// =============================================================================
// Shopping List Handlers
// =============================================================================

// GetShoppingList returns the shopping list
func (h *CookingHandler) GetShoppingList(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	items, err := h.shoppingListRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch shopping list")
		return
	}

	if items == nil {
		items = []*models.ShoppingListItem{}
	}

	total, unchecked, _ := h.shoppingListRepo.CountByUser(r.Context(), userID)

	JSON(w, http.StatusOK, map[string]interface{}{
		"items":     items,
		"total":     total,
		"unchecked": unchecked,
	})
}

// AddShoppingItem adds an item to the shopping list
func (h *CookingHandler) AddShoppingItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.AddShoppingItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.IngredientName == "" {
		Error(w, http.StatusBadRequest, "ingredient_name is required")
		return
	}

	item := &models.ShoppingListItem{
		UserID:         userID,
		IngredientName: req.IngredientName,
		Amount:         req.Amount,
		Unit:           req.Unit,
		Category:       req.Category,
		RecipeID:       req.RecipeID,
	}

	if err := h.shoppingListRepo.Create(r.Context(), item); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to add item")
		return
	}

	JSON(w, http.StatusCreated, item)
}

// ToggleShoppingItem toggles the checked status
func (h *CookingHandler) ToggleShoppingItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	_ = userID // For future ownership check

	itemID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid item ID")
		return
	}

	isChecked, err := h.shoppingListRepo.ToggleChecked(r.Context(), itemID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to toggle item")
		return
	}

	JSON(w, http.StatusOK, map[string]bool{"is_checked": isChecked})
}

// DeleteShoppingItem deletes a shopping list item
func (h *CookingHandler) DeleteShoppingItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	_ = userID // For future ownership check

	itemID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid item ID")
		return
	}

	if err := h.shoppingListRepo.Delete(r.Context(), itemID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete item")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Item deleted"})
}

// ClearCheckedItems removes all checked items
func (h *CookingHandler) ClearCheckedItems(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	count, err := h.shoppingListRepo.DeleteChecked(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to clear checked items")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"message":       "Checked items cleared",
		"items_removed": count,
	})
}
