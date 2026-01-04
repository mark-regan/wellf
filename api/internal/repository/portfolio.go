package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

var (
	ErrPortfolioNotFound      = errors.New("portfolio not found")
	ErrPortfolioAlreadyExists = errors.New("portfolio with this name already exists")
)

type PortfolioRepository struct {
	pool *pgxpool.Pool
}

func NewPortfolioRepository(pool *pgxpool.Pool) *PortfolioRepository {
	return &PortfolioRepository{pool: pool}
}

func (r *PortfolioRepository) Create(ctx context.Context, portfolio *models.Portfolio) error {
	query := `
		INSERT INTO portfolios (id, user_id, name, type, currency, description, is_active, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	portfolio.ID = uuid.New()
	portfolio.CreatedAt = time.Now()
	portfolio.UpdatedAt = time.Now()
	portfolio.IsActive = true

	var metadataJSON []byte
	var err error
	if portfolio.Metadata != nil {
		metadataJSON, err = json.Marshal(portfolio.Metadata)
		if err != nil {
			return err
		}
	} else {
		metadataJSON = []byte("{}")
	}

	_, err = r.pool.Exec(ctx, query,
		portfolio.ID,
		portfolio.UserID,
		portfolio.Name,
		portfolio.Type,
		portfolio.Currency,
		portfolio.Description,
		portfolio.IsActive,
		metadataJSON,
		portfolio.CreatedAt,
		portfolio.UpdatedAt,
	)

	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrPortfolioAlreadyExists
		}
		return err
	}

	return nil
}

func (r *PortfolioRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Portfolio, error) {
	query := `
		SELECT id, user_id, name, type, currency, description, is_active, metadata, created_at, updated_at
		FROM portfolios
		WHERE id = $1
	`

	var portfolio models.Portfolio
	var metadataJSON []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&portfolio.ID,
		&portfolio.UserID,
		&portfolio.Name,
		&portfolio.Type,
		&portfolio.Currency,
		&portfolio.Description,
		&portfolio.IsActive,
		&metadataJSON,
		&portfolio.CreatedAt,
		&portfolio.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPortfolioNotFound
		}
		return nil, err
	}

	if len(metadataJSON) > 0 && string(metadataJSON) != "{}" {
		var metadata models.PortfolioMetadata
		if err := json.Unmarshal(metadataJSON, &metadata); err == nil {
			portfolio.Metadata = &metadata
		}
	}

	return &portfolio, nil
}

func (r *PortfolioRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Portfolio, error) {
	query := `
		SELECT id, user_id, name, type, currency, description, is_active, metadata, created_at, updated_at
		FROM portfolios
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var portfolios []*models.Portfolio
	for rows.Next() {
		var p models.Portfolio
		var metadataJSON []byte
		err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Name,
			&p.Type,
			&p.Currency,
			&p.Description,
			&p.IsActive,
			&metadataJSON,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(metadataJSON) > 0 && string(metadataJSON) != "{}" {
			var metadata models.PortfolioMetadata
			if err := json.Unmarshal(metadataJSON, &metadata); err == nil {
				p.Metadata = &metadata
			}
		}

		portfolios = append(portfolios, &p)
	}

	return portfolios, rows.Err()
}

func (r *PortfolioRepository) Update(ctx context.Context, portfolio *models.Portfolio) error {
	query := `
		UPDATE portfolios
		SET name = $2, type = $3, currency = $4, description = $5, is_active = $6, metadata = $7, updated_at = $8
		WHERE id = $1
	`

	portfolio.UpdatedAt = time.Now()

	var metadataJSON []byte
	var err error
	if portfolio.Metadata != nil {
		metadataJSON, err = json.Marshal(portfolio.Metadata)
		if err != nil {
			return err
		}
	} else {
		metadataJSON = []byte("{}")
	}

	result, err := r.pool.Exec(ctx, query,
		portfolio.ID,
		portfolio.Name,
		portfolio.Type,
		portfolio.Currency,
		portfolio.Description,
		portfolio.IsActive,
		metadataJSON,
		portfolio.UpdatedAt,
	)

	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrPortfolioAlreadyExists
		}
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrPortfolioNotFound
	}

	return nil
}

func (r *PortfolioRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM portfolios WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrPortfolioNotFound
	}

	return nil
}

func (r *PortfolioRepository) GetSummary(ctx context.Context, portfolioID uuid.UUID) (*models.PortfolioSummary, error) {
	// First, get the portfolio to check its type
	portfolio, err := r.GetByID(ctx, portfolioID)
	if err != nil {
		return nil, err
	}

	// For CASH and SAVINGS portfolios, calculate balance from DEPOSIT/WITHDRAWAL transactions
	if portfolio.Type == models.PortfolioTypeCash || portfolio.Type == models.PortfolioTypeSavings {
		query := `
			SELECT
				p.id,
				p.name,
				p.type,
				COALESCE(
					SUM(CASE
						WHEN t.transaction_type = 'DEPOSIT' THEN t.total_amount
						WHEN t.transaction_type = 'WITHDRAWAL' THEN -t.total_amount
						ELSE 0
					END), 0
				) as total_value,
				0 as total_cost,
				0 as holdings_count
			FROM portfolios p
			LEFT JOIN transactions t ON t.portfolio_id = p.id AND t.transaction_type IN ('DEPOSIT', 'WITHDRAWAL')
			WHERE p.id = $1
			GROUP BY p.id, p.name, p.type
		`

		var summary models.PortfolioSummary
		err := r.pool.QueryRow(ctx, query, portfolioID).Scan(
			&summary.ID,
			&summary.Name,
			&summary.Type,
			&summary.TotalValue,
			&summary.TotalCost,
			&summary.HoldingsCount,
		)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrPortfolioNotFound
			}
			return nil, err
		}

		// No unrealised gain for cash portfolios
		summary.UnrealisedGain = 0
		summary.UnrealisedPct = 0

		return &summary, nil
	}

	// For investment portfolios, calculate from holdings
	query := `
		SELECT
			p.id,
			p.name,
			p.type,
			COALESCE(SUM(h.quantity * COALESCE(a.last_price, h.average_cost)), 0) as total_value,
			COALESCE(SUM(h.quantity * h.average_cost), 0) as total_cost,
			COUNT(h.id) as holdings_count
		FROM portfolios p
		LEFT JOIN holdings h ON h.portfolio_id = p.id
		LEFT JOIN assets a ON a.id = h.asset_id
		WHERE p.id = $1
		GROUP BY p.id, p.name, p.type
	`

	var summary models.PortfolioSummary
	err = r.pool.QueryRow(ctx, query, portfolioID).Scan(
		&summary.ID,
		&summary.Name,
		&summary.Type,
		&summary.TotalValue,
		&summary.TotalCost,
		&summary.HoldingsCount,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPortfolioNotFound
		}
		return nil, err
	}

	summary.UnrealisedGain = summary.TotalValue - summary.TotalCost
	if summary.TotalCost > 0 {
		summary.UnrealisedPct = (summary.UnrealisedGain / summary.TotalCost) * 100
	}

	return &summary, nil
}

func (r *PortfolioRepository) BelongsToUser(ctx context.Context, portfolioID, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM portfolios WHERE id = $1 AND user_id = $2)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, portfolioID, userID).Scan(&exists)
	return exists, err
}

// AddContribution adds an amount to the contributions_this_year in portfolio metadata
func (r *PortfolioRepository) AddContribution(ctx context.Context, portfolioID uuid.UUID, amount float64) error {
	query := `
		UPDATE portfolios
		SET metadata = jsonb_set(
			COALESCE(metadata, '{}'::jsonb),
			'{contributions_this_year}',
			to_jsonb(COALESCE((metadata->>'contributions_this_year')::numeric, 0) + $2)
		),
		updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.pool.Exec(ctx, query, portfolioID, amount)
	return err
}

// HasContributionLimit returns true if the portfolio type has contribution limits
func HasContributionLimit(portfolioType string) bool {
	switch portfolioType {
	case models.PortfolioTypeISA, models.PortfolioTypeLISA, models.PortfolioTypeJISA:
		return true
	default:
		return false
	}
}
