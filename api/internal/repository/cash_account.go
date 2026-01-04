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
	ErrCashAccountNotFound = errors.New("cash account not found")
)

type CashAccountRepository struct {
	pool *pgxpool.Pool
}

func NewCashAccountRepository(pool *pgxpool.Pool) *CashAccountRepository {
	return &CashAccountRepository{pool: pool}
}

func (r *CashAccountRepository) Create(ctx context.Context, account *models.CashAccount) error {
	query := `
		INSERT INTO cash_accounts (id, portfolio_id, account_name, account_type, institution, balance, currency, interest_rate, last_updated, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	account.ID = uuid.New()
	account.CreatedAt = time.Now()
	account.LastUpdated = time.Now()

	_, err := r.pool.Exec(ctx, query,
		account.ID,
		account.PortfolioID,
		account.AccountName,
		account.AccountType,
		account.Institution,
		account.Balance,
		account.Currency,
		account.InterestRate,
		account.LastUpdated,
		account.CreatedAt,
	)

	return err
}

func (r *CashAccountRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.CashAccount, error) {
	query := `
		SELECT id, portfolio_id, account_name, account_type, institution, balance, currency, interest_rate, last_updated, created_at
		FROM cash_accounts
		WHERE id = $1
	`

	var account models.CashAccount
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&account.ID,
		&account.PortfolioID,
		&account.AccountName,
		&account.AccountType,
		&account.Institution,
		&account.Balance,
		&account.Currency,
		&account.InterestRate,
		&account.LastUpdated,
		&account.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCashAccountNotFound
		}
		return nil, err
	}

	return &account, nil
}

func (r *CashAccountRepository) GetByPortfolioID(ctx context.Context, portfolioID uuid.UUID) ([]*models.CashAccount, error) {
	query := `
		SELECT id, portfolio_id, account_name, account_type, institution, balance, currency, interest_rate, last_updated, created_at
		FROM cash_accounts
		WHERE portfolio_id = $1
		ORDER BY account_name
	`

	rows, err := r.pool.Query(ctx, query, portfolioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []*models.CashAccount
	for rows.Next() {
		var account models.CashAccount
		err := rows.Scan(
			&account.ID,
			&account.PortfolioID,
			&account.AccountName,
			&account.AccountType,
			&account.Institution,
			&account.Balance,
			&account.Currency,
			&account.InterestRate,
			&account.LastUpdated,
			&account.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, &account)
	}

	return accounts, rows.Err()
}

func (r *CashAccountRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.CashAccount, error) {
	query := `
		SELECT ca.id, ca.portfolio_id, ca.account_name, ca.account_type, ca.institution, ca.balance, ca.currency, ca.interest_rate, ca.last_updated, ca.created_at
		FROM cash_accounts ca
		JOIN portfolios p ON p.id = ca.portfolio_id
		WHERE p.user_id = $1
		ORDER BY ca.account_name
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []*models.CashAccount
	for rows.Next() {
		var account models.CashAccount
		err := rows.Scan(
			&account.ID,
			&account.PortfolioID,
			&account.AccountName,
			&account.AccountType,
			&account.Institution,
			&account.Balance,
			&account.Currency,
			&account.InterestRate,
			&account.LastUpdated,
			&account.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, &account)
	}

	return accounts, rows.Err()
}

func (r *CashAccountRepository) Update(ctx context.Context, account *models.CashAccount) error {
	query := `
		UPDATE cash_accounts
		SET account_name = $2, account_type = $3, institution = $4, balance = $5, currency = $6, interest_rate = $7, last_updated = $8
		WHERE id = $1
	`

	account.LastUpdated = time.Now()

	result, err := r.pool.Exec(ctx, query,
		account.ID,
		account.AccountName,
		account.AccountType,
		account.Institution,
		account.Balance,
		account.Currency,
		account.InterestRate,
		account.LastUpdated,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrCashAccountNotFound
	}

	return nil
}

func (r *CashAccountRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM cash_accounts WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrCashAccountNotFound
	}

	return nil
}

func (r *CashAccountRepository) GetTotalByUserID(ctx context.Context, userID uuid.UUID) (float64, error) {
	query := `
		SELECT COALESCE(SUM(ca.balance), 0)
		FROM cash_accounts ca
		JOIN portfolios p ON p.id = ca.portfolio_id
		WHERE p.user_id = $1
	`

	var total float64
	err := r.pool.QueryRow(ctx, query, userID).Scan(&total)
	return total, err
}

func (r *CashAccountRepository) BelongsToUser(ctx context.Context, accountID, userID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM cash_accounts ca
			JOIN portfolios p ON p.id = ca.portfolio_id
			WHERE ca.id = $1 AND p.user_id = $2
		)
	`

	var exists bool
	err := r.pool.QueryRow(ctx, query, accountID, userID).Scan(&exists)
	return exists, err
}
