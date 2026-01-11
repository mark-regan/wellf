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
	ErrHouseholdNotFound      = errors.New("household not found")
	ErrHouseholdAlreadyExists = errors.New("household with this name already exists")
	ErrMemberNotFound         = errors.New("household member not found")
	ErrMemberAlreadyExists    = errors.New("user is already a member of this household")
	ErrCannotRemoveOwner      = errors.New("cannot remove the owner from the household")
)

type HouseholdRepository struct {
	pool *pgxpool.Pool
}

func NewHouseholdRepository(pool *pgxpool.Pool) *HouseholdRepository {
	return &HouseholdRepository{pool: pool}
}

// Create creates a new household and adds the owner as a member
func (r *HouseholdRepository) Create(ctx context.Context, household *models.Household) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	household.ID = uuid.New()
	household.CreatedAt = time.Now()
	household.UpdatedAt = time.Now()

	// Create household
	query := `
		INSERT INTO households (id, name, owner_user_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err = tx.Exec(ctx, query,
		household.ID,
		household.Name,
		household.OwnerUserID,
		household.CreatedAt,
		household.UpdatedAt,
	)
	if err != nil {
		return err
	}

	// Add owner as member
	memberID := uuid.New()
	memberQuery := `
		INSERT INTO household_members (id, household_id, user_id, role, invite_status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = tx.Exec(ctx, memberQuery,
		memberID,
		household.ID,
		household.OwnerUserID,
		models.HouseholdRoleOwner,
		models.InviteStatusAccepted,
		time.Now(),
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetByID retrieves a household by ID
func (r *HouseholdRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Household, error) {
	query := `
		SELECT id, name, owner_user_id, created_at, updated_at
		FROM households
		WHERE id = $1
	`

	var household models.Household
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&household.ID,
		&household.Name,
		&household.OwnerUserID,
		&household.CreatedAt,
		&household.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHouseholdNotFound
		}
		return nil, err
	}

	return &household, nil
}

// GetByUserID retrieves all households a user is a member of
func (r *HouseholdRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Household, error) {
	query := `
		SELECT h.id, h.name, h.owner_user_id, h.created_at, h.updated_at,
			   (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count
		FROM households h
		INNER JOIN household_members hm ON h.id = hm.household_id
		WHERE hm.user_id = $1 AND hm.invite_status = 'accepted'
		ORDER BY h.created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var households []*models.Household
	for rows.Next() {
		var h models.Household
		err := rows.Scan(
			&h.ID,
			&h.Name,
			&h.OwnerUserID,
			&h.CreatedAt,
			&h.UpdatedAt,
			&h.MemberCount,
		)
		if err != nil {
			return nil, err
		}
		households = append(households, &h)
	}

	return households, rows.Err()
}

// Update updates a household
func (r *HouseholdRepository) Update(ctx context.Context, household *models.Household) error {
	query := `
		UPDATE households
		SET name = $2, updated_at = $3
		WHERE id = $1
	`

	household.UpdatedAt = time.Now()

	result, err := r.pool.Exec(ctx, query,
		household.ID,
		household.Name,
		household.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrHouseholdNotFound
	}

	return nil
}

// Delete deletes a household and all associated data (cascades)
func (r *HouseholdRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM households WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrHouseholdNotFound
	}

	return nil
}

// BelongsToUser checks if a user is a member of the household
func (r *HouseholdRepository) BelongsToUser(ctx context.Context, householdID, userID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM household_members
			WHERE household_id = $1 AND user_id = $2 AND invite_status = 'accepted'
		)
	`

	var exists bool
	err := r.pool.QueryRow(ctx, query, householdID, userID).Scan(&exists)
	return exists, err
}

// IsOwner checks if a user is the owner of the household
func (r *HouseholdRepository) IsOwner(ctx context.Context, householdID, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM households WHERE id = $1 AND owner_user_id = $2)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, householdID, userID).Scan(&exists)
	return exists, err
}

// GetUserRole returns the user's role in the household
func (r *HouseholdRepository) GetUserRole(ctx context.Context, householdID, userID uuid.UUID) (string, error) {
	query := `
		SELECT role FROM household_members
		WHERE household_id = $1 AND user_id = $2 AND invite_status = 'accepted'
	`

	var role string
	err := r.pool.QueryRow(ctx, query, householdID, userID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrMemberNotFound
		}
		return "", err
	}
	return role, nil
}

// AddMember adds a member to the household
func (r *HouseholdRepository) AddMember(ctx context.Context, member *models.HouseholdMember) error {
	member.ID = uuid.New()
	member.CreatedAt = time.Now()

	query := `
		INSERT INTO household_members (id, household_id, user_id, role, invited_email, invite_status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.pool.Exec(ctx, query,
		member.ID,
		member.HouseholdID,
		member.UserID,
		member.Role,
		member.InvitedEmail,
		member.InviteStatus,
		member.CreatedAt,
	)

	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrMemberAlreadyExists
		}
		return err
	}

	return nil
}

// RemoveMember removes a member from the household
func (r *HouseholdRepository) RemoveMember(ctx context.Context, householdID uuid.UUID, memberID uuid.UUID) error {
	// First check if this is the owner
	query := `
		SELECT role FROM household_members WHERE id = $1 AND household_id = $2
	`
	var role string
	err := r.pool.QueryRow(ctx, query, memberID, householdID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrMemberNotFound
		}
		return err
	}

	if role == models.HouseholdRoleOwner {
		return ErrCannotRemoveOwner
	}

	deleteQuery := `DELETE FROM household_members WHERE id = $1 AND household_id = $2`
	result, err := r.pool.Exec(ctx, deleteQuery, memberID, householdID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrMemberNotFound
	}

	return nil
}

// GetMembers returns all members of a household
func (r *HouseholdRepository) GetMembers(ctx context.Context, householdID uuid.UUID) ([]models.HouseholdMember, error) {
	query := `
		SELECT hm.id, hm.household_id, hm.user_id, hm.role, hm.invited_email, hm.invite_status, hm.created_at,
			   u.email, u.display_name
		FROM household_members hm
		LEFT JOIN users u ON u.id = hm.user_id
		WHERE hm.household_id = $1
		ORDER BY hm.created_at ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.HouseholdMember
	for rows.Next() {
		var m models.HouseholdMember
		var userEmail, userDisplayName *string
		err := rows.Scan(
			&m.ID,
			&m.HouseholdID,
			&m.UserID,
			&m.Role,
			&m.InvitedEmail,
			&m.InviteStatus,
			&m.CreatedAt,
			&userEmail,
			&userDisplayName,
		)
		if err != nil {
			return nil, err
		}

		// Populate user info if available
		if m.UserID != nil && userEmail != nil {
			m.User = &models.User{
				ID:          *m.UserID,
				Email:       *userEmail,
				DisplayName: stringOrEmpty(userDisplayName),
			}
		}

		members = append(members, m)
	}

	return members, rows.Err()
}

// UpdateMemberRole updates a member's role
func (r *HouseholdRepository) UpdateMemberRole(ctx context.Context, memberID uuid.UUID, role string) error {
	query := `UPDATE household_members SET role = $2 WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, memberID, role)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrMemberNotFound
	}

	return nil
}

// GetDefaultHousehold returns the user's primary/default household (usually the first one they own)
func (r *HouseholdRepository) GetDefaultHousehold(ctx context.Context, userID uuid.UUID) (*models.Household, error) {
	query := `
		SELECT id, name, owner_user_id, created_at, updated_at
		FROM households
		WHERE owner_user_id = $1
		ORDER BY created_at ASC
		LIMIT 1
	`

	var household models.Household
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&household.ID,
		&household.Name,
		&household.OwnerUserID,
		&household.CreatedAt,
		&household.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHouseholdNotFound
		}
		return nil, err
	}

	return &household, nil
}

// Helper function
func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
