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
	ErrDocumentLinkNotFound     = errors.New("document link not found")
	ErrDocumentLinkAlreadyExists = errors.New("document link already exists for this Paperless document")
)

type DocumentLinkRepository struct {
	pool *pgxpool.Pool
}

func NewDocumentLinkRepository(pool *pgxpool.Pool) *DocumentLinkRepository {
	return &DocumentLinkRepository{pool: pool}
}

// Create creates a new document link
func (r *DocumentLinkRepository) Create(ctx context.Context, link *models.DocumentLink) error {
	link.ID = uuid.New()
	link.CachedAt = time.Now()
	link.CreatedAt = time.Now()
	link.UpdatedAt = time.Now()

	query := `
		INSERT INTO document_links (
			id, household_id, paperless_document_id,
			paperless_title, paperless_correspondent, paperless_document_type, paperless_created,
			cached_at, category, description,
			linked_person_id, linked_property_id, linked_vehicle_id, linked_policy_id,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		)
	`

	_, err := r.pool.Exec(ctx, query,
		link.ID, link.HouseholdID, link.PaperlessDocumentID,
		link.PaperlessTitle, link.PaperlessCorrespondent, link.PaperlessDocumentType, link.PaperlessCreated,
		link.CachedAt, link.Category, link.Description,
		link.LinkedPersonID, link.LinkedPropertyID, link.LinkedVehicleID, link.LinkedPolicyID,
		link.CreatedAt, link.UpdatedAt,
	)

	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrDocumentLinkAlreadyExists
		}
		return err
	}

	return nil
}

// GetByID retrieves a document link by ID
func (r *DocumentLinkRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentLink, error) {
	query := `
		SELECT id, household_id, paperless_document_id,
			paperless_title, paperless_correspondent, paperless_document_type, paperless_created,
			cached_at, category, description,
			linked_person_id, linked_property_id, linked_vehicle_id, linked_policy_id,
			created_at, updated_at
		FROM document_links
		WHERE id = $1
	`

	var link models.DocumentLink
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&link.ID, &link.HouseholdID, &link.PaperlessDocumentID,
		&link.PaperlessTitle, &link.PaperlessCorrespondent, &link.PaperlessDocumentType, &link.PaperlessCreated,
		&link.CachedAt, &link.Category, &link.Description,
		&link.LinkedPersonID, &link.LinkedPropertyID, &link.LinkedVehicleID, &link.LinkedPolicyID,
		&link.CreatedAt, &link.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDocumentLinkNotFound
		}
		return nil, err
	}

	return &link, nil
}

// GetByHouseholdID retrieves all document links for a household
func (r *DocumentLinkRepository) GetByHouseholdID(ctx context.Context, householdID uuid.UUID) ([]*models.DocumentLink, error) {
	query := `
		SELECT id, household_id, paperless_document_id,
			paperless_title, paperless_correspondent, paperless_document_type, paperless_created,
			cached_at, category, description,
			linked_person_id, linked_property_id, linked_vehicle_id, linked_policy_id,
			created_at, updated_at
		FROM document_links
		WHERE household_id = $1
		ORDER BY created_at DESC
	`

	return r.queryLinks(ctx, query, householdID)
}

// GetByPersonID retrieves all document links for a person
func (r *DocumentLinkRepository) GetByPersonID(ctx context.Context, personID uuid.UUID) ([]*models.DocumentLink, error) {
	query := `
		SELECT id, household_id, paperless_document_id,
			paperless_title, paperless_correspondent, paperless_document_type, paperless_created,
			cached_at, category, description,
			linked_person_id, linked_property_id, linked_vehicle_id, linked_policy_id,
			created_at, updated_at
		FROM document_links
		WHERE linked_person_id = $1
		ORDER BY created_at DESC
	`

	return r.queryLinks(ctx, query, personID)
}

// GetByPropertyID retrieves all document links for a property
func (r *DocumentLinkRepository) GetByPropertyID(ctx context.Context, propertyID uuid.UUID) ([]*models.DocumentLink, error) {
	query := `
		SELECT id, household_id, paperless_document_id,
			paperless_title, paperless_correspondent, paperless_document_type, paperless_created,
			cached_at, category, description,
			linked_person_id, linked_property_id, linked_vehicle_id, linked_policy_id,
			created_at, updated_at
		FROM document_links
		WHERE linked_property_id = $1
		ORDER BY created_at DESC
	`

	return r.queryLinks(ctx, query, propertyID)
}

// GetByVehicleID retrieves all document links for a vehicle
func (r *DocumentLinkRepository) GetByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]*models.DocumentLink, error) {
	query := `
		SELECT id, household_id, paperless_document_id,
			paperless_title, paperless_correspondent, paperless_document_type, paperless_created,
			cached_at, category, description,
			linked_person_id, linked_property_id, linked_vehicle_id, linked_policy_id,
			created_at, updated_at
		FROM document_links
		WHERE linked_vehicle_id = $1
		ORDER BY created_at DESC
	`

	return r.queryLinks(ctx, query, vehicleID)
}

// GetByPolicyID retrieves all document links for an insurance policy
func (r *DocumentLinkRepository) GetByPolicyID(ctx context.Context, policyID uuid.UUID) ([]*models.DocumentLink, error) {
	query := `
		SELECT id, household_id, paperless_document_id,
			paperless_title, paperless_correspondent, paperless_document_type, paperless_created,
			cached_at, category, description,
			linked_person_id, linked_property_id, linked_vehicle_id, linked_policy_id,
			created_at, updated_at
		FROM document_links
		WHERE linked_policy_id = $1
		ORDER BY created_at DESC
	`

	return r.queryLinks(ctx, query, policyID)
}

// Delete deletes a document link
func (r *DocumentLinkRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM document_links WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrDocumentLinkNotFound
	}

	return nil
}

// ExistsByPaperlessID checks if a document link exists for a Paperless document in a household
func (r *DocumentLinkRepository) ExistsByPaperlessID(ctx context.Context, householdID uuid.UUID, paperlessDocID int) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM document_links
			WHERE household_id = $1 AND paperless_document_id = $2
		)
	`

	var exists bool
	err := r.pool.QueryRow(ctx, query, householdID, paperlessDocID).Scan(&exists)
	return exists, err
}

// Update updates a document link's metadata
func (r *DocumentLinkRepository) Update(ctx context.Context, link *models.DocumentLink) error {
	link.UpdatedAt = time.Now()

	query := `
		UPDATE document_links SET
			paperless_title = $2,
			paperless_correspondent = $3,
			paperless_document_type = $4,
			paperless_created = $5,
			cached_at = $6,
			category = $7,
			description = $8,
			linked_person_id = $9,
			linked_property_id = $10,
			linked_vehicle_id = $11,
			linked_policy_id = $12,
			updated_at = $13
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		link.ID,
		link.PaperlessTitle,
		link.PaperlessCorrespondent,
		link.PaperlessDocumentType,
		link.PaperlessCreated,
		link.CachedAt,
		link.Category,
		link.Description,
		link.LinkedPersonID,
		link.LinkedPropertyID,
		link.LinkedVehicleID,
		link.LinkedPolicyID,
		link.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrDocumentLinkNotFound
	}

	return nil
}

// RefreshCache updates the cached Paperless metadata for a document link
func (r *DocumentLinkRepository) RefreshCache(ctx context.Context, id uuid.UUID, title, correspondent, docType string, created *time.Time) error {
	query := `
		UPDATE document_links SET
			paperless_title = $2,
			paperless_correspondent = $3,
			paperless_document_type = $4,
			paperless_created = $5,
			cached_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query, id, title, correspondent, docType, created)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrDocumentLinkNotFound
	}

	return nil
}

// GetCountByHouseholdID returns the number of document links for a household
func (r *DocumentLinkRepository) GetCountByHouseholdID(ctx context.Context, householdID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM document_links WHERE household_id = $1`

	var count int
	err := r.pool.QueryRow(ctx, query, householdID).Scan(&count)
	return count, err
}

// queryLinks is a helper function to query and scan document links
func (r *DocumentLinkRepository) queryLinks(ctx context.Context, query string, args ...interface{}) ([]*models.DocumentLink, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []*models.DocumentLink
	for rows.Next() {
		var link models.DocumentLink
		err := rows.Scan(
			&link.ID, &link.HouseholdID, &link.PaperlessDocumentID,
			&link.PaperlessTitle, &link.PaperlessCorrespondent, &link.PaperlessDocumentType, &link.PaperlessCreated,
			&link.CachedAt, &link.Category, &link.Description,
			&link.LinkedPersonID, &link.LinkedPropertyID, &link.LinkedVehicleID, &link.LinkedPolicyID,
			&link.CreatedAt, &link.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		links = append(links, &link)
	}

	return links, rows.Err()
}
