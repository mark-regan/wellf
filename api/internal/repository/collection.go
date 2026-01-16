package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

type CollectionRepository struct {
	pool *pgxpool.Pool
}

func NewCollectionRepository(pool *pgxpool.Pool) *CollectionRepository {
	return &CollectionRepository{pool: pool}
}

// Create creates a new recipe collection
func (r *CollectionRepository) Create(ctx context.Context, collection *models.RecipeCollection) error {
	query := `
		INSERT INTO recipe_collections (id, user_id, name, description, cover_image_url, is_default, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	collection.ID = uuid.New()
	collection.CreatedAt = time.Now()
	collection.UpdatedAt = time.Now()

	_, err := r.pool.Exec(ctx, query,
		collection.ID,
		collection.UserID,
		collection.Name,
		collection.Description,
		collection.CoverImageURL,
		collection.IsDefault,
		collection.CreatedAt,
		collection.UpdatedAt,
	)

	return err
}

// GetByID retrieves a collection by ID with recipe count
func (r *CollectionRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.RecipeCollection, error) {
	query := `
		SELECT c.id, c.user_id, c.name, c.description, c.cover_image_url, c.is_default, c.created_at, c.updated_at,
			(SELECT COUNT(*) FROM recipe_collection_items WHERE collection_id = c.id) as recipe_count
		FROM recipe_collections c
		WHERE c.id = $1
	`

	var collection models.RecipeCollection
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&collection.ID,
		&collection.UserID,
		&collection.Name,
		&collection.Description,
		&collection.CoverImageURL,
		&collection.IsDefault,
		&collection.CreatedAt,
		&collection.UpdatedAt,
		&collection.RecipeCount,
	)
	if err != nil {
		return nil, err
	}

	return &collection, nil
}

// GetByUserID retrieves all collections for a user
func (r *CollectionRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.RecipeCollection, error) {
	query := `
		SELECT c.id, c.user_id, c.name, c.description, c.cover_image_url, c.is_default, c.created_at, c.updated_at,
			(SELECT COUNT(*) FROM recipe_collection_items WHERE collection_id = c.id) as recipe_count
		FROM recipe_collections c
		WHERE c.user_id = $1
		ORDER BY c.is_default DESC, c.name ASC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []*models.RecipeCollection
	for rows.Next() {
		var collection models.RecipeCollection
		err := rows.Scan(
			&collection.ID,
			&collection.UserID,
			&collection.Name,
			&collection.Description,
			&collection.CoverImageURL,
			&collection.IsDefault,
			&collection.CreatedAt,
			&collection.UpdatedAt,
			&collection.RecipeCount,
		)
		if err != nil {
			return nil, err
		}
		collections = append(collections, &collection)
	}

	return collections, rows.Err()
}

// Update updates a collection
func (r *CollectionRepository) Update(ctx context.Context, collection *models.RecipeCollection) error {
	query := `
		UPDATE recipe_collections SET
			name = $2, description = $3, cover_image_url = $4, updated_at = $5
		WHERE id = $1
	`

	collection.UpdatedAt = time.Now()
	_, err := r.pool.Exec(ctx, query,
		collection.ID,
		collection.Name,
		collection.Description,
		collection.CoverImageURL,
		collection.UpdatedAt,
	)

	return err
}

// Delete deletes a collection
func (r *CollectionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM recipe_collections WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

// AddRecipe adds a recipe to a collection
func (r *CollectionRepository) AddRecipe(ctx context.Context, collectionID, recipeID uuid.UUID) error {
	query := `
		INSERT INTO recipe_collection_items (id, collection_id, recipe_id, sort_order, added_at)
		VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM recipe_collection_items WHERE collection_id = $2), $4)
		ON CONFLICT (collection_id, recipe_id) DO NOTHING
	`

	_, err := r.pool.Exec(ctx, query, uuid.New(), collectionID, recipeID, time.Now())
	return err
}

// RemoveRecipe removes a recipe from a collection
func (r *CollectionRepository) RemoveRecipe(ctx context.Context, collectionID, recipeID uuid.UUID) error {
	query := `DELETE FROM recipe_collection_items WHERE collection_id = $1 AND recipe_id = $2`
	_, err := r.pool.Exec(ctx, query, collectionID, recipeID)
	return err
}

// GetRecipesInCollection retrieves all recipes in a collection
func (r *CollectionRepository) GetRecipesInCollection(ctx context.Context, collectionID uuid.UUID) ([]*models.Recipe, error) {
	query := `
		SELECT r.id, r.user_id, r.title, r.description, r.source_url, r.source_name, r.image_url,
			r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes,
			r.servings, r.servings_unit, r.ingredients, r.instructions,
			r.cuisine, r.course, r.diet_tags, r.custom_tags,
			r.rating, r.notes, r.is_favourite, r.times_cooked, r.last_cooked_at,
			r.nutrition, r.created_at, r.updated_at
		FROM recipes r
		INNER JOIN recipe_collection_items ci ON r.id = ci.recipe_id
		WHERE ci.collection_id = $1
		ORDER BY ci.sort_order ASC, ci.added_at DESC
	`

	recipeRepo := &RecipeRepository{pool: r.pool}
	rows, err := r.pool.Query(ctx, query, collectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return recipeRepo.scanRecipes(rows)
}

// GetCollectionsForRecipe returns all collections that contain a specific recipe
func (r *CollectionRepository) GetCollectionsForRecipe(ctx context.Context, recipeID uuid.UUID) ([]*models.RecipeCollection, error) {
	query := `
		SELECT c.id, c.user_id, c.name, c.description, c.cover_image_url, c.is_default, c.created_at, c.updated_at, 0 as recipe_count
		FROM recipe_collections c
		INNER JOIN recipe_collection_items ci ON c.id = ci.collection_id
		WHERE ci.recipe_id = $1
		ORDER BY c.name ASC
	`

	rows, err := r.pool.Query(ctx, query, recipeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []*models.RecipeCollection
	for rows.Next() {
		var collection models.RecipeCollection
		err := rows.Scan(
			&collection.ID,
			&collection.UserID,
			&collection.Name,
			&collection.Description,
			&collection.CoverImageURL,
			&collection.IsDefault,
			&collection.CreatedAt,
			&collection.UpdatedAt,
			&collection.RecipeCount,
		)
		if err != nil {
			return nil, err
		}
		collections = append(collections, &collection)
	}

	return collections, rows.Err()
}
