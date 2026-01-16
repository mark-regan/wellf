package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

type MealPlanRepository struct {
	pool *pgxpool.Pool
}

func NewMealPlanRepository(pool *pgxpool.Pool) *MealPlanRepository {
	return &MealPlanRepository{pool: pool}
}

// Create creates or updates a meal plan entry
func (r *MealPlanRepository) Create(ctx context.Context, plan *models.MealPlan) error {
	query := `
		INSERT INTO meal_plans (id, user_id, plan_date, meal_type, recipe_id, custom_meal, servings, notes, is_cooked, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, plan_date, meal_type) DO UPDATE SET
			recipe_id = EXCLUDED.recipe_id,
			custom_meal = EXCLUDED.custom_meal,
			servings = EXCLUDED.servings,
			notes = EXCLUDED.notes
	`

	plan.ID = uuid.New()
	plan.CreatedAt = time.Now()

	if plan.Servings == 0 {
		plan.Servings = 1
	}

	_, err := r.pool.Exec(ctx, query,
		plan.ID,
		plan.UserID,
		plan.PlanDate,
		plan.MealType,
		plan.RecipeID,
		plan.CustomMeal,
		plan.Servings,
		plan.Notes,
		plan.IsCooked,
		plan.CreatedAt,
	)

	return err
}

// GetByID retrieves a meal plan entry by ID
func (r *MealPlanRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.MealPlan, error) {
	query := `
		SELECT mp.id, mp.user_id, mp.plan_date, mp.meal_type, mp.recipe_id, mp.custom_meal,
			mp.servings, mp.notes, mp.is_cooked, mp.created_at,
			r.id, r.title, r.image_url, r.total_time_minutes
		FROM meal_plans mp
		LEFT JOIN recipes r ON mp.recipe_id = r.id
		WHERE mp.id = $1
	`

	var plan models.MealPlan
	var recipeID *uuid.UUID
	var recipeTitle, recipeImage *string
	var recipeTotalTime *int

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&plan.ID,
		&plan.UserID,
		&plan.PlanDate,
		&plan.MealType,
		&plan.RecipeID,
		&plan.CustomMeal,
		&plan.Servings,
		&plan.Notes,
		&plan.IsCooked,
		&plan.CreatedAt,
		&recipeID,
		&recipeTitle,
		&recipeImage,
		&recipeTotalTime,
	)
	if err != nil {
		return nil, err
	}

	if recipeID != nil {
		plan.Recipe = &models.Recipe{
			ID:               *recipeID,
			Title:            *recipeTitle,
			ImageURL:         stringValue(recipeImage),
			TotalTimeMinutes: recipeTotalTime,
		}
	}

	return &plan, nil
}

// GetByDateRange retrieves meal plans for a date range
func (r *MealPlanRepository) GetByDateRange(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) ([]*models.MealPlan, error) {
	query := `
		SELECT mp.id, mp.user_id, mp.plan_date, mp.meal_type, mp.recipe_id, mp.custom_meal,
			mp.servings, mp.notes, mp.is_cooked, mp.created_at,
			r.id, r.title, r.image_url, r.total_time_minutes
		FROM meal_plans mp
		LEFT JOIN recipes r ON mp.recipe_id = r.id
		WHERE mp.user_id = $1 AND mp.plan_date >= $2 AND mp.plan_date <= $3
		ORDER BY mp.plan_date ASC,
			CASE mp.meal_type
				WHEN 'breakfast' THEN 1
				WHEN 'lunch' THEN 2
				WHEN 'dinner' THEN 3
				WHEN 'snack' THEN 4
			END
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []*models.MealPlan
	for rows.Next() {
		var plan models.MealPlan
		var recipeID *uuid.UUID
		var recipeTitle, recipeImage *string
		var recipeTotalTime *int

		err := rows.Scan(
			&plan.ID,
			&plan.UserID,
			&plan.PlanDate,
			&plan.MealType,
			&plan.RecipeID,
			&plan.CustomMeal,
			&plan.Servings,
			&plan.Notes,
			&plan.IsCooked,
			&plan.CreatedAt,
			&recipeID,
			&recipeTitle,
			&recipeImage,
			&recipeTotalTime,
		)
		if err != nil {
			return nil, err
		}

		if recipeID != nil {
			plan.Recipe = &models.Recipe{
				ID:               *recipeID,
				Title:            *recipeTitle,
				ImageURL:         stringValue(recipeImage),
				TotalTimeMinutes: recipeTotalTime,
			}
		}

		plans = append(plans, &plan)
	}

	return plans, rows.Err()
}

// GetByDate retrieves all meal plans for a specific date
func (r *MealPlanRepository) GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) ([]*models.MealPlan, error) {
	return r.GetByDateRange(ctx, userID, date, date)
}

// Delete removes a meal plan entry
func (r *MealPlanRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM meal_plans WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

// MarkCooked marks a meal plan as cooked and also marks the recipe if linked
func (r *MealPlanRepository) MarkCooked(ctx context.Context, id uuid.UUID) error {
	// First get the meal plan to check for recipe
	plan, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Mark the meal plan as cooked
	query := `UPDATE meal_plans SET is_cooked = true WHERE id = $1`
	_, err = r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	// If there's a linked recipe, mark it as cooked too
	if plan.RecipeID != nil {
		recipeQuery := `
			UPDATE recipes SET
				times_cooked = times_cooked + 1,
				last_cooked_at = $2,
				updated_at = $2
			WHERE id = $1
		`
		_, err = r.pool.Exec(ctx, recipeQuery, *plan.RecipeID, time.Now())
	}

	return err
}

// GetIngredientsForDateRange returns all ingredients needed for meal plans in a date range
func (r *MealPlanRepository) GetIngredientsForDateRange(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) ([]models.ShoppingListItem, error) {
	query := `
		SELECT r.id, r.title, r.ingredients, mp.servings, r.servings
		FROM meal_plans mp
		INNER JOIN recipes r ON mp.recipe_id = r.id
		WHERE mp.user_id = $1
			AND mp.plan_date >= $2
			AND mp.plan_date <= $3
			AND mp.is_cooked = false
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.ShoppingListItem
	for rows.Next() {
		var recipeID uuid.UUID
		var recipeTitle string
		var ingredientsJSON []byte
		var planServings, recipeServings *int

		err := rows.Scan(&recipeID, &recipeTitle, &ingredientsJSON, &planServings, &recipeServings)
		if err != nil {
			return nil, err
		}

		var ingredients []models.Ingredient
		json.Unmarshal(ingredientsJSON, &ingredients)

		// Calculate serving multiplier
		multiplier := 1.0
		if planServings != nil && recipeServings != nil && *recipeServings > 0 {
			multiplier = float64(*planServings) / float64(*recipeServings)
		}

		for _, ing := range ingredients {
			item := models.ShoppingListItem{
				ID:             uuid.New(),
				UserID:         userID,
				IngredientName: ing.Name,
				Amount:         multiplyIngredientAmount(ing.Amount, multiplier),
				Unit:           ing.Unit,
				RecipeID:       &recipeID,
				RecipeName:     recipeTitle,
			}
			items = append(items, item)
		}
	}

	return items, rows.Err()
}

// CountMealsThisWeek returns the count of planned meals for the current week
func (r *MealPlanRepository) CountMealsThisWeek(ctx context.Context, userID uuid.UUID) (int, error) {
	now := time.Now()
	startOfWeek := now.AddDate(0, 0, -int(now.Weekday()))
	endOfWeek := startOfWeek.AddDate(0, 0, 6)

	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM meal_plans WHERE user_id = $1 AND plan_date >= $2 AND plan_date <= $3`,
		userID, startOfWeek, endOfWeek,
	).Scan(&count)

	return count, err
}

// Helper to convert *string to string
func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// multiplyIngredientAmount multiplies an ingredient amount string by a multiplier
// Handles various formats: "2", "1.5", "1/2", "2-3", "2 cups", etc.
func multiplyIngredientAmount(amount string, multiplier float64) string {
	if multiplier == 1.0 || amount == "" {
		return amount
	}

	amount = strings.TrimSpace(amount)

	// Try to parse as a simple number
	if num, err := strconv.ParseFloat(amount, 64); err == nil {
		result := num * multiplier
		return formatAmount(result)
	}

	// Try to find a number at the start of the string (e.g., "2 cups")
	re := regexp.MustCompile(`^(\d+(?:\.\d+)?)\s*(.*)$`)
	if matches := re.FindStringSubmatch(amount); len(matches) == 3 {
		if num, err := strconv.ParseFloat(matches[1], 64); err == nil {
			result := num * multiplier
			suffix := matches[2]
			if suffix != "" {
				return fmt.Sprintf("%s %s", formatAmount(result), suffix)
			}
			return formatAmount(result)
		}
	}

	// Try to handle fractions (e.g., "1/2", "3/4")
	fractionRe := regexp.MustCompile(`^(\d+)/(\d+)\s*(.*)$`)
	if matches := fractionRe.FindStringSubmatch(amount); len(matches) == 4 {
		numerator, _ := strconv.ParseFloat(matches[1], 64)
		denominator, _ := strconv.ParseFloat(matches[2], 64)
		if denominator > 0 {
			result := (numerator / denominator) * multiplier
			suffix := matches[3]
			if suffix != "" {
				return fmt.Sprintf("%s %s", formatAmount(result), suffix)
			}
			return formatAmount(result)
		}
	}

	// Try to handle mixed fractions (e.g., "1 1/2")
	mixedRe := regexp.MustCompile(`^(\d+)\s+(\d+)/(\d+)\s*(.*)$`)
	if matches := mixedRe.FindStringSubmatch(amount); len(matches) == 5 {
		whole, _ := strconv.ParseFloat(matches[1], 64)
		numerator, _ := strconv.ParseFloat(matches[2], 64)
		denominator, _ := strconv.ParseFloat(matches[3], 64)
		if denominator > 0 {
			result := (whole + numerator/denominator) * multiplier
			suffix := matches[4]
			if suffix != "" {
				return fmt.Sprintf("%s %s", formatAmount(result), suffix)
			}
			return formatAmount(result)
		}
	}

	// Try to handle ranges (e.g., "2-3")
	rangeRe := regexp.MustCompile(`^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\s*(.*)$`)
	if matches := rangeRe.FindStringSubmatch(amount); len(matches) == 4 {
		low, _ := strconv.ParseFloat(matches[1], 64)
		high, _ := strconv.ParseFloat(matches[2], 64)
		resultLow := low * multiplier
		resultHigh := high * multiplier
		suffix := matches[3]
		if suffix != "" {
			return fmt.Sprintf("%s-%s %s", formatAmount(resultLow), formatAmount(resultHigh), suffix)
		}
		return fmt.Sprintf("%s-%s", formatAmount(resultLow), formatAmount(resultHigh))
	}

	// If we can't parse it, return the original with a multiplier note
	return fmt.Sprintf("%s (x%.1f)", amount, multiplier)
}

// formatAmount formats a float as a clean string (removes trailing zeros)
func formatAmount(f float64) string {
	if f == float64(int(f)) {
		return strconv.Itoa(int(f))
	}
	// Round to 2 decimal places and remove trailing zeros
	s := strconv.FormatFloat(f, 'f', 2, 64)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	return s
}
