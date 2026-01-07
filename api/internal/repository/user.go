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
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
)

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, display_name, base_currency, date_format, locale, fire_target, fire_enabled, theme, phone_number, date_of_birth, notify_email, notify_price_alerts, notify_weekly, notify_monthly, watchlist, provider_lists, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
	`

	user.ID = uuid.New()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	if user.DateFormat == "" {
		user.DateFormat = "DD/MM/YYYY"
	}
	if user.Locale == "" {
		user.Locale = "en-GB"
	}
	if user.Theme == "" {
		user.Theme = "system"
	}
	// Default notification preferences
	user.NotifyEmail = true

	_, err := r.pool.Exec(ctx, query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.DisplayName,
		user.BaseCurrency,
		user.DateFormat,
		user.Locale,
		user.FireTarget,
		user.FireEnabled,
		user.Theme,
		user.PhoneNumber,
		user.DateOfBirth,
		user.NotifyEmail,
		user.NotifyPriceAlerts,
		user.NotifyWeekly,
		user.NotifyMonthly,
		user.Watchlist,
		user.ProviderLists,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrUserAlreadyExists
		}
		return err
	}

	return nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, display_name, base_currency, date_format, locale, fire_target, fire_enabled,
			COALESCE(theme, 'system'), COALESCE(phone_number, ''), date_of_birth,
			COALESCE(notify_email, true), COALESCE(notify_price_alerts, false), COALESCE(notify_weekly, false), COALESCE(notify_monthly, false),
			COALESCE(watchlist, ''), COALESCE(provider_lists, ''), created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.BaseCurrency,
		&user.DateFormat,
		&user.Locale,
		&user.FireTarget,
		&user.FireEnabled,
		&user.Theme,
		&user.PhoneNumber,
		&user.DateOfBirth,
		&user.NotifyEmail,
		&user.NotifyPriceAlerts,
		&user.NotifyWeekly,
		&user.NotifyMonthly,
		&user.Watchlist,
		&user.ProviderLists,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, display_name, base_currency, date_format, locale, fire_target, fire_enabled,
			COALESCE(theme, 'system'), COALESCE(phone_number, ''), date_of_birth,
			COALESCE(notify_email, true), COALESCE(notify_price_alerts, false), COALESCE(notify_weekly, false), COALESCE(notify_monthly, false),
			COALESCE(watchlist, ''), COALESCE(provider_lists, ''), created_at, updated_at, last_login_at
		FROM users
		WHERE email = $1
	`

	var user models.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.BaseCurrency,
		&user.DateFormat,
		&user.Locale,
		&user.FireTarget,
		&user.FireEnabled,
		&user.Theme,
		&user.PhoneNumber,
		&user.DateOfBirth,
		&user.NotifyEmail,
		&user.NotifyPriceAlerts,
		&user.NotifyWeekly,
		&user.NotifyMonthly,
		&user.Watchlist,
		&user.ProviderLists,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users
		SET display_name = $2, base_currency = $3, date_format = $4, locale = $5, fire_target = $6, fire_enabled = $7, theme = $8, phone_number = $9, date_of_birth = $10, notify_email = $11, notify_price_alerts = $12, notify_weekly = $13, notify_monthly = $14, watchlist = $15, provider_lists = $16, updated_at = $17
		WHERE id = $1
	`

	user.UpdatedAt = time.Now()

	result, err := r.pool.Exec(ctx, query,
		user.ID,
		user.DisplayName,
		user.BaseCurrency,
		user.DateFormat,
		user.Locale,
		user.FireTarget,
		user.FireEnabled,
		user.Theme,
		user.PhoneNumber,
		user.DateOfBirth,
		user.NotifyEmail,
		user.NotifyPriceAlerts,
		user.NotifyWeekly,
		user.NotifyMonthly,
		user.Watchlist,
		user.ProviderLists,
		user.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $2, updated_at = $3
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query, id, passwordHash, time.Now())
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE users
		SET last_login_at = $2
		WHERE id = $1
	`

	_, err := r.pool.Exec(ctx, query, id, time.Now())
	return err
}

func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

func (r *UserRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, email).Scan(&exists)
	return exists, err
}

// Helper function to check for duplicate key errors
func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "duplicate key") || contains(err.Error(), "UNIQUE constraint")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
