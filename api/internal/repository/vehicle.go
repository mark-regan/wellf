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
	ErrVehicleNotFound       = errors.New("vehicle not found")
	ErrVehicleUserNotFound   = errors.New("vehicle user not found")
	ErrServiceRecordNotFound = errors.New("service record not found")
)

type VehicleRepository struct {
	pool *pgxpool.Pool
}

func NewVehicleRepository(pool *pgxpool.Pool) *VehicleRepository {
	return &VehicleRepository{pool: pool}
}

// Create creates a new vehicle
func (r *VehicleRepository) Create(ctx context.Context, vehicle *models.Vehicle) error {
	vehicle.ID = uuid.New()
	vehicle.CreatedAt = time.Now()
	vehicle.UpdatedAt = time.Now()
	if vehicle.Currency == "" {
		vehicle.Currency = "GBP"
	}

	metadataJSON, _ := json.Marshal(vehicle.Metadata)
	if vehicle.Metadata == nil {
		metadataJSON = []byte("{}")
	}

	query := `
		INSERT INTO vehicles (
			id, household_id, name, vehicle_type, make, model, year,
			registration, vin, color, fuel_type, transmission, engine_size, mileage,
			purchase_date, purchase_price, current_value, currency,
			mot_expiry, tax_expiry, insurance_expiry, insurance_provider, insurance_policy_number,
			finance_provider, finance_end_date, finance_monthly_payment, finance_balance,
			notes, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
		)
	`

	_, err := r.pool.Exec(ctx, query,
		vehicle.ID, vehicle.HouseholdID, vehicle.Name, vehicle.VehicleType,
		vehicle.Make, vehicle.Model, vehicle.Year,
		vehicle.Registration, vehicle.VIN, vehicle.Color, vehicle.FuelType, vehicle.Transmission, vehicle.EngineSize, vehicle.Mileage,
		vehicle.PurchaseDate, vehicle.PurchasePrice, vehicle.CurrentValue, vehicle.Currency,
		vehicle.MOTExpiry, vehicle.TaxExpiry, vehicle.InsuranceExpiry, vehicle.InsuranceProvider, vehicle.InsurancePolicyNumber,
		vehicle.FinanceProvider, vehicle.FinanceEndDate, vehicle.FinanceMonthlyPayment, vehicle.FinanceBalance,
		vehicle.Notes, metadataJSON, vehicle.CreatedAt, vehicle.UpdatedAt,
	)

	return err
}

// GetByID retrieves a vehicle by ID
func (r *VehicleRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error) {
	query := `
		SELECT id, household_id, name, vehicle_type, make, model, year,
			   registration, vin, color, fuel_type, transmission, engine_size, mileage,
			   purchase_date, purchase_price, current_value, currency,
			   mot_expiry, tax_expiry, insurance_expiry, insurance_provider, insurance_policy_number,
			   finance_provider, finance_end_date, finance_monthly_payment, finance_balance,
			   notes, metadata, created_at, updated_at
		FROM vehicles
		WHERE id = $1
	`

	vehicle, err := r.scanVehicle(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVehicleNotFound
		}
		return nil, err
	}

	// Get users
	users, err := r.GetUsers(ctx, id)
	if err == nil {
		vehicle.Users = users
	}

	// Get recent service records
	records, err := r.GetServiceRecords(ctx, id, 5)
	if err == nil {
		vehicle.ServiceRecords = records
	}

	vehicle.PopulateComputedFields()

	return vehicle, nil
}

// GetByHouseholdID retrieves all vehicles for a household
func (r *VehicleRepository) GetByHouseholdID(ctx context.Context, householdID uuid.UUID) ([]*models.Vehicle, error) {
	query := `
		SELECT id, household_id, name, vehicle_type, make, model, year,
			   registration, vin, color, fuel_type, transmission, engine_size, mileage,
			   purchase_date, purchase_price, current_value, currency,
			   mot_expiry, tax_expiry, insurance_expiry, insurance_provider, insurance_policy_number,
			   finance_provider, finance_end_date, finance_monthly_payment, finance_balance,
			   notes, metadata, created_at, updated_at
		FROM vehicles
		WHERE household_id = $1
		ORDER BY name ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []*models.Vehicle
	for rows.Next() {
		vehicle, err := r.scanVehicleFromRows(rows)
		if err != nil {
			return nil, err
		}
		vehicle.PopulateComputedFields()
		vehicles = append(vehicles, vehicle)
	}

	return vehicles, rows.Err()
}

// Update updates a vehicle
func (r *VehicleRepository) Update(ctx context.Context, vehicle *models.Vehicle) error {
	vehicle.UpdatedAt = time.Now()

	metadataJSON, _ := json.Marshal(vehicle.Metadata)
	if vehicle.Metadata == nil {
		metadataJSON = []byte("{}")
	}

	query := `
		UPDATE vehicles SET
			name = $2, vehicle_type = $3, make = $4, model = $5, year = $6,
			registration = $7, vin = $8, color = $9, fuel_type = $10, transmission = $11, engine_size = $12, mileage = $13,
			purchase_date = $14, purchase_price = $15, current_value = $16, currency = $17,
			mot_expiry = $18, tax_expiry = $19, insurance_expiry = $20, insurance_provider = $21, insurance_policy_number = $22,
			finance_provider = $23, finance_end_date = $24, finance_monthly_payment = $25, finance_balance = $26,
			notes = $27, metadata = $28, updated_at = $29
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		vehicle.ID, vehicle.Name, vehicle.VehicleType, vehicle.Make, vehicle.Model, vehicle.Year,
		vehicle.Registration, vehicle.VIN, vehicle.Color, vehicle.FuelType, vehicle.Transmission, vehicle.EngineSize, vehicle.Mileage,
		vehicle.PurchaseDate, vehicle.PurchasePrice, vehicle.CurrentValue, vehicle.Currency,
		vehicle.MOTExpiry, vehicle.TaxExpiry, vehicle.InsuranceExpiry, vehicle.InsuranceProvider, vehicle.InsurancePolicyNumber,
		vehicle.FinanceProvider, vehicle.FinanceEndDate, vehicle.FinanceMonthlyPayment, vehicle.FinanceBalance,
		vehicle.Notes, metadataJSON, vehicle.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrVehicleNotFound
	}
	return nil
}

// Delete deletes a vehicle
func (r *VehicleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx, "DELETE FROM vehicles WHERE id = $1", id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrVehicleNotFound
	}
	return nil
}

// AddUser adds a user to a vehicle
func (r *VehicleRepository) AddUser(ctx context.Context, user *models.VehicleUser) error {
	user.ID = uuid.New()
	user.CreatedAt = time.Now()

	query := `
		INSERT INTO vehicle_users (id, vehicle_id, person_id, is_primary_driver, is_named_on_insurance, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.pool.Exec(ctx, query,
		user.ID, user.VehicleID, user.PersonID,
		user.IsPrimaryDriver, user.IsNamedOnInsurance, user.CreatedAt,
	)
	return err
}

// RemoveUser removes a user from a vehicle
func (r *VehicleRepository) RemoveUser(ctx context.Context, vehicleID, personID uuid.UUID) error {
	result, err := r.pool.Exec(ctx,
		"DELETE FROM vehicle_users WHERE vehicle_id = $1 AND person_id = $2",
		vehicleID, personID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrVehicleUserNotFound
	}
	return nil
}

// GetUsers returns all users of a vehicle
func (r *VehicleRepository) GetUsers(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleUser, error) {
	query := `
		SELECT vu.id, vu.vehicle_id, vu.person_id, vu.is_primary_driver, vu.is_named_on_insurance, vu.created_at,
			   p.id, p.first_name, p.last_name, p.avatar_url
		FROM vehicle_users vu
		INNER JOIN people p ON p.id = vu.person_id
		WHERE vu.vehicle_id = $1
		ORDER BY vu.is_primary_driver DESC, p.first_name ASC
	`

	rows, err := r.pool.Query(ctx, query, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.VehicleUser
	for rows.Next() {
		var user models.VehicleUser
		var person models.Person

		err := rows.Scan(
			&user.ID, &user.VehicleID, &user.PersonID, &user.IsPrimaryDriver, &user.IsNamedOnInsurance, &user.CreatedAt,
			&person.ID, &person.FirstName, &person.LastName, &person.AvatarURL,
		)
		if err != nil {
			return nil, err
		}
		user.Person = &person
		users = append(users, user)
	}

	return users, rows.Err()
}

// AddServiceRecord adds a service record to a vehicle
func (r *VehicleRepository) AddServiceRecord(ctx context.Context, record *models.VehicleServiceRecord) error {
	record.ID = uuid.New()
	record.CreatedAt = time.Now()
	if record.Currency == "" {
		record.Currency = "GBP"
	}

	query := `
		INSERT INTO vehicle_service_records (
			id, vehicle_id, service_type, service_date, mileage,
			provider, description, cost, currency,
			next_service_date, next_service_mileage, notes, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := r.pool.Exec(ctx, query,
		record.ID, record.VehicleID, record.ServiceType, record.ServiceDate, record.Mileage,
		record.Provider, record.Description, record.Cost, record.Currency,
		record.NextServiceDate, record.NextServiceMileage, record.Notes, record.CreatedAt,
	)
	return err
}

// DeleteServiceRecord deletes a service record
func (r *VehicleRepository) DeleteServiceRecord(ctx context.Context, recordID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, "DELETE FROM vehicle_service_records WHERE id = $1", recordID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrServiceRecordNotFound
	}
	return nil
}

// GetServiceRecords returns service records for a vehicle
func (r *VehicleRepository) GetServiceRecords(ctx context.Context, vehicleID uuid.UUID, limit int) ([]models.VehicleServiceRecord, error) {
	query := `
		SELECT id, vehicle_id, service_type, service_date, mileage,
			   provider, description, cost, currency,
			   next_service_date, next_service_mileage, notes, created_at
		FROM vehicle_service_records
		WHERE vehicle_id = $1
		ORDER BY service_date DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, vehicleID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []models.VehicleServiceRecord
	for rows.Next() {
		var record models.VehicleServiceRecord
		err := rows.Scan(
			&record.ID, &record.VehicleID, &record.ServiceType, &record.ServiceDate, &record.Mileage,
			&record.Provider, &record.Description, &record.Cost, &record.Currency,
			&record.NextServiceDate, &record.NextServiceMileage, &record.Notes, &record.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		records = append(records, record)
	}

	return records, rows.Err()
}

// BelongsToHousehold checks if a vehicle belongs to a household
func (r *VehicleRepository) BelongsToHousehold(ctx context.Context, vehicleID, householdID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM vehicles WHERE id = $1 AND household_id = $2)",
		vehicleID, householdID,
	).Scan(&exists)
	return exists, err
}

// GetUpcomingMOTs returns vehicles with MOT expiring soon
func (r *VehicleRepository) GetUpcomingMOTs(ctx context.Context, householdID uuid.UUID, daysAhead int) ([]*models.Vehicle, error) {
	query := `
		SELECT id, household_id, name, vehicle_type, make, model, year,
			   registration, vin, color, fuel_type, transmission, engine_size, mileage,
			   purchase_date, purchase_price, current_value, currency,
			   mot_expiry, tax_expiry, insurance_expiry, insurance_provider, insurance_policy_number,
			   finance_provider, finance_end_date, finance_monthly_payment, finance_balance,
			   notes, metadata, created_at, updated_at
		FROM vehicles
		WHERE household_id = $1 AND mot_expiry IS NOT NULL
		  AND mot_expiry <= NOW() + INTERVAL '1 day' * $2
		ORDER BY mot_expiry ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID, daysAhead)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []*models.Vehicle
	for rows.Next() {
		vehicle, err := r.scanVehicleFromRows(rows)
		if err != nil {
			return nil, err
		}
		vehicle.PopulateComputedFields()
		vehicles = append(vehicles, vehicle)
	}

	return vehicles, rows.Err()
}

func (r *VehicleRepository) scanVehicle(row pgx.Row) (*models.Vehicle, error) {
	var v models.Vehicle
	var metadataJSON []byte

	err := row.Scan(
		&v.ID, &v.HouseholdID, &v.Name, &v.VehicleType, &v.Make, &v.Model, &v.Year,
		&v.Registration, &v.VIN, &v.Color, &v.FuelType, &v.Transmission, &v.EngineSize, &v.Mileage,
		&v.PurchaseDate, &v.PurchasePrice, &v.CurrentValue, &v.Currency,
		&v.MOTExpiry, &v.TaxExpiry, &v.InsuranceExpiry, &v.InsuranceProvider, &v.InsurancePolicyNumber,
		&v.FinanceProvider, &v.FinanceEndDate, &v.FinanceMonthlyPayment, &v.FinanceBalance,
		&v.Notes, &metadataJSON, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &v.Metadata)
	}

	return &v, nil
}

func (r *VehicleRepository) scanVehicleFromRows(rows pgx.Rows) (*models.Vehicle, error) {
	var v models.Vehicle
	var metadataJSON []byte

	err := rows.Scan(
		&v.ID, &v.HouseholdID, &v.Name, &v.VehicleType, &v.Make, &v.Model, &v.Year,
		&v.Registration, &v.VIN, &v.Color, &v.FuelType, &v.Transmission, &v.EngineSize, &v.Mileage,
		&v.PurchaseDate, &v.PurchasePrice, &v.CurrentValue, &v.Currency,
		&v.MOTExpiry, &v.TaxExpiry, &v.InsuranceExpiry, &v.InsuranceProvider, &v.InsurancePolicyNumber,
		&v.FinanceProvider, &v.FinanceEndDate, &v.FinanceMonthlyPayment, &v.FinanceBalance,
		&v.Notes, &metadataJSON, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &v.Metadata)
	}

	return &v, nil
}

// GetTotalVehicleValue returns total value of all vehicles in a household
func (r *VehicleRepository) GetTotalVehicleValue(ctx context.Context, householdID uuid.UUID) (decimal.Decimal, error) {
	var total decimal.NullDecimal
	err := r.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(current_value), 0) FROM vehicles WHERE household_id = $1",
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
