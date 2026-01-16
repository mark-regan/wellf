package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

type ShoppingListRepository struct {
	pool *pgxpool.Pool
}

func NewShoppingListRepository(pool *pgxpool.Pool) *ShoppingListRepository {
	return &ShoppingListRepository{pool: pool}
}

// Create adds a new item to the shopping list
func (r *ShoppingListRepository) Create(ctx context.Context, item *models.ShoppingListItem) error {
	query := `
		INSERT INTO shopping_list_items (id, user_id, ingredient_name, amount, unit, category, recipe_id, meal_plan_id, is_checked, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	item.ID = uuid.New()
	item.CreatedAt = time.Now()

	// Get next sort order
	var maxOrder int
	r.pool.QueryRow(ctx, `SELECT COALESCE(MAX(sort_order), 0) FROM shopping_list_items WHERE user_id = $1`, item.UserID).Scan(&maxOrder)
	item.SortOrder = maxOrder + 1

	_, err := r.pool.Exec(ctx, query,
		item.ID,
		item.UserID,
		item.IngredientName,
		item.Amount,
		item.Unit,
		item.Category,
		item.RecipeID,
		item.MealPlanID,
		item.IsChecked,
		item.SortOrder,
		item.CreatedAt,
	)

	return err
}

// CreateBatch adds multiple items to the shopping list
func (r *ShoppingListRepository) CreateBatch(ctx context.Context, items []models.ShoppingListItem) error {
	for i := range items {
		if err := r.Create(ctx, &items[i]); err != nil {
			return err
		}
	}
	return nil
}

// GetByUserID retrieves all shopping list items for a user
func (r *ShoppingListRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.ShoppingListItem, error) {
	query := `
		SELECT si.id, si.user_id, si.ingredient_name, si.amount, si.unit, si.category,
			si.recipe_id, si.meal_plan_id, si.is_checked, si.sort_order, si.created_at,
			r.title as recipe_name
		FROM shopping_list_items si
		LEFT JOIN recipes r ON si.recipe_id = r.id
		WHERE si.user_id = $1
		ORDER BY si.is_checked ASC, si.category ASC, si.sort_order ASC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*models.ShoppingListItem
	for rows.Next() {
		var item models.ShoppingListItem
		var recipeName *string

		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.IngredientName,
			&item.Amount,
			&item.Unit,
			&item.Category,
			&item.RecipeID,
			&item.MealPlanID,
			&item.IsChecked,
			&item.SortOrder,
			&item.CreatedAt,
			&recipeName,
		)
		if err != nil {
			return nil, err
		}

		if recipeName != nil {
			item.RecipeName = *recipeName
		}

		items = append(items, &item)
	}

	return items, rows.Err()
}

// GetUnchecked retrieves unchecked shopping list items for a user
func (r *ShoppingListRepository) GetUnchecked(ctx context.Context, userID uuid.UUID) ([]*models.ShoppingListItem, error) {
	query := `
		SELECT si.id, si.user_id, si.ingredient_name, si.amount, si.unit, si.category,
			si.recipe_id, si.meal_plan_id, si.is_checked, si.sort_order, si.created_at,
			r.title as recipe_name
		FROM shopping_list_items si
		LEFT JOIN recipes r ON si.recipe_id = r.id
		WHERE si.user_id = $1 AND si.is_checked = false
		ORDER BY si.category ASC, si.sort_order ASC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*models.ShoppingListItem
	for rows.Next() {
		var item models.ShoppingListItem
		var recipeName *string

		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.IngredientName,
			&item.Amount,
			&item.Unit,
			&item.Category,
			&item.RecipeID,
			&item.MealPlanID,
			&item.IsChecked,
			&item.SortOrder,
			&item.CreatedAt,
			&recipeName,
		)
		if err != nil {
			return nil, err
		}

		if recipeName != nil {
			item.RecipeName = *recipeName
		}

		items = append(items, &item)
	}

	return items, rows.Err()
}

// Update updates a shopping list item
func (r *ShoppingListRepository) Update(ctx context.Context, item *models.ShoppingListItem) error {
	query := `
		UPDATE shopping_list_items SET
			ingredient_name = $2, amount = $3, unit = $4, category = $5, is_checked = $6, sort_order = $7
		WHERE id = $1
	`

	_, err := r.pool.Exec(ctx, query,
		item.ID,
		item.IngredientName,
		item.Amount,
		item.Unit,
		item.Category,
		item.IsChecked,
		item.SortOrder,
	)

	return err
}

// ToggleChecked toggles the checked status of an item
func (r *ShoppingListRepository) ToggleChecked(ctx context.Context, id uuid.UUID) (bool, error) {
	query := `UPDATE shopping_list_items SET is_checked = NOT is_checked WHERE id = $1 RETURNING is_checked`

	var isChecked bool
	err := r.pool.QueryRow(ctx, query, id).Scan(&isChecked)
	return isChecked, err
}

// Delete removes a shopping list item
func (r *ShoppingListRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM shopping_list_items WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

// DeleteChecked removes all checked items for a user
func (r *ShoppingListRepository) DeleteChecked(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `DELETE FROM shopping_list_items WHERE user_id = $1 AND is_checked = true`
	result, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

// ClearAll removes all items for a user
func (r *ShoppingListRepository) ClearAll(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM shopping_list_items WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// CountByUser returns counts of total and unchecked items
func (r *ShoppingListRepository) CountByUser(ctx context.Context, userID uuid.UUID) (total int, unchecked int, err error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_checked = false) as unchecked
		FROM shopping_list_items
		WHERE user_id = $1
	`

	err = r.pool.QueryRow(ctx, query, userID).Scan(&total, &unchecked)
	return
}

// GetByCategory retrieves shopping list items grouped by category
func (r *ShoppingListRepository) GetByCategory(ctx context.Context, userID uuid.UUID) (map[string][]*models.ShoppingListItem, error) {
	items, err := r.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	grouped := make(map[string][]*models.ShoppingListItem)
	for _, item := range items {
		category := item.Category
		if category == "" {
			category = "other"
		}
		grouped[category] = append(grouped[category], item)
	}

	return grouped, nil
}
