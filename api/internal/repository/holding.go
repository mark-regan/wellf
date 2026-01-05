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
	ErrHoldingNotFound      = errors.New("holding not found")
	ErrHoldingAlreadyExists = errors.New("holding already exists for this asset in portfolio")
	ErrInsufficientHoldings = errors.New("insufficient holdings")
)

type HoldingRepository struct {
	pool *pgxpool.Pool
}

func NewHoldingRepository(pool *pgxpool.Pool) *HoldingRepository {
	return &HoldingRepository{pool: pool}
}

func (r *HoldingRepository) Create(ctx context.Context, holding *models.Holding) error {
	query := `
		INSERT INTO holdings (id, portfolio_id, asset_id, quantity, average_cost, purchased_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	holding.ID = uuid.New()
	holding.CreatedAt = time.Now()
	holding.UpdatedAt = time.Now()

	_, err := r.pool.Exec(ctx, query,
		holding.ID,
		holding.PortfolioID,
		holding.AssetID,
		holding.Quantity,
		holding.AverageCost,
		holding.PurchasedAt,
		holding.CreatedAt,
		holding.UpdatedAt,
	)

	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrHoldingAlreadyExists
		}
		return err
	}

	return nil
}

func (r *HoldingRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Holding, error) {
	query := `
		SELECT h.id, h.portfolio_id, h.asset_id, h.quantity, h.average_cost, h.purchased_at, h.created_at, h.updated_at,
			   a.id, a.symbol, a.name, a.asset_type, a.exchange, a.currency, a.data_source, a.last_price, a.last_price_updated_at, a.created_at
		FROM holdings h
		JOIN assets a ON a.id = h.asset_id
		WHERE h.id = $1
	`

	var holding models.Holding
	var asset models.Asset

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&holding.ID,
		&holding.PortfolioID,
		&holding.AssetID,
		&holding.Quantity,
		&holding.AverageCost,
		&holding.PurchasedAt,
		&holding.CreatedAt,
		&holding.UpdatedAt,
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
			return nil, ErrHoldingNotFound
		}
		return nil, err
	}

	holding.Asset = &asset
	r.calculateHoldingValues(&holding)

	return &holding, nil
}

func (r *HoldingRepository) GetByPortfolioID(ctx context.Context, portfolioID uuid.UUID) ([]*models.Holding, error) {
	query := `
		SELECT h.id, h.portfolio_id, h.asset_id, h.quantity, h.average_cost, h.purchased_at, h.created_at, h.updated_at,
			   a.id, a.symbol, a.name, a.asset_type, a.exchange, a.currency, a.data_source, a.last_price, a.last_price_updated_at, a.created_at
		FROM holdings h
		JOIN assets a ON a.id = h.asset_id
		WHERE h.portfolio_id = $1
		ORDER BY a.symbol
	`

	rows, err := r.pool.Query(ctx, query, portfolioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var holdings []*models.Holding
	for rows.Next() {
		var holding models.Holding
		var asset models.Asset

		err := rows.Scan(
			&holding.ID,
			&holding.PortfolioID,
			&holding.AssetID,
			&holding.Quantity,
			&holding.AverageCost,
			&holding.PurchasedAt,
			&holding.CreatedAt,
			&holding.UpdatedAt,
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
			return nil, err
		}

		holding.Asset = &asset
		r.calculateHoldingValues(&holding)
		holdings = append(holdings, &holding)
	}

	return holdings, rows.Err()
}

func (r *HoldingRepository) GetByPortfolioAndAsset(ctx context.Context, portfolioID, assetID uuid.UUID) (*models.Holding, error) {
	query := `
		SELECT id, portfolio_id, asset_id, quantity, average_cost, purchased_at, created_at, updated_at
		FROM holdings
		WHERE portfolio_id = $1 AND asset_id = $2
	`

	var holding models.Holding
	err := r.pool.QueryRow(ctx, query, portfolioID, assetID).Scan(
		&holding.ID,
		&holding.PortfolioID,
		&holding.AssetID,
		&holding.Quantity,
		&holding.AverageCost,
		&holding.PurchasedAt,
		&holding.CreatedAt,
		&holding.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHoldingNotFound
		}
		return nil, err
	}

	return &holding, nil
}

func (r *HoldingRepository) Update(ctx context.Context, holding *models.Holding) error {
	query := `
		UPDATE holdings
		SET quantity = $2, average_cost = $3, updated_at = $4
		WHERE id = $1
	`

	holding.UpdatedAt = time.Now()

	result, err := r.pool.Exec(ctx, query,
		holding.ID,
		holding.Quantity,
		holding.AverageCost,
		holding.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrHoldingNotFound
	}

	return nil
}

func (r *HoldingRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM holdings WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrHoldingNotFound
	}

	return nil
}

// DeleteByPortfolioID deletes all holdings for a portfolio
func (r *HoldingRepository) DeleteByPortfolioID(ctx context.Context, portfolioID uuid.UUID) error {
	query := `DELETE FROM holdings WHERE portfolio_id = $1`
	_, err := r.pool.Exec(ctx, query, portfolioID)
	return err
}

func (r *HoldingRepository) AddToHolding(ctx context.Context, portfolioID, assetID uuid.UUID, quantity, price float64, purchasedAt *time.Time) error {
	// Try to get existing holding
	existing, err := r.GetByPortfolioAndAsset(ctx, portfolioID, assetID)
	if err != nil && !errors.Is(err, ErrHoldingNotFound) {
		return err
	}

	if existing == nil {
		// Create new holding
		holding := &models.Holding{
			PortfolioID: portfolioID,
			AssetID:     assetID,
			Quantity:    quantity,
			AverageCost: price,
			PurchasedAt: purchasedAt,
		}
		return r.Create(ctx, holding)
	}

	// Update existing holding with new average cost
	totalCost := (existing.Quantity * existing.AverageCost) + (quantity * price)
	newQuantity := existing.Quantity + quantity
	newAverageCost := totalCost / newQuantity

	existing.Quantity = newQuantity
	existing.AverageCost = newAverageCost

	return r.Update(ctx, existing)
}

func (r *HoldingRepository) RemoveFromHolding(ctx context.Context, portfolioID, assetID uuid.UUID, quantity float64) error {
	existing, err := r.GetByPortfolioAndAsset(ctx, portfolioID, assetID)
	if err != nil {
		return err
	}

	if existing.Quantity < quantity {
		return ErrInsufficientHoldings
	}

	newQuantity := existing.Quantity - quantity
	if newQuantity <= 0 {
		return r.Delete(ctx, existing.ID)
	}

	existing.Quantity = newQuantity
	return r.Update(ctx, existing)
}

func (r *HoldingRepository) calculateHoldingValues(holding *models.Holding) {
	if holding.Asset == nil || holding.Asset.LastPrice == nil {
		return
	}

	currentValue := holding.Quantity * *holding.Asset.LastPrice
	holding.CurrentValue = &currentValue

	costBasis := holding.Quantity * holding.AverageCost
	gainLoss := currentValue - costBasis
	holding.GainLoss = &gainLoss

	if costBasis > 0 {
		gainLossPct := (gainLoss / costBasis) * 100
		holding.GainLossPct = &gainLossPct
	}
}

func (r *HoldingRepository) BelongsToUser(ctx context.Context, holdingID, userID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM holdings h
			JOIN portfolios p ON p.id = h.portfolio_id
			WHERE h.id = $1 AND p.user_id = $2
		)
	`

	var exists bool
	err := r.pool.QueryRow(ctx, query, holdingID, userID).Scan(&exists)
	return exists, err
}

func (r *HoldingRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.HoldingWithPortfolio, error) {
	query := `
		SELECT h.id, h.portfolio_id, h.asset_id, h.quantity, h.average_cost, h.purchased_at, h.created_at, h.updated_at,
			   a.id, a.symbol, a.name, a.asset_type, a.exchange, a.currency, a.data_source, a.last_price, a.last_price_updated_at, a.created_at,
			   p.name, p.type
		FROM holdings h
		JOIN assets a ON a.id = h.asset_id
		JOIN portfolios p ON p.id = h.portfolio_id
		WHERE p.user_id = $1
		ORDER BY a.symbol
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var holdings []*models.HoldingWithPortfolio
	for rows.Next() {
		var holding models.HoldingWithPortfolio
		var asset models.Asset

		err := rows.Scan(
			&holding.ID,
			&holding.PortfolioID,
			&holding.AssetID,
			&holding.Quantity,
			&holding.AverageCost,
			&holding.PurchasedAt,
			&holding.CreatedAt,
			&holding.UpdatedAt,
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
			&holding.PortfolioName,
			&holding.PortfolioType,
		)
		if err != nil {
			return nil, err
		}

		holding.Asset = &asset
		r.calculateHoldingWithPortfolioValues(&holding)
		holdings = append(holdings, &holding)
	}

	return holdings, rows.Err()
}

func (r *HoldingRepository) calculateHoldingWithPortfolioValues(holding *models.HoldingWithPortfolio) {
	if holding.Asset == nil || holding.Asset.LastPrice == nil {
		return
	}

	currentValue := holding.Quantity * *holding.Asset.LastPrice
	holding.CurrentValue = &currentValue

	costBasis := holding.Quantity * holding.AverageCost
	gainLoss := currentValue - costBasis
	holding.GainLoss = &gainLoss

	if costBasis > 0 {
		gainLossPct := (gainLoss / costBasis) * 100
		holding.GainLossPct = &gainLossPct
	}
}
