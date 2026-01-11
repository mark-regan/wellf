package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lib/pq"
	"github.com/mark-regan/wellf/internal/models"
)

var (
	ErrDocumentNotFound = errors.New("document not found")
)

type DocumentRepository struct {
	pool *pgxpool.Pool
}

func NewDocumentRepository(pool *pgxpool.Pool) *DocumentRepository {
	return &DocumentRepository{pool: pool}
}

func (r *DocumentRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	query := `
		SELECT id, household_id, name, description, category,
			url, file_type, file_size,
			document_date, expiry_date, tags,
			person_id, property_id, vehicle_id, insurance_policy_id,
			notes, created_at, updated_at
		FROM documents
		WHERE id = $1
	`

	var doc models.Document
	var tags []string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&doc.ID, &doc.HouseholdID, &doc.Name, &doc.Description, &doc.Category,
		&doc.URL, &doc.FileType, &doc.FileSize,
		&doc.DocumentDate, &doc.ExpiryDate, &tags,
		&doc.PersonID, &doc.PropertyID, &doc.VehicleID, &doc.InsurancePolicyID,
		&doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDocumentNotFound
		}
		return nil, err
	}

	doc.Tags = tags
	doc.PopulateComputedFields()

	return &doc, nil
}

func (r *DocumentRepository) GetByHouseholdID(ctx context.Context, householdID uuid.UUID) ([]*models.Document, error) {
	query := `
		SELECT id, household_id, name, description, category,
			url, file_type, file_size,
			document_date, expiry_date, tags,
			person_id, property_id, vehicle_id, insurance_policy_id,
			notes, created_at, updated_at
		FROM documents
		WHERE household_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	for rows.Next() {
		var doc models.Document
		var tags []string
		err := rows.Scan(
			&doc.ID, &doc.HouseholdID, &doc.Name, &doc.Description, &doc.Category,
			&doc.URL, &doc.FileType, &doc.FileSize,
			&doc.DocumentDate, &doc.ExpiryDate, &tags,
			&doc.PersonID, &doc.PropertyID, &doc.VehicleID, &doc.InsurancePolicyID,
			&doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		doc.Tags = tags
		doc.PopulateComputedFields()
		docs = append(docs, &doc)
	}

	return docs, nil
}

func (r *DocumentRepository) GetByCategory(ctx context.Context, householdID uuid.UUID, category string) ([]*models.Document, error) {
	query := `
		SELECT id, household_id, name, description, category,
			url, file_type, file_size,
			document_date, expiry_date, tags,
			person_id, property_id, vehicle_id, insurance_policy_id,
			notes, created_at, updated_at
		FROM documents
		WHERE household_id = $1 AND category = $2
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, householdID, category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	for rows.Next() {
		var doc models.Document
		var tags []string
		err := rows.Scan(
			&doc.ID, &doc.HouseholdID, &doc.Name, &doc.Description, &doc.Category,
			&doc.URL, &doc.FileType, &doc.FileSize,
			&doc.DocumentDate, &doc.ExpiryDate, &tags,
			&doc.PersonID, &doc.PropertyID, &doc.VehicleID, &doc.InsurancePolicyID,
			&doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		doc.Tags = tags
		doc.PopulateComputedFields()
		docs = append(docs, &doc)
	}

	return docs, nil
}

func (r *DocumentRepository) GetByPersonID(ctx context.Context, personID uuid.UUID) ([]*models.Document, error) {
	query := `
		SELECT id, household_id, name, description, category,
			url, file_type, file_size,
			document_date, expiry_date, tags,
			person_id, property_id, vehicle_id, insurance_policy_id,
			notes, created_at, updated_at
		FROM documents
		WHERE person_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	for rows.Next() {
		var doc models.Document
		var tags []string
		err := rows.Scan(
			&doc.ID, &doc.HouseholdID, &doc.Name, &doc.Description, &doc.Category,
			&doc.URL, &doc.FileType, &doc.FileSize,
			&doc.DocumentDate, &doc.ExpiryDate, &tags,
			&doc.PersonID, &doc.PropertyID, &doc.VehicleID, &doc.InsurancePolicyID,
			&doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		doc.Tags = tags
		doc.PopulateComputedFields()
		docs = append(docs, &doc)
	}

	return docs, nil
}

func (r *DocumentRepository) GetExpiringDocuments(ctx context.Context, householdID uuid.UUID, daysAhead int) ([]*models.Document, error) {
	query := `
		SELECT id, household_id, name, description, category,
			url, file_type, file_size,
			document_date, expiry_date, tags,
			person_id, property_id, vehicle_id, insurance_policy_id,
			notes, created_at, updated_at
		FROM documents
		WHERE household_id = $1
			AND expiry_date IS NOT NULL
			AND expiry_date >= CURRENT_DATE
			AND expiry_date <= CURRENT_DATE + $2 * INTERVAL '1 day'
		ORDER BY expiry_date ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID, daysAhead)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	for rows.Next() {
		var doc models.Document
		var tags []string
		err := rows.Scan(
			&doc.ID, &doc.HouseholdID, &doc.Name, &doc.Description, &doc.Category,
			&doc.URL, &doc.FileType, &doc.FileSize,
			&doc.DocumentDate, &doc.ExpiryDate, &tags,
			&doc.PersonID, &doc.PropertyID, &doc.VehicleID, &doc.InsurancePolicyID,
			&doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		doc.Tags = tags
		doc.PopulateComputedFields()
		docs = append(docs, &doc)
	}

	return docs, nil
}

func (r *DocumentRepository) Create(ctx context.Context, doc *models.Document) error {
	query := `
		INSERT INTO documents (
			household_id, name, description, category,
			url, file_type, file_size,
			document_date, expiry_date, tags,
			person_id, property_id, vehicle_id, insurance_policy_id,
			notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		) RETURNING id, created_at, updated_at
	`

	return r.pool.QueryRow(ctx, query,
		doc.HouseholdID, doc.Name, doc.Description, doc.Category,
		doc.URL, doc.FileType, doc.FileSize,
		doc.DocumentDate, doc.ExpiryDate, pq.Array(doc.Tags),
		doc.PersonID, doc.PropertyID, doc.VehicleID, doc.InsurancePolicyID,
		doc.Notes,
	).Scan(&doc.ID, &doc.CreatedAt, &doc.UpdatedAt)
}

func (r *DocumentRepository) Update(ctx context.Context, doc *models.Document) error {
	query := `
		UPDATE documents SET
			name = $2, description = $3, category = $4,
			url = $5, file_type = $6, file_size = $7,
			document_date = $8, expiry_date = $9, tags = $10,
			person_id = $11, property_id = $12, vehicle_id = $13, insurance_policy_id = $14,
			notes = $15
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		doc.ID,
		doc.Name, doc.Description, doc.Category,
		doc.URL, doc.FileType, doc.FileSize,
		doc.DocumentDate, doc.ExpiryDate, pq.Array(doc.Tags),
		doc.PersonID, doc.PropertyID, doc.VehicleID, doc.InsurancePolicyID,
		doc.Notes,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrDocumentNotFound
	}
	return nil
}

func (r *DocumentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM documents WHERE id = $1`
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrDocumentNotFound
	}
	return nil
}

func (r *DocumentRepository) SearchByTags(ctx context.Context, householdID uuid.UUID, tags []string) ([]*models.Document, error) {
	query := `
		SELECT id, household_id, name, description, category,
			url, file_type, file_size,
			document_date, expiry_date, tags,
			person_id, property_id, vehicle_id, insurance_policy_id,
			notes, created_at, updated_at
		FROM documents
		WHERE household_id = $1 AND tags && $2
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, householdID, pq.Array(tags))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	for rows.Next() {
		var doc models.Document
		var docTags []string
		err := rows.Scan(
			&doc.ID, &doc.HouseholdID, &doc.Name, &doc.Description, &doc.Category,
			&doc.URL, &doc.FileType, &doc.FileSize,
			&doc.DocumentDate, &doc.ExpiryDate, &docTags,
			&doc.PersonID, &doc.PropertyID, &doc.VehicleID, &doc.InsurancePolicyID,
			&doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		doc.Tags = docTags
		doc.PopulateComputedFields()
		docs = append(docs, &doc)
	}

	return docs, nil
}

func (r *DocumentRepository) GetCountByCategory(ctx context.Context, householdID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT category, COUNT(*) as count
		FROM documents
		WHERE household_id = $1
		GROUP BY category
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var category string
		var count int
		if err := rows.Scan(&category, &count); err != nil {
			return nil, err
		}
		counts[category] = count
	}

	return counts, nil
}
