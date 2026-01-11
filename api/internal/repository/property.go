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
	"github.com/shopspring/decimal"
)

var (
	ErrPropertyNotFound = errors.New("property not found")
	ErrOwnerNotFound    = errors.New("property owner not found")
)

type PropertyRepository struct {
	pool *pgxpool.Pool
}

func NewPropertyRepository(pool *pgxpool.Pool) *PropertyRepository {
	return &PropertyRepository{pool: pool}
}

// Create creates a new property
func (r *PropertyRepository) Create(ctx context.Context, property *models.Property) error {
	property.ID = uuid.New()
	property.CreatedAt = time.Now()
	property.UpdatedAt = time.Now()
	if property.Currency == "" {
		property.Currency = "GBP"
	}

	metadataJSON, _ := json.Marshal(property.Metadata)
	if property.Metadata == nil {
		metadataJSON = []byte("{}")
	}

	query := `
		INSERT INTO properties (
			id, household_id, name, property_type,
			address_line1, address_line2, city, county, postcode, country,
			purchase_date, purchase_price, current_value, currency,
			bedrooms, bathrooms, square_feet, land_registry_title,
			epc_rating, council_tax_band, is_primary_residence, is_rental, rental_income,
			mortgage_provider, mortgage_account_number, mortgage_balance,
			mortgage_rate, mortgage_end_date, mortgage_monthly_payment,
			notes, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
			$21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
		)
	`

	_, err := r.pool.Exec(ctx, query,
		property.ID, property.HouseholdID, property.Name, property.PropertyType,
		property.AddressLine1, property.AddressLine2, property.City, property.County, property.Postcode, property.Country,
		property.PurchaseDate, property.PurchasePrice, property.CurrentValue, property.Currency,
		property.Bedrooms, property.Bathrooms, property.SquareFeet, property.LandRegistryTitle,
		property.EPCRating, property.CouncilTaxBand, property.IsPrimaryResidence, property.IsRental, property.RentalIncome,
		property.MortgageProvider, property.MortgageAccountNumber, property.MortgageBalance,
		property.MortgageRate, property.MortgageEndDate, property.MortgageMonthlyPayment,
		property.Notes, metadataJSON, property.CreatedAt, property.UpdatedAt,
	)

	return err
}

// GetByID retrieves a property by ID
func (r *PropertyRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Property, error) {
	query := `
		SELECT id, household_id, name, property_type,
			   address_line1, address_line2, city, county, postcode, country,
			   purchase_date, purchase_price, current_value, currency,
			   bedrooms, bathrooms, square_feet, land_registry_title,
			   epc_rating, council_tax_band, is_primary_residence, is_rental, rental_income,
			   mortgage_provider, mortgage_account_number, mortgage_balance,
			   mortgage_rate, mortgage_end_date, mortgage_monthly_payment,
			   notes, metadata, created_at, updated_at
		FROM properties
		WHERE id = $1
	`

	property, err := r.scanProperty(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPropertyNotFound
		}
		return nil, err
	}

	// Get owners
	owners, err := r.GetOwners(ctx, id)
	if err == nil {
		property.Owners = owners
	}

	// Calculate equity
	equity := property.CalculateEquity()
	property.Equity = &equity

	return property, nil
}

// GetByHouseholdID retrieves all properties for a household
func (r *PropertyRepository) GetByHouseholdID(ctx context.Context, householdID uuid.UUID) ([]*models.Property, error) {
	query := `
		SELECT id, household_id, name, property_type,
			   address_line1, address_line2, city, county, postcode, country,
			   purchase_date, purchase_price, current_value, currency,
			   bedrooms, bathrooms, square_feet, land_registry_title,
			   epc_rating, council_tax_band, is_primary_residence, is_rental, rental_income,
			   mortgage_provider, mortgage_account_number, mortgage_balance,
			   mortgage_rate, mortgage_end_date, mortgage_monthly_payment,
			   notes, metadata, created_at, updated_at
		FROM properties
		WHERE household_id = $1
		ORDER BY is_primary_residence DESC, name ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var properties []*models.Property
	for rows.Next() {
		property, err := r.scanPropertyFromRows(rows)
		if err != nil {
			return nil, err
		}
		equity := property.CalculateEquity()
		property.Equity = &equity
		properties = append(properties, property)
	}

	return properties, rows.Err()
}

// Update updates a property
func (r *PropertyRepository) Update(ctx context.Context, property *models.Property) error {
	property.UpdatedAt = time.Now()

	metadataJSON, _ := json.Marshal(property.Metadata)
	if property.Metadata == nil {
		metadataJSON = []byte("{}")
	}

	query := `
		UPDATE properties SET
			name = $2, property_type = $3,
			address_line1 = $4, address_line2 = $5, city = $6, county = $7, postcode = $8, country = $9,
			purchase_date = $10, purchase_price = $11, current_value = $12, currency = $13,
			bedrooms = $14, bathrooms = $15, square_feet = $16, land_registry_title = $17,
			epc_rating = $18, council_tax_band = $19, is_primary_residence = $20, is_rental = $21, rental_income = $22,
			mortgage_provider = $23, mortgage_account_number = $24, mortgage_balance = $25,
			mortgage_rate = $26, mortgage_end_date = $27, mortgage_monthly_payment = $28,
			notes = $29, metadata = $30, updated_at = $31
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		property.ID, property.Name, property.PropertyType,
		property.AddressLine1, property.AddressLine2, property.City, property.County, property.Postcode, property.Country,
		property.PurchaseDate, property.PurchasePrice, property.CurrentValue, property.Currency,
		property.Bedrooms, property.Bathrooms, property.SquareFeet, property.LandRegistryTitle,
		property.EPCRating, property.CouncilTaxBand, property.IsPrimaryResidence, property.IsRental, property.RentalIncome,
		property.MortgageProvider, property.MortgageAccountNumber, property.MortgageBalance,
		property.MortgageRate, property.MortgageEndDate, property.MortgageMonthlyPayment,
		property.Notes, metadataJSON, property.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPropertyNotFound
	}
	return nil
}

// Delete deletes a property
func (r *PropertyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx, "DELETE FROM properties WHERE id = $1", id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPropertyNotFound
	}
	return nil
}

// AddOwner adds an owner to a property
func (r *PropertyRepository) AddOwner(ctx context.Context, owner *models.PropertyOwner) error {
	owner.ID = uuid.New()
	owner.CreatedAt = time.Now()

	query := `
		INSERT INTO property_owners (id, property_id, person_id, ownership_percentage, ownership_type, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.pool.Exec(ctx, query,
		owner.ID, owner.PropertyID, owner.PersonID,
		owner.OwnershipPercentage, owner.OwnershipType, owner.CreatedAt,
	)
	return err
}

// RemoveOwner removes an owner from a property
func (r *PropertyRepository) RemoveOwner(ctx context.Context, propertyID, personID uuid.UUID) error {
	result, err := r.pool.Exec(ctx,
		"DELETE FROM property_owners WHERE property_id = $1 AND person_id = $2",
		propertyID, personID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrOwnerNotFound
	}
	return nil
}

// GetOwners returns all owners of a property
func (r *PropertyRepository) GetOwners(ctx context.Context, propertyID uuid.UUID) ([]models.PropertyOwner, error) {
	query := `
		SELECT po.id, po.property_id, po.person_id, po.ownership_percentage, po.ownership_type, po.created_at,
			   p.id, p.first_name, p.last_name, p.avatar_url
		FROM property_owners po
		INNER JOIN people p ON p.id = po.person_id
		WHERE po.property_id = $1
		ORDER BY po.ownership_percentage DESC
	`

	rows, err := r.pool.Query(ctx, query, propertyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var owners []models.PropertyOwner
	for rows.Next() {
		var owner models.PropertyOwner
		var person models.Person
		var ownershipType *string

		err := rows.Scan(
			&owner.ID, &owner.PropertyID, &owner.PersonID, &owner.OwnershipPercentage, &ownershipType, &owner.CreatedAt,
			&person.ID, &person.FirstName, &person.LastName, &person.AvatarURL,
		)
		if err != nil {
			return nil, err
		}
		if ownershipType != nil {
			owner.OwnershipType = *ownershipType
		}
		owner.Person = &person
		owners = append(owners, owner)
	}

	return owners, rows.Err()
}

// BelongsToHousehold checks if a property belongs to a household
func (r *PropertyRepository) BelongsToHousehold(ctx context.Context, propertyID, householdID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM properties WHERE id = $1 AND household_id = $2)",
		propertyID, householdID,
	).Scan(&exists)
	return exists, err
}

func (r *PropertyRepository) scanProperty(row pgx.Row) (*models.Property, error) {
	var p models.Property
	var metadataJSON []byte

	err := row.Scan(
		&p.ID, &p.HouseholdID, &p.Name, &p.PropertyType,
		&p.AddressLine1, &p.AddressLine2, &p.City, &p.County, &p.Postcode, &p.Country,
		&p.PurchaseDate, &p.PurchasePrice, &p.CurrentValue, &p.Currency,
		&p.Bedrooms, &p.Bathrooms, &p.SquareFeet, &p.LandRegistryTitle,
		&p.EPCRating, &p.CouncilTaxBand, &p.IsPrimaryResidence, &p.IsRental, &p.RentalIncome,
		&p.MortgageProvider, &p.MortgageAccountNumber, &p.MortgageBalance,
		&p.MortgageRate, &p.MortgageEndDate, &p.MortgageMonthlyPayment,
		&p.Notes, &metadataJSON, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &p.Metadata)
	}

	return &p, nil
}

func (r *PropertyRepository) scanPropertyFromRows(rows pgx.Rows) (*models.Property, error) {
	var p models.Property
	var metadataJSON []byte

	err := rows.Scan(
		&p.ID, &p.HouseholdID, &p.Name, &p.PropertyType,
		&p.AddressLine1, &p.AddressLine2, &p.City, &p.County, &p.Postcode, &p.Country,
		&p.PurchaseDate, &p.PurchasePrice, &p.CurrentValue, &p.Currency,
		&p.Bedrooms, &p.Bathrooms, &p.SquareFeet, &p.LandRegistryTitle,
		&p.EPCRating, &p.CouncilTaxBand, &p.IsPrimaryResidence, &p.IsRental, &p.RentalIncome,
		&p.MortgageProvider, &p.MortgageAccountNumber, &p.MortgageBalance,
		&p.MortgageRate, &p.MortgageEndDate, &p.MortgageMonthlyPayment,
		&p.Notes, &metadataJSON, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &p.Metadata)
	}

	return &p, nil
}

// GetTotalPropertyValue returns total value of all properties in a household
func (r *PropertyRepository) GetTotalPropertyValue(ctx context.Context, householdID uuid.UUID) (decimal.Decimal, error) {
	var total decimal.NullDecimal
	err := r.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(current_value), 0) FROM properties WHERE household_id = $1",
		householdID,
	).Scan(&total)
	if err != nil {
		return decimal.Zero, err
	}
	if total.Valid {
		return total.Decimal, nil
	}
	return decimal.Zero, nil
}

// GetTotalMortgageBalance returns total mortgage balance for a household
func (r *PropertyRepository) GetTotalMortgageBalance(ctx context.Context, householdID uuid.UUID) (decimal.Decimal, error) {
	var total decimal.NullDecimal
	err := r.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(mortgage_balance), 0) FROM properties WHERE household_id = $1",
		householdID,
	).Scan(&total)
	if err != nil {
		return decimal.Zero, err
	}
	if total.Valid {
		return total.Decimal, nil
	}
	return decimal.Zero, nil
}
