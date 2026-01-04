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
	ErrTransactionNotFound = errors.New("transaction not found")
)

type TransactionRepository struct {
	pool *pgxpool.Pool
}

func NewTransactionRepository(pool *pgxpool.Pool) *TransactionRepository {
	return &TransactionRepository{pool: pool}
}

func (r *TransactionRepository) Create(ctx context.Context, tx *models.Transaction) error {
	query := `
		INSERT INTO transactions (id, portfolio_id, asset_id, transaction_type, quantity, price, total_amount, currency, transaction_date, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	tx.ID = uuid.New()
	tx.CreatedAt = time.Now()

	_, err := r.pool.Exec(ctx, query,
		tx.ID,
		tx.PortfolioID,
		tx.AssetID,
		tx.TransactionType,
		tx.Quantity,
		tx.Price,
		tx.TotalAmount,
		tx.Currency,
		tx.TransactionDate,
		tx.Notes,
		tx.CreatedAt,
	)

	return err
}

func (r *TransactionRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Transaction, error) {
	query := `
		SELECT t.id, t.portfolio_id, t.asset_id, t.transaction_type, t.quantity, t.price, t.total_amount, t.currency, t.transaction_date, t.notes, t.created_at,
			   a.id, a.symbol, a.name, a.asset_type, a.exchange, a.currency, a.data_source, a.last_price, a.last_price_updated_at, a.created_at
		FROM transactions t
		LEFT JOIN assets a ON a.id = t.asset_id
		WHERE t.id = $1
	`

	var tx models.Transaction
	var asset models.Asset
	var assetID, assetSymbol, assetName, assetType, assetExchange, assetCurrency, assetDataSource *string
	var assetLastPrice *float64
	var assetLastPriceUpdatedAt, assetCreatedAt *time.Time

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&tx.ID,
		&tx.PortfolioID,
		&tx.AssetID,
		&tx.TransactionType,
		&tx.Quantity,
		&tx.Price,
		&tx.TotalAmount,
		&tx.Currency,
		&tx.TransactionDate,
		&tx.Notes,
		&tx.CreatedAt,
		&assetID,
		&assetSymbol,
		&assetName,
		&assetType,
		&assetExchange,
		&assetCurrency,
		&assetDataSource,
		&assetLastPrice,
		&assetLastPriceUpdatedAt,
		&assetCreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTransactionNotFound
		}
		return nil, err
	}

	if assetID != nil {
		asset.ID = uuid.MustParse(*assetID)
		if assetSymbol != nil {
			asset.Symbol = *assetSymbol
		}
		if assetName != nil {
			asset.Name = *assetName
		}
		if assetType != nil {
			asset.AssetType = *assetType
		}
		if assetExchange != nil {
			asset.Exchange = *assetExchange
		}
		if assetCurrency != nil {
			asset.Currency = *assetCurrency
		}
		if assetDataSource != nil {
			asset.DataSource = *assetDataSource
		}
		asset.LastPrice = assetLastPrice
		asset.LastPriceUpdatedAt = assetLastPriceUpdatedAt
		if assetCreatedAt != nil {
			asset.CreatedAt = *assetCreatedAt
		}
		tx.Asset = &asset
	}

	return &tx, nil
}

func (r *TransactionRepository) GetByPortfolioID(ctx context.Context, portfolioID uuid.UUID, limit, offset int) ([]*models.Transaction, int, error) {
	countQuery := `SELECT COUNT(*) FROM transactions WHERE portfolio_id = $1`
	var total int
	err := r.pool.QueryRow(ctx, countQuery, portfolioID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT t.id, t.portfolio_id, t.asset_id, t.transaction_type, t.quantity, t.price, t.total_amount, t.currency, t.transaction_date, t.notes, t.created_at,
			   a.symbol, a.name
		FROM transactions t
		LEFT JOIN assets a ON a.id = t.asset_id
		WHERE t.portfolio_id = $1
		ORDER BY t.transaction_date DESC, t.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, portfolioID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		var tx models.Transaction
		var assetSymbol, assetName *string

		err := rows.Scan(
			&tx.ID,
			&tx.PortfolioID,
			&tx.AssetID,
			&tx.TransactionType,
			&tx.Quantity,
			&tx.Price,
			&tx.TotalAmount,
			&tx.Currency,
			&tx.TransactionDate,
			&tx.Notes,
			&tx.CreatedAt,
			&assetSymbol,
			&assetName,
		)
		if err != nil {
			return nil, 0, err
		}

		if assetSymbol != nil && assetName != nil {
			tx.Asset = &models.Asset{
				Symbol: *assetSymbol,
				Name:   *assetName,
			}
		}

		transactions = append(transactions, &tx)
	}

	return transactions, total, rows.Err()
}

func (r *TransactionRepository) Update(ctx context.Context, tx *models.Transaction) error {
	query := `
		UPDATE transactions
		SET asset_id = $2, transaction_type = $3, quantity = $4, price = $5, total_amount = $6, currency = $7, transaction_date = $8, notes = $9
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		tx.ID,
		tx.AssetID,
		tx.TransactionType,
		tx.Quantity,
		tx.Price,
		tx.TotalAmount,
		tx.Currency,
		tx.TransactionDate,
		tx.Notes,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrTransactionNotFound
	}

	return nil
}

func (r *TransactionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM transactions WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrTransactionNotFound
	}

	return nil
}

func (r *TransactionRepository) GetByAssetID(ctx context.Context, assetID uuid.UUID) ([]*models.Transaction, error) {
	query := `
		SELECT id, portfolio_id, asset_id, transaction_type, quantity, price, total_amount, currency, transaction_date, notes, created_at
		FROM transactions
		WHERE asset_id = $1
		ORDER BY transaction_date DESC
	`

	rows, err := r.pool.Query(ctx, query, assetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		var tx models.Transaction
		err := rows.Scan(
			&tx.ID,
			&tx.PortfolioID,
			&tx.AssetID,
			&tx.TransactionType,
			&tx.Quantity,
			&tx.Price,
			&tx.TotalAmount,
			&tx.Currency,
			&tx.TransactionDate,
			&tx.Notes,
			&tx.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, &tx)
	}

	return transactions, rows.Err()
}

func (r *TransactionRepository) BelongsToUser(ctx context.Context, transactionID, userID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM transactions t
			JOIN portfolios p ON p.id = t.portfolio_id
			WHERE t.id = $1 AND p.user_id = $2
		)
	`

	var exists bool
	err := r.pool.QueryRow(ctx, query, transactionID, userID).Scan(&exists)
	return exists, err
}

// GetCashBalance calculates the current cash balance for a portfolio from DEPOSIT/WITHDRAWAL transactions
func (r *TransactionRepository) GetCashBalance(ctx context.Context, portfolioID uuid.UUID) (float64, error) {
	query := `
		SELECT COALESCE(
			SUM(CASE
				WHEN transaction_type = 'DEPOSIT' THEN total_amount
				WHEN transaction_type = 'WITHDRAWAL' THEN -total_amount
				ELSE 0
			END), 0
		) as balance
		FROM transactions
		WHERE portfolio_id = $1 AND transaction_type IN ('DEPOSIT', 'WITHDRAWAL')
	`

	var balance float64
	err := r.pool.QueryRow(ctx, query, portfolioID).Scan(&balance)
	return balance, err
}

// HasTransactions checks if a portfolio has any transactions
func (r *TransactionRepository) HasTransactions(ctx context.Context, portfolioID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM transactions WHERE portfolio_id = $1 LIMIT 1)`
	var exists bool
	err := r.pool.QueryRow(ctx, query, portfolioID).Scan(&exists)
	return exists, err
}

// GetPortfoliosWithData returns a map of portfolio IDs to whether they have any data (holdings or transactions)
func (r *TransactionRepository) GetPortfoliosWithData(ctx context.Context, portfolioIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	if len(portfolioIDs) == 0 {
		return make(map[uuid.UUID]bool), nil
	}

	// Check for portfolios that have either holdings or transactions
	query := `
		SELECT DISTINCT portfolio_id
		FROM (
			SELECT portfolio_id FROM holdings WHERE portfolio_id = ANY($1)
			UNION
			SELECT portfolio_id FROM transactions WHERE portfolio_id = ANY($1)
		) AS combined
	`

	rows, err := r.pool.Query(ctx, query, portfolioIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	hasData := make(map[uuid.UUID]bool)
	for rows.Next() {
		var portfolioID uuid.UUID
		if err := rows.Scan(&portfolioID); err != nil {
			return nil, err
		}
		hasData[portfolioID] = true
	}

	return hasData, rows.Err()
}
