package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

type RecipeRepository struct {
	pool *pgxpool.Pool
}

func NewRecipeRepository(pool *pgxpool.Pool) *RecipeRepository {
	return &RecipeRepository{pool: pool}
}

// Create creates a new recipe
func (r *RecipeRepository) Create(ctx context.Context, recipe *models.Recipe) error {
	query := `
		INSERT INTO recipes (
			id, user_id, title, description, source_url, source_name, image_url,
			prep_time_minutes, cook_time_minutes, total_time_minutes,
			servings, servings_unit, ingredients, instructions,
			cuisine, course, diet_tags, custom_tags,
			rating, notes, is_favourite, times_cooked, last_cooked_at,
			nutrition, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
		)
	`

	recipe.ID = uuid.New()
	recipe.CreatedAt = time.Now()
	recipe.UpdatedAt = time.Now()

	ingredientsJSON, _ := json.Marshal(recipe.Ingredients)
	instructionsJSON, _ := json.Marshal(recipe.Instructions)
	nutritionJSON, _ := json.Marshal(recipe.Nutrition)

	_, err := r.pool.Exec(ctx, query,
		recipe.ID,
		recipe.UserID,
		recipe.Title,
		recipe.Description,
		recipe.SourceURL,
		recipe.SourceName,
		recipe.ImageURL,
		recipe.PrepTimeMinutes,
		recipe.CookTimeMinutes,
		recipe.TotalTimeMinutes,
		recipe.Servings,
		recipe.ServingsUnit,
		ingredientsJSON,
		instructionsJSON,
		recipe.Cuisine,
		recipe.Course,
		recipe.DietTags,
		recipe.CustomTags,
		recipe.Rating,
		recipe.Notes,
		recipe.IsFavourite,
		recipe.TimesCooked,
		recipe.LastCookedAt,
		nutritionJSON,
		recipe.CreatedAt,
		recipe.UpdatedAt,
	)

	return err
}

// GetByID retrieves a recipe by ID
func (r *RecipeRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Recipe, error) {
	query := `
		SELECT id, user_id, title, description, source_url, source_name, image_url,
			prep_time_minutes, cook_time_minutes, total_time_minutes,
			servings, servings_unit, ingredients, instructions,
			cuisine, course, diet_tags, custom_tags,
			rating, notes, is_favourite, times_cooked, last_cooked_at,
			nutrition, created_at, updated_at
		FROM recipes
		WHERE id = $1
	`

	return r.scanRecipe(r.pool.QueryRow(ctx, query, id))
}

// GetByUserID retrieves all recipes for a user
func (r *RecipeRepository) GetByUserID(ctx context.Context, userID uuid.UUID, filters RecipeFilters) ([]*models.Recipe, error) {
	query := `
		SELECT id, user_id, title, description, source_url, source_name, image_url,
			prep_time_minutes, cook_time_minutes, total_time_minutes,
			servings, servings_unit, ingredients, instructions,
			cuisine, course, diet_tags, custom_tags,
			rating, notes, is_favourite, times_cooked, last_cooked_at,
			nutrition, created_at, updated_at
		FROM recipes
		WHERE user_id = $1
	`

	args := []interface{}{userID}
	argNum := 2

	if filters.Search != "" {
		query += fmt.Sprintf(` AND (LOWER(title) LIKE $%d OR LOWER(description) LIKE $%d)`, argNum, argNum)
		args = append(args, "%"+strings.ToLower(filters.Search)+"%")
		argNum++
	}

	if filters.Course != "" {
		query += fmt.Sprintf(` AND course = $%d`, argNum)
		args = append(args, filters.Course)
		argNum++
	}

	if filters.Cuisine != "" {
		query += fmt.Sprintf(` AND cuisine = $%d`, argNum)
		args = append(args, filters.Cuisine)
		argNum++
	}

	if filters.FavouritesOnly {
		query += ` AND is_favourite = true`
	}

	// Order by
	switch filters.SortBy {
	case "title":
		query += ` ORDER BY title ASC`
	case "rating":
		query += ` ORDER BY rating DESC NULLS LAST`
	case "times_cooked":
		query += ` ORDER BY times_cooked DESC`
	case "last_cooked":
		query += ` ORDER BY last_cooked_at DESC NULLS LAST`
	default:
		query += ` ORDER BY created_at DESC`
	}

	if filters.Limit > 0 {
		query += fmt.Sprintf(` LIMIT %d`, filters.Limit)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRecipes(rows)
}

// Update updates an existing recipe
func (r *RecipeRepository) Update(ctx context.Context, recipe *models.Recipe) error {
	query := `
		UPDATE recipes SET
			title = $2, description = $3, source_url = $4, source_name = $5, image_url = $6,
			prep_time_minutes = $7, cook_time_minutes = $8, total_time_minutes = $9,
			servings = $10, servings_unit = $11, ingredients = $12, instructions = $13,
			cuisine = $14, course = $15, diet_tags = $16, custom_tags = $17,
			rating = $18, notes = $19, is_favourite = $20, times_cooked = $21, last_cooked_at = $22,
			nutrition = $23, updated_at = $24
		WHERE id = $1
	`

	recipe.UpdatedAt = time.Now()

	ingredientsJSON, _ := json.Marshal(recipe.Ingredients)
	instructionsJSON, _ := json.Marshal(recipe.Instructions)
	nutritionJSON, _ := json.Marshal(recipe.Nutrition)

	_, err := r.pool.Exec(ctx, query,
		recipe.ID,
		recipe.Title,
		recipe.Description,
		recipe.SourceURL,
		recipe.SourceName,
		recipe.ImageURL,
		recipe.PrepTimeMinutes,
		recipe.CookTimeMinutes,
		recipe.TotalTimeMinutes,
		recipe.Servings,
		recipe.ServingsUnit,
		ingredientsJSON,
		instructionsJSON,
		recipe.Cuisine,
		recipe.Course,
		recipe.DietTags,
		recipe.CustomTags,
		recipe.Rating,
		recipe.Notes,
		recipe.IsFavourite,
		recipe.TimesCooked,
		recipe.LastCookedAt,
		nutritionJSON,
		recipe.UpdatedAt,
	)

	return err
}

// Delete deletes a recipe
func (r *RecipeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM recipes WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

// MarkCooked increments the times_cooked counter and updates last_cooked_at
func (r *RecipeRepository) MarkCooked(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE recipes SET
			times_cooked = times_cooked + 1,
			last_cooked_at = $2,
			updated_at = $2
		WHERE id = $1
	`

	now := time.Now()
	_, err := r.pool.Exec(ctx, query, id, now)
	return err
}

// ToggleFavourite toggles the favourite status
func (r *RecipeRepository) ToggleFavourite(ctx context.Context, id uuid.UUID) (bool, error) {
	query := `
		UPDATE recipes SET
			is_favourite = NOT is_favourite,
			updated_at = $2
		WHERE id = $1
		RETURNING is_favourite
	`

	var isFavourite bool
	err := r.pool.QueryRow(ctx, query, id, time.Now()).Scan(&isFavourite)
	return isFavourite, err
}

// GetFavourites returns favourite recipes for a user
func (r *RecipeRepository) GetFavourites(ctx context.Context, userID uuid.UUID, limit int) ([]*models.Recipe, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, user_id, title, description, source_url, source_name, image_url,
			prep_time_minutes, cook_time_minutes, total_time_minutes,
			servings, servings_unit, ingredients, instructions,
			cuisine, course, diet_tags, custom_tags,
			rating, notes, is_favourite, times_cooked, last_cooked_at,
			nutrition, created_at, updated_at
		FROM recipes
		WHERE user_id = $1 AND is_favourite = true
		ORDER BY updated_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRecipes(rows)
}

// GetRecent returns recently added or cooked recipes
func (r *RecipeRepository) GetRecent(ctx context.Context, userID uuid.UUID, limit int) ([]*models.Recipe, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT id, user_id, title, description, source_url, source_name, image_url,
			prep_time_minutes, cook_time_minutes, total_time_minutes,
			servings, servings_unit, ingredients, instructions,
			cuisine, course, diet_tags, custom_tags,
			rating, notes, is_favourite, times_cooked, last_cooked_at,
			nutrition, created_at, updated_at
		FROM recipes
		WHERE user_id = $1
		ORDER BY COALESCE(last_cooked_at, created_at) DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRecipes(rows)
}

// CountByUser returns the total number of recipes for a user
func (r *RecipeRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM recipes WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}

// CountFavouritesByUser returns the number of favourite recipes for a user
func (r *RecipeRepository) CountFavouritesByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM recipes WHERE user_id = $1 AND is_favourite = true`, userID).Scan(&count)
	return count, err
}

// GetSummary returns a summary of cooking data for the hub
func (r *RecipeRepository) GetSummary(ctx context.Context, userID uuid.UUID) (*models.CookingSummary, error) {
	summary := &models.CookingSummary{}

	// Get total recipes
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM recipes WHERE user_id = $1`, userID).Scan(&summary.TotalRecipes); err != nil {
		return nil, err
	}

	// Get favourite count
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM recipes WHERE user_id = $1 AND is_favourite = true`, userID).Scan(&summary.FavouriteRecipes); err != nil {
		return nil, err
	}

	// Get recipes cooked this week
	weekAgo := time.Now().AddDate(0, 0, -7)
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM recipes WHERE user_id = $1 AND last_cooked_at >= $2`, userID, weekAgo).Scan(&summary.RecipesThisWeek); err != nil {
		return nil, err
	}

	return summary, nil
}

// Helper function to scan a single recipe
func (r *RecipeRepository) scanRecipe(row pgx.Row) (*models.Recipe, error) {
	var recipe models.Recipe
	var ingredientsJSON, instructionsJSON, nutritionJSON []byte
	var dietTags, customTags []string

	err := row.Scan(
		&recipe.ID,
		&recipe.UserID,
		&recipe.Title,
		&recipe.Description,
		&recipe.SourceURL,
		&recipe.SourceName,
		&recipe.ImageURL,
		&recipe.PrepTimeMinutes,
		&recipe.CookTimeMinutes,
		&recipe.TotalTimeMinutes,
		&recipe.Servings,
		&recipe.ServingsUnit,
		&ingredientsJSON,
		&instructionsJSON,
		&recipe.Cuisine,
		&recipe.Course,
		&dietTags,
		&customTags,
		&recipe.Rating,
		&recipe.Notes,
		&recipe.IsFavourite,
		&recipe.TimesCooked,
		&recipe.LastCookedAt,
		&nutritionJSON,
		&recipe.CreatedAt,
		&recipe.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	json.Unmarshal(ingredientsJSON, &recipe.Ingredients)
	json.Unmarshal(instructionsJSON, &recipe.Instructions)
	json.Unmarshal(nutritionJSON, &recipe.Nutrition)
	recipe.DietTags = dietTags
	recipe.CustomTags = customTags

	return &recipe, nil
}

// Helper function to scan multiple recipes
func (r *RecipeRepository) scanRecipes(rows pgx.Rows) ([]*models.Recipe, error) {
	var recipes []*models.Recipe

	for rows.Next() {
		var recipe models.Recipe
		var ingredientsJSON, instructionsJSON, nutritionJSON []byte
		var dietTags, customTags []string

		err := rows.Scan(
			&recipe.ID,
			&recipe.UserID,
			&recipe.Title,
			&recipe.Description,
			&recipe.SourceURL,
			&recipe.SourceName,
			&recipe.ImageURL,
			&recipe.PrepTimeMinutes,
			&recipe.CookTimeMinutes,
			&recipe.TotalTimeMinutes,
			&recipe.Servings,
			&recipe.ServingsUnit,
			&ingredientsJSON,
			&instructionsJSON,
			&recipe.Cuisine,
			&recipe.Course,
			&dietTags,
			&customTags,
			&recipe.Rating,
			&recipe.Notes,
			&recipe.IsFavourite,
			&recipe.TimesCooked,
			&recipe.LastCookedAt,
			&nutritionJSON,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal(ingredientsJSON, &recipe.Ingredients)
		json.Unmarshal(instructionsJSON, &recipe.Instructions)
		json.Unmarshal(nutritionJSON, &recipe.Nutrition)
		recipe.DietTags = dietTags
		recipe.CustomTags = customTags

		recipes = append(recipes, &recipe)
	}

	return recipes, rows.Err()
}

// RecipeFilters contains filter options for querying recipes
type RecipeFilters struct {
	Search         string
	Course         string
	Cuisine        string
	FavouritesOnly bool
	DietTags       []string
	Ingredients    []string // search by ingredients
	SortBy         string   // "created", "title", "rating", "times_cooked", "last_cooked"
	Limit          int
}

// SearchByIngredients finds recipes that contain the specified ingredients
// It returns recipes sorted by how many of the searched ingredients they contain
func (r *RecipeRepository) SearchByIngredients(ctx context.Context, userID uuid.UUID, ingredients []string, limit int) ([]*models.RecipeMatch, error) {
	if len(ingredients) == 0 {
		return nil, nil
	}

	if limit <= 0 {
		limit = 20
	}

	// Build a query that counts matching ingredients for each recipe
	// Uses JSONB containment operators to search within the ingredients array
	query := `
		WITH ingredient_matches AS (
			SELECT
				r.id,
				r.user_id,
				r.title,
				r.description,
				r.source_url,
				r.source_name,
				r.image_url,
				r.prep_time_minutes,
				r.cook_time_minutes,
				r.total_time_minutes,
				r.servings,
				r.servings_unit,
				r.ingredients,
				r.instructions,
				r.cuisine,
				r.course,
				r.diet_tags,
				r.custom_tags,
				r.rating,
				r.notes,
				r.is_favourite,
				r.times_cooked,
				r.last_cooked_at,
				r.nutrition,
				r.created_at,
				r.updated_at,
				(
					SELECT COUNT(*)
					FROM unnest($2::text[]) AS search_ing
					WHERE EXISTS (
						SELECT 1
						FROM jsonb_array_elements(r.ingredients) AS ing
						WHERE LOWER(ing->>'name') LIKE '%' || LOWER(search_ing) || '%'
					)
				) AS match_count
			FROM recipes r
			WHERE r.user_id = $1
		)
		SELECT
			id, user_id, title, description, source_url, source_name, image_url,
			prep_time_minutes, cook_time_minutes, total_time_minutes,
			servings, servings_unit, ingredients, instructions,
			cuisine, course, diet_tags, custom_tags,
			rating, notes, is_favourite, times_cooked, last_cooked_at,
			nutrition, created_at, updated_at, match_count
		FROM ingredient_matches
		WHERE match_count > 0
		ORDER BY match_count DESC, times_cooked DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, userID, ingredients, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*models.RecipeMatch
	for rows.Next() {
		var recipe models.Recipe
		var ingredientsJSON, instructionsJSON, nutritionJSON []byte
		var dietTags, customTags []string
		var matchCount int

		err := rows.Scan(
			&recipe.ID,
			&recipe.UserID,
			&recipe.Title,
			&recipe.Description,
			&recipe.SourceURL,
			&recipe.SourceName,
			&recipe.ImageURL,
			&recipe.PrepTimeMinutes,
			&recipe.CookTimeMinutes,
			&recipe.TotalTimeMinutes,
			&recipe.Servings,
			&recipe.ServingsUnit,
			&ingredientsJSON,
			&instructionsJSON,
			&recipe.Cuisine,
			&recipe.Course,
			&dietTags,
			&customTags,
			&recipe.Rating,
			&recipe.Notes,
			&recipe.IsFavourite,
			&recipe.TimesCooked,
			&recipe.LastCookedAt,
			&nutritionJSON,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
			&matchCount,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal(ingredientsJSON, &recipe.Ingredients)
		json.Unmarshal(instructionsJSON, &recipe.Instructions)
		json.Unmarshal(nutritionJSON, &recipe.Nutrition)
		recipe.DietTags = dietTags
		recipe.CustomTags = customTags

		results = append(results, &models.RecipeMatch{
			Recipe:           &recipe,
			MatchingCount:    matchCount,
			TotalIngredients: len(ingredients),
		})
	}

	return results, rows.Err()
}
