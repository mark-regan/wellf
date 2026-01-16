package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

type ActivityRepository struct {
	pool *pgxpool.Pool
}

func NewActivityRepository(pool *pgxpool.Pool) *ActivityRepository {
	return &ActivityRepository{pool: pool}
}

// Create logs a new activity entry
func (r *ActivityRepository) Create(ctx context.Context, activity *models.ActivityLog) error {
	query := `
		INSERT INTO activity_log (id, user_id, domain, action, entity_type, entity_id, entity_name, description, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	activity.ID = uuid.New()
	activity.CreatedAt = time.Now()

	metadataJSON, err := json.Marshal(activity.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	_, err = r.pool.Exec(ctx, query,
		activity.ID,
		activity.UserID,
		activity.Domain,
		activity.Action,
		activity.EntityType,
		activity.EntityID,
		activity.EntityName,
		activity.Description,
		metadataJSON,
		activity.CreatedAt,
	)

	return err
}

// Log is a convenience method to create an activity log entry
func (r *ActivityRepository) Log(ctx context.Context, userID uuid.UUID, domain, action, entityType string, entityID *uuid.UUID, entityName, description string) error {
	activity := &models.ActivityLog{
		UserID:      userID,
		Domain:      domain,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		EntityName:  entityName,
		Description: description,
	}
	return r.Create(ctx, activity)
}

// GetByUserID returns recent activity for a user
func (r *ActivityRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*models.ActivityLog, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT id, user_id, domain, action, entity_type, entity_id, entity_name, description, metadata, created_at
		FROM activity_log
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []*models.ActivityLog
	for rows.Next() {
		var a models.ActivityLog
		var metadataJSON []byte
		err := rows.Scan(
			&a.ID,
			&a.UserID,
			&a.Domain,
			&a.Action,
			&a.EntityType,
			&a.EntityID,
			&a.EntityName,
			&a.Description,
			&metadataJSON,
			&a.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &a.Metadata)
		}
		activities = append(activities, &a)
	}

	return activities, rows.Err()
}

// GetByDomain returns recent activity for a user in a specific domain
func (r *ActivityRepository) GetByDomain(ctx context.Context, userID uuid.UUID, domain string, limit int) ([]*models.ActivityLog, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT id, user_id, domain, action, entity_type, entity_id, entity_name, description, metadata, created_at
		FROM activity_log
		WHERE user_id = $1 AND domain = $2
		ORDER BY created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, userID, domain, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []*models.ActivityLog
	for rows.Next() {
		var a models.ActivityLog
		var metadataJSON []byte
		err := rows.Scan(
			&a.ID,
			&a.UserID,
			&a.Domain,
			&a.Action,
			&a.EntityType,
			&a.EntityID,
			&a.EntityName,
			&a.Description,
			&metadataJSON,
			&a.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &a.Metadata)
		}
		activities = append(activities, &a)
	}

	return activities, rows.Err()
}

// DeleteOlderThan removes activity entries older than the given time
func (r *ActivityRepository) DeleteOlderThan(ctx context.Context, userID uuid.UUID, olderThan time.Time) error {
	query := `DELETE FROM activity_log WHERE user_id = $1 AND created_at < $2`
	_, err := r.pool.Exec(ctx, query, userID, olderThan)
	return err
}

// CountByDomain returns the count of activities per domain for a user
func (r *ActivityRepository) CountByDomain(ctx context.Context, userID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT domain, COUNT(*) as count
		FROM activity_log
		WHERE user_id = $1
		GROUP BY domain
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var domain string
		var count int
		if err := rows.Scan(&domain, &count); err != nil {
			return nil, err
		}
		counts[domain] = count
	}

	return counts, rows.Err()
}
