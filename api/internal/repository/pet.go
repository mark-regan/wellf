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
	ErrPetNotFound = errors.New("pet not found")
)

type PetRepository struct {
	pool *pgxpool.Pool
}

func NewPetRepository(pool *pgxpool.Pool) *PetRepository {
	return &PetRepository{pool: pool}
}

// Create creates a new pet
func (r *PetRepository) Create(ctx context.Context, pet *models.Pet) error {
	pet.ID = uuid.New()
	pet.CreatedAt = time.Now()
	pet.UpdatedAt = time.Now()

	query := `
		INSERT INTO pets (
			id, household_id, name, pet_type, breed, date_of_birth, gender,
			microchip_number, vet_name, vet_phone, vet_address,
			insurance_policy_id, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		)
	`

	_, err := r.pool.Exec(ctx, query,
		pet.ID, pet.HouseholdID, pet.Name, pet.PetType, pet.Breed, pet.DateOfBirth, pet.Gender,
		pet.MicrochipNumber, pet.VetName, pet.VetPhone, pet.VetAddress,
		pet.InsurancePolicyID, pet.Notes, pet.CreatedAt, pet.UpdatedAt,
	)

	return err
}

// GetByID retrieves a pet by ID
func (r *PetRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Pet, error) {
	query := `
		SELECT id, household_id, name, pet_type, breed, date_of_birth, gender,
			   microchip_number, vet_name, vet_phone, vet_address,
			   insurance_policy_id, notes, created_at, updated_at
		FROM pets
		WHERE id = $1
	`

	pet, err := r.scanPet(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPetNotFound
		}
		return nil, err
	}

	pet.CalculateAge()
	return pet, nil
}

// GetByHouseholdID retrieves all pets for a household
func (r *PetRepository) GetByHouseholdID(ctx context.Context, householdID uuid.UUID) ([]*models.Pet, error) {
	query := `
		SELECT id, household_id, name, pet_type, breed, date_of_birth, gender,
			   microchip_number, vet_name, vet_phone, vet_address,
			   insurance_policy_id, notes, created_at, updated_at
		FROM pets
		WHERE household_id = $1
		ORDER BY name ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pets []*models.Pet
	for rows.Next() {
		pet, err := r.scanPetFromRows(rows)
		if err != nil {
			return nil, err
		}
		pet.CalculateAge()
		pets = append(pets, pet)
	}

	return pets, rows.Err()
}

// Update updates a pet
func (r *PetRepository) Update(ctx context.Context, pet *models.Pet) error {
	pet.UpdatedAt = time.Now()

	query := `
		UPDATE pets SET
			name = $2, pet_type = $3, breed = $4, date_of_birth = $5, gender = $6,
			microchip_number = $7, vet_name = $8, vet_phone = $9, vet_address = $10,
			insurance_policy_id = $11, notes = $12, updated_at = $13
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		pet.ID, pet.Name, pet.PetType, pet.Breed, pet.DateOfBirth, pet.Gender,
		pet.MicrochipNumber, pet.VetName, pet.VetPhone, pet.VetAddress,
		pet.InsurancePolicyID, pet.Notes, pet.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPetNotFound
	}
	return nil
}

// Delete deletes a pet
func (r *PetRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx, "DELETE FROM pets WHERE id = $1", id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPetNotFound
	}
	return nil
}

// BelongsToHousehold checks if a pet belongs to a household
func (r *PetRepository) BelongsToHousehold(ctx context.Context, petID, householdID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM pets WHERE id = $1 AND household_id = $2)",
		petID, householdID,
	).Scan(&exists)
	return exists, err
}

// CountByHouseholdID returns the count of pets in a household
func (r *PetRepository) CountByHouseholdID(ctx context.Context, householdID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM pets WHERE household_id = $1",
		householdID,
	).Scan(&count)
	return count, err
}

func (r *PetRepository) scanPet(row pgx.Row) (*models.Pet, error) {
	var p models.Pet

	err := row.Scan(
		&p.ID, &p.HouseholdID, &p.Name, &p.PetType, &p.Breed, &p.DateOfBirth, &p.Gender,
		&p.MicrochipNumber, &p.VetName, &p.VetPhone, &p.VetAddress,
		&p.InsurancePolicyID, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &p, nil
}

func (r *PetRepository) scanPetFromRows(rows pgx.Rows) (*models.Pet, error) {
	var p models.Pet

	err := rows.Scan(
		&p.ID, &p.HouseholdID, &p.Name, &p.PetType, &p.Breed, &p.DateOfBirth, &p.Gender,
		&p.MicrochipNumber, &p.VetName, &p.VetPhone, &p.VetAddress,
		&p.InsurancePolicyID, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &p, nil
}
