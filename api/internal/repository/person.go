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
	ErrPersonNotFound         = errors.New("person not found")
	ErrRelationshipNotFound   = errors.New("relationship not found")
	ErrRelationshipExists     = errors.New("relationship already exists")
	ErrSelfRelationship       = errors.New("cannot create relationship with self")
)

type PersonRepository struct {
	pool *pgxpool.Pool
}

func NewPersonRepository(pool *pgxpool.Pool) *PersonRepository {
	return &PersonRepository{pool: pool}
}

// Create creates a new person
func (r *PersonRepository) Create(ctx context.Context, person *models.Person) error {
	person.ID = uuid.New()
	person.CreatedAt = time.Now()
	person.UpdatedAt = time.Now()

	var metadataJSON []byte
	var err error
	if person.Metadata != nil {
		metadataJSON, err = json.Marshal(person.Metadata)
		if err != nil {
			return err
		}
	} else {
		metadataJSON = []byte("{}")
	}

	query := `
		INSERT INTO people (
			id, household_id, user_id, first_name, last_name, nickname,
			date_of_birth, gender, email, phone,
			national_insurance_number, passport_number, driving_licence_number,
			blood_type, medical_notes, emergency_contact_name, emergency_contact_phone,
			avatar_url, is_primary_account_holder, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		)
	`

	_, err = r.pool.Exec(ctx, query,
		person.ID,
		person.HouseholdID,
		person.UserID,
		person.FirstName,
		person.LastName,
		person.Nickname,
		person.DateOfBirth,
		person.Gender,
		person.Email,
		person.Phone,
		person.NationalInsuranceNumber,
		person.PassportNumber,
		person.DrivingLicenceNumber,
		person.BloodType,
		person.MedicalNotes,
		person.EmergencyContactName,
		person.EmergencyContactPhone,
		person.AvatarURL,
		person.IsPrimaryAccountHolder,
		metadataJSON,
		person.CreatedAt,
		person.UpdatedAt,
	)

	return err
}

// GetByID retrieves a person by ID
func (r *PersonRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Person, error) {
	query := `
		SELECT id, household_id, user_id, first_name, last_name, nickname,
			   date_of_birth, gender, email, phone,
			   national_insurance_number, passport_number, driving_licence_number,
			   blood_type, medical_notes, emergency_contact_name, emergency_contact_phone,
			   avatar_url, is_primary_account_holder, metadata, created_at, updated_at
		FROM people
		WHERE id = $1
	`

	person, err := r.scanPerson(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPersonNotFound
		}
		return nil, err
	}

	return person, nil
}

// GetByHouseholdID retrieves all people in a household
func (r *PersonRepository) GetByHouseholdID(ctx context.Context, householdID uuid.UUID) ([]*models.Person, error) {
	query := `
		SELECT id, household_id, user_id, first_name, last_name, nickname,
			   date_of_birth, gender, email, phone,
			   national_insurance_number, passport_number, driving_licence_number,
			   blood_type, medical_notes, emergency_contact_name, emergency_contact_phone,
			   avatar_url, is_primary_account_holder, metadata, created_at, updated_at
		FROM people
		WHERE household_id = $1
		ORDER BY is_primary_account_holder DESC, first_name ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var people []*models.Person
	for rows.Next() {
		person, err := r.scanPersonFromRows(rows)
		if err != nil {
			return nil, err
		}
		people = append(people, person)
	}

	return people, rows.Err()
}

// GetByUserID retrieves a person linked to a specific user account
func (r *PersonRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.Person, error) {
	query := `
		SELECT id, household_id, user_id, first_name, last_name, nickname,
			   date_of_birth, gender, email, phone,
			   national_insurance_number, passport_number, driving_licence_number,
			   blood_type, medical_notes, emergency_contact_name, emergency_contact_phone,
			   avatar_url, is_primary_account_holder, metadata, created_at, updated_at
		FROM people
		WHERE user_id = $1
		LIMIT 1
	`

	person, err := r.scanPerson(r.pool.QueryRow(ctx, query, userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPersonNotFound
		}
		return nil, err
	}

	return person, nil
}

// Update updates a person
func (r *PersonRepository) Update(ctx context.Context, person *models.Person) error {
	person.UpdatedAt = time.Now()

	var metadataJSON []byte
	var err error
	if person.Metadata != nil {
		metadataJSON, err = json.Marshal(person.Metadata)
		if err != nil {
			return err
		}
	} else {
		metadataJSON = []byte("{}")
	}

	query := `
		UPDATE people SET
			first_name = $2, last_name = $3, nickname = $4,
			date_of_birth = $5, gender = $6, email = $7, phone = $8,
			national_insurance_number = $9, passport_number = $10, driving_licence_number = $11,
			blood_type = $12, medical_notes = $13, emergency_contact_name = $14, emergency_contact_phone = $15,
			avatar_url = $16, is_primary_account_holder = $17, metadata = $18, updated_at = $19
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		person.ID,
		person.FirstName,
		person.LastName,
		person.Nickname,
		person.DateOfBirth,
		person.Gender,
		person.Email,
		person.Phone,
		person.NationalInsuranceNumber,
		person.PassportNumber,
		person.DrivingLicenceNumber,
		person.BloodType,
		person.MedicalNotes,
		person.EmergencyContactName,
		person.EmergencyContactPhone,
		person.AvatarURL,
		person.IsPrimaryAccountHolder,
		metadataJSON,
		person.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrPersonNotFound
	}

	return nil
}

// Delete deletes a person
func (r *PersonRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM people WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrPersonNotFound
	}

	return nil
}

// BelongsToHousehold checks if a person belongs to a household
func (r *PersonRepository) BelongsToHousehold(ctx context.Context, personID, householdID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM people WHERE id = $1 AND household_id = $2)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, personID, householdID).Scan(&exists)
	return exists, err
}

// AddRelationship creates a relationship between two people
// Also creates the inverse relationship automatically
func (r *PersonRepository) AddRelationship(ctx context.Context, rel *models.FamilyRelationship) error {
	if rel.PersonID == rel.RelatedPersonID {
		return ErrSelfRelationship
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	rel.ID = uuid.New()
	rel.CreatedAt = time.Now()

	// Create primary relationship
	query := `
		INSERT INTO family_relationships (id, household_id, person_id, related_person_id, relationship_type, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err = tx.Exec(ctx, query,
		rel.ID,
		rel.HouseholdID,
		rel.PersonID,
		rel.RelatedPersonID,
		rel.RelationshipType,
		rel.CreatedAt,
	)
	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrRelationshipExists
		}
		return err
	}

	// Create inverse relationship
	inverseType := models.GetInverseRelationship(rel.RelationshipType)
	inverseID := uuid.New()

	_, err = tx.Exec(ctx, query,
		inverseID,
		rel.HouseholdID,
		rel.RelatedPersonID,
		rel.PersonID,
		inverseType,
		rel.CreatedAt,
	)
	if err != nil {
		if isDuplicateKeyError(err) {
			// Inverse might already exist, which is fine
			return tx.Commit(ctx)
		}
		return err
	}

	return tx.Commit(ctx)
}

// RemoveRelationship removes a relationship (and its inverse)
func (r *PersonRepository) RemoveRelationship(ctx context.Context, relationshipID uuid.UUID) error {
	// First get the relationship to find the inverse
	query := `SELECT person_id, related_person_id FROM family_relationships WHERE id = $1`

	var personID, relatedPersonID uuid.UUID
	err := r.pool.QueryRow(ctx, query, relationshipID).Scan(&personID, &relatedPersonID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrRelationshipNotFound
		}
		return err
	}

	// Delete both relationships
	deleteQuery := `
		DELETE FROM family_relationships
		WHERE (person_id = $1 AND related_person_id = $2) OR (person_id = $2 AND related_person_id = $1)
	`

	_, err = r.pool.Exec(ctx, deleteQuery, personID, relatedPersonID)
	return err
}

// GetRelationships returns all relationships for a person
func (r *PersonRepository) GetRelationships(ctx context.Context, personID uuid.UUID) ([]models.FamilyRelationship, error) {
	query := `
		SELECT fr.id, fr.household_id, fr.person_id, fr.related_person_id, fr.relationship_type, fr.created_at,
			   p.id, p.first_name, p.last_name, p.nickname, p.avatar_url
		FROM family_relationships fr
		INNER JOIN people p ON p.id = fr.related_person_id
		WHERE fr.person_id = $1
		ORDER BY fr.relationship_type, p.first_name
	`

	rows, err := r.pool.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var relationships []models.FamilyRelationship
	for rows.Next() {
		var rel models.FamilyRelationship
		var relatedPerson models.Person
		err := rows.Scan(
			&rel.ID,
			&rel.HouseholdID,
			&rel.PersonID,
			&rel.RelatedPersonID,
			&rel.RelationshipType,
			&rel.CreatedAt,
			&relatedPerson.ID,
			&relatedPerson.FirstName,
			&relatedPerson.LastName,
			&relatedPerson.Nickname,
			&relatedPerson.AvatarURL,
		)
		if err != nil {
			return nil, err
		}
		rel.RelatedPerson = &relatedPerson
		relationships = append(relationships, rel)
	}

	return relationships, rows.Err()
}

// Helper to scan a single person from QueryRow
func (r *PersonRepository) scanPerson(row pgx.Row) (*models.Person, error) {
	var person models.Person
	var metadataJSON []byte

	err := row.Scan(
		&person.ID,
		&person.HouseholdID,
		&person.UserID,
		&person.FirstName,
		&person.LastName,
		&person.Nickname,
		&person.DateOfBirth,
		&person.Gender,
		&person.Email,
		&person.Phone,
		&person.NationalInsuranceNumber,
		&person.PassportNumber,
		&person.DrivingLicenceNumber,
		&person.BloodType,
		&person.MedicalNotes,
		&person.EmergencyContactName,
		&person.EmergencyContactPhone,
		&person.AvatarURL,
		&person.IsPrimaryAccountHolder,
		&metadataJSON,
		&person.CreatedAt,
		&person.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(metadataJSON) > 0 && string(metadataJSON) != "{}" {
		var metadata models.PersonMetadata
		if err := json.Unmarshal(metadataJSON, &metadata); err == nil {
			person.Metadata = &metadata
		}
	}

	// Calculate computed fields
	person.Age = person.CalculateAge()
	person.FullName = person.GetFullName()

	return &person, nil
}

// Helper to scan a person from rows
func (r *PersonRepository) scanPersonFromRows(rows pgx.Rows) (*models.Person, error) {
	var person models.Person
	var metadataJSON []byte

	err := rows.Scan(
		&person.ID,
		&person.HouseholdID,
		&person.UserID,
		&person.FirstName,
		&person.LastName,
		&person.Nickname,
		&person.DateOfBirth,
		&person.Gender,
		&person.Email,
		&person.Phone,
		&person.NationalInsuranceNumber,
		&person.PassportNumber,
		&person.DrivingLicenceNumber,
		&person.BloodType,
		&person.MedicalNotes,
		&person.EmergencyContactName,
		&person.EmergencyContactPhone,
		&person.AvatarURL,
		&person.IsPrimaryAccountHolder,
		&metadataJSON,
		&person.CreatedAt,
		&person.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(metadataJSON) > 0 && string(metadataJSON) != "{}" {
		var metadata models.PersonMetadata
		if err := json.Unmarshal(metadataJSON, &metadata); err == nil {
			person.Metadata = &metadata
		}
	}

	// Calculate computed fields
	person.Age = person.CalculateAge()
	person.FullName = person.GetFullName()

	return &person, nil
}
