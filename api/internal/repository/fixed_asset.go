package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

var (
	ErrFixedAssetNotFound = errors.New("fixed asset not found")
)

type FixedAssetRepository struct {
	pool *pgxpool.Pool
}

func NewFixedAssetRepository(pool *pgxpool.Pool) *FixedAssetRepository {
	return &FixedAssetRepository{pool: pool}
}

func (r *FixedAssetRepository) Create(ctx context.Context, asset *models.FixedAsset) error {
	query := `
		INSERT INTO fixed_assets (id, user_id, name, category, description, purchase_date, purchase_price, current_value, currency, valuation_date, valuation_notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	asset.ID = uuid.New()
	asset.CreatedAt = time.Now()
	asset.UpdatedAt = time.Now()

	_, err := r.pool.Exec(ctx, query,
		asset.ID,
		asset.UserID,
		asset.Name,
		asset.Category,
		asset.Description,
		asset.PurchaseDate,
		asset.PurchasePrice,
		asset.CurrentValue,
		asset.Currency,
		asset.ValuationDate,
		asset.ValuationNotes,
		asset.CreatedAt,
		asset.UpdatedAt,
	)

	return err
}

func (r *FixedAssetRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.FixedAsset, error) {
	query := `
		SELECT id, user_id, name, category, description, purchase_date, purchase_price, current_value, currency, valuation_date, valuation_notes, created_at, updated_at
		FROM fixed_assets
		WHERE id = $1
	`

	var asset models.FixedAsset
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&asset.ID,
		&asset.UserID,
		&asset.Name,
		&asset.Category,
		&asset.Description,
		&asset.PurchaseDate,
		&asset.PurchasePrice,
		&asset.CurrentValue,
		&asset.Currency,
		&asset.ValuationDate,
		&asset.ValuationNotes,
		&asset.CreatedAt,
		&asset.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFixedAssetNotFound
		}
		return nil, err
	}

	r.calculateAppreciation(&asset)
	return &asset, nil
}

func (r *FixedAssetRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.FixedAsset, error) {
	query := `
		SELECT id, user_id, name, category, description, purchase_date, purchase_price, current_value, currency, valuation_date, valuation_notes, created_at, updated_at
		FROM fixed_assets
		WHERE user_id = $1
		ORDER BY current_value DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []*models.FixedAsset
	for rows.Next() {
		var asset models.FixedAsset
		err := rows.Scan(
			&asset.ID,
			&asset.UserID,
			&asset.Name,
			&asset.Category,
			&asset.Description,
			&asset.PurchaseDate,
			&asset.PurchasePrice,
			&asset.CurrentValue,
			&asset.Currency,
			&asset.ValuationDate,
			&asset.ValuationNotes,
			&asset.CreatedAt,
			&asset.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		r.calculateAppreciation(&asset)
		assets = append(assets, &asset)
	}

	return assets, rows.Err()
}

func (r *FixedAssetRepository) Update(ctx context.Context, asset *models.FixedAsset) error {
	query := `
		UPDATE fixed_assets
		SET name = $2, category = $3, description = $4, purchase_date = $5, purchase_price = $6, current_value = $7, currency = $8, valuation_date = $9, valuation_notes = $10, updated_at = $11
		WHERE id = $1
	`

	asset.UpdatedAt = time.Now()

	result, err := r.pool.Exec(ctx, query,
		asset.ID,
		asset.Name,
		asset.Category,
		asset.Description,
		asset.PurchaseDate,
		asset.PurchasePrice,
		asset.CurrentValue,
		asset.Currency,
		asset.ValuationDate,
		asset.ValuationNotes,
		asset.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrFixedAssetNotFound
	}

	return nil
}

func (r *FixedAssetRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM fixed_assets WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrFixedAssetNotFound
	}

	return nil
}

func (r *FixedAssetRepository) GetTotalByUserID(ctx context.Context, userID uuid.UUID) (float64, error) {
	query := `
		SELECT COALESCE(SUM(current_value), 0)
		FROM fixed_assets
		WHERE user_id = $1
	`

	var total float64
	err := r.pool.QueryRow(ctx, query, userID).Scan(&total)
	return total, err
}

func (r *FixedAssetRepository) BelongsToUser(ctx context.Context, assetID, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM fixed_assets WHERE id = $1 AND user_id = $2)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, assetID, userID).Scan(&exists)
	return exists, err
}

func (r *FixedAssetRepository) calculateAppreciation(asset *models.FixedAsset) {
	if asset.PurchasePrice == nil || *asset.PurchasePrice <= 0 {
		return
	}

	appreciation := asset.CurrentValue - *asset.PurchasePrice
	asset.Appreciation = &appreciation

	appreciationPct := (appreciation / *asset.PurchasePrice) * 100
	asset.AppreciationPct = &appreciationPct
}
