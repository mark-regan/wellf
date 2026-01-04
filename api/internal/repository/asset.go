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
	ErrAssetNotFound      = errors.New("asset not found")
	ErrAssetAlreadyExists = errors.New("asset already exists")
)

type AssetRepository struct {
	pool *pgxpool.Pool
}

func NewAssetRepository(pool *pgxpool.Pool) *AssetRepository {
	return &AssetRepository{pool: pool}
}

func (r *AssetRepository) Create(ctx context.Context, asset *models.Asset) error {
	query := `
		INSERT INTO assets (id, symbol, name, asset_type, exchange, currency, data_source, last_price, last_price_updated_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	asset.ID = uuid.New()
	asset.CreatedAt = time.Now()
	if asset.DataSource == "" {
		asset.DataSource = "YAHOO"
	}

	var lastPriceUpdatedAt *time.Time
	if asset.LastPrice != nil {
		now := time.Now()
		lastPriceUpdatedAt = &now
		asset.LastPriceUpdatedAt = lastPriceUpdatedAt
	}

	_, err := r.pool.Exec(ctx, query,
		asset.ID,
		asset.Symbol,
		asset.Name,
		asset.AssetType,
		asset.Exchange,
		asset.Currency,
		asset.DataSource,
		asset.LastPrice,
		lastPriceUpdatedAt,
		asset.CreatedAt,
	)

	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrAssetAlreadyExists
		}
		return err
	}

	return nil
}

func (r *AssetRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Asset, error) {
	query := `
		SELECT id, symbol, name, asset_type, exchange, currency, data_source, last_price, last_price_updated_at, created_at
		FROM assets
		WHERE id = $1
	`

	var asset models.Asset
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&asset.ID,
		&asset.Symbol,
		&asset.Name,
		&asset.AssetType,
		&asset.Exchange,
		&asset.Currency,
		&asset.DataSource,
		&asset.LastPrice,
		&asset.LastPriceUpdatedAt,
		&asset.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}

	return &asset, nil
}

func (r *AssetRepository) GetBySymbol(ctx context.Context, symbol string) (*models.Asset, error) {
	query := `
		SELECT id, symbol, name, asset_type, exchange, currency, data_source, last_price, last_price_updated_at, created_at
		FROM assets
		WHERE symbol = $1
	`

	var asset models.Asset
	err := r.pool.QueryRow(ctx, query, symbol).Scan(
		&asset.ID,
		&asset.Symbol,
		&asset.Name,
		&asset.AssetType,
		&asset.Exchange,
		&asset.Currency,
		&asset.DataSource,
		&asset.LastPrice,
		&asset.LastPriceUpdatedAt,
		&asset.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}

	return &asset, nil
}

func (r *AssetRepository) GetOrCreate(ctx context.Context, asset *models.Asset) (*models.Asset, error) {
	existing, err := r.GetBySymbol(ctx, asset.Symbol)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, ErrAssetNotFound) {
		return nil, err
	}

	if err := r.Create(ctx, asset); err != nil {
		// If another process created it concurrently, fetch it
		if errors.Is(err, ErrAssetAlreadyExists) {
			return r.GetBySymbol(ctx, asset.Symbol)
		}
		return nil, err
	}

	return asset, nil
}

func (r *AssetRepository) UpdatePrice(ctx context.Context, symbol string, price float64) error {
	query := `
		UPDATE assets
		SET last_price = $2, last_price_updated_at = $3
		WHERE symbol = $1
	`

	result, err := r.pool.Exec(ctx, query, symbol, price, time.Now())
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrAssetNotFound
	}

	return nil
}

func (r *AssetRepository) UpdatePrices(ctx context.Context, prices map[string]float64) error {
	if len(prices) == 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	now := time.Now()
	for symbol, price := range prices {
		_, err := tx.Exec(ctx, `
			UPDATE assets SET last_price = $2, last_price_updated_at = $3 WHERE symbol = $1
		`, symbol, price, now)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *AssetRepository) GetAll(ctx context.Context) ([]*models.Asset, error) {
	query := `
		SELECT id, symbol, name, asset_type, exchange, currency, data_source, last_price, last_price_updated_at, created_at
		FROM assets
		ORDER BY symbol
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []*models.Asset
	for rows.Next() {
		var a models.Asset
		err := rows.Scan(
			&a.ID,
			&a.Symbol,
			&a.Name,
			&a.AssetType,
			&a.Exchange,
			&a.Currency,
			&a.DataSource,
			&a.LastPrice,
			&a.LastPriceUpdatedAt,
			&a.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		assets = append(assets, &a)
	}

	return assets, rows.Err()
}

func (r *AssetRepository) GetHeldAssets(ctx context.Context, userID uuid.UUID) ([]*models.Asset, error) {
	query := `
		SELECT DISTINCT a.id, a.symbol, a.name, a.asset_type, a.exchange, a.currency, a.data_source, a.last_price, a.last_price_updated_at, a.created_at
		FROM assets a
		INNER JOIN holdings h ON h.asset_id = a.id
		INNER JOIN portfolios p ON p.id = h.portfolio_id
		WHERE p.user_id = $1 AND h.quantity > 0
		ORDER BY a.symbol
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []*models.Asset
	for rows.Next() {
		var a models.Asset
		err := rows.Scan(
			&a.ID,
			&a.Symbol,
			&a.Name,
			&a.AssetType,
			&a.Exchange,
			&a.Currency,
			&a.DataSource,
			&a.LastPrice,
			&a.LastPriceUpdatedAt,
			&a.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		assets = append(assets, &a)
	}

	return assets, rows.Err()
}
