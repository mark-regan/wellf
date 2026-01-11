package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Vehicle types
const (
	VehicleTypeCar        = "CAR"
	VehicleTypeMotorcycle = "MOTORCYCLE"
	VehicleTypeVan        = "VAN"
	VehicleTypeBoat       = "BOAT"
	VehicleTypeCaravan    = "CARAVAN"
	VehicleTypeOther      = "OTHER"
)

// Fuel types
const (
	FuelTypePetrol   = "PETROL"
	FuelTypeDiesel   = "DIESEL"
	FuelTypeElectric = "ELECTRIC"
	FuelTypeHybrid   = "HYBRID"
	FuelTypeOther    = "OTHER"
)

// Transmission types
const (
	TransmissionManual    = "MANUAL"
	TransmissionAutomatic = "AUTOMATIC"
)

// Service record types
const (
	ServiceTypeMOT     = "MOT"
	ServiceTypeService = "SERVICE"
	ServiceTypeRepair  = "REPAIR"
	ServiceTypeTyre    = "TYRE"
	ServiceTypeOther   = "OTHER"
)

// Vehicle represents a vehicle owned by the household
type Vehicle struct {
	ID                    uuid.UUID        `json:"id"`
	HouseholdID           uuid.UUID        `json:"household_id"`
	Name                  string           `json:"name"`
	VehicleType           string           `json:"vehicle_type"`
	Make                  string           `json:"make,omitempty"`
	Model                 string           `json:"model,omitempty"`
	Year                  *int             `json:"year,omitempty"`
	Registration          string           `json:"registration,omitempty"`
	VIN                   string           `json:"vin,omitempty"`
	Color                 string           `json:"color,omitempty"`
	FuelType              string           `json:"fuel_type,omitempty"`
	Transmission          string           `json:"transmission,omitempty"`
	EngineSize            string           `json:"engine_size,omitempty"`
	Mileage               *int             `json:"mileage,omitempty"`
	PurchaseDate          *time.Time       `json:"purchase_date,omitempty"`
	PurchasePrice         *decimal.Decimal `json:"purchase_price,omitempty"`
	CurrentValue          *decimal.Decimal `json:"current_value,omitempty"`
	Currency              string           `json:"currency"`
	MOTExpiry             *time.Time       `json:"mot_expiry,omitempty"`
	TaxExpiry             *time.Time       `json:"tax_expiry,omitempty"`
	InsuranceExpiry       *time.Time       `json:"insurance_expiry,omitempty"`
	InsuranceProvider     string           `json:"insurance_provider,omitempty"`
	InsurancePolicyNumber string           `json:"insurance_policy_number,omitempty"`
	FinanceProvider       string           `json:"finance_provider,omitempty"`
	FinanceEndDate        *time.Time       `json:"finance_end_date,omitempty"`
	FinanceMonthlyPayment *decimal.Decimal `json:"finance_monthly_payment,omitempty"`
	FinanceBalance        *decimal.Decimal `json:"finance_balance,omitempty"`
	Notes                 string           `json:"notes,omitempty"`
	Metadata              map[string]any   `json:"metadata,omitempty"`
	CreatedAt             time.Time        `json:"created_at"`
	UpdatedAt             time.Time        `json:"updated_at"`
	// Joined fields
	Users                 []VehicleUser         `json:"users,omitempty"`
	ServiceRecords        []VehicleServiceRecord `json:"service_records,omitempty"`
	// Computed fields
	DaysUntilMOT          *int             `json:"days_until_mot,omitempty"`
	DaysUntilTax          *int             `json:"days_until_tax,omitempty"`
	DaysUntilInsurance    *int             `json:"days_until_insurance,omitempty"`
}

// VehicleUser links a person to a vehicle
type VehicleUser struct {
	ID                uuid.UUID `json:"id"`
	VehicleID         uuid.UUID `json:"vehicle_id"`
	PersonID          uuid.UUID `json:"person_id"`
	IsPrimaryDriver   bool      `json:"is_primary_driver"`
	IsNamedOnInsurance bool     `json:"is_named_on_insurance"`
	CreatedAt         time.Time `json:"created_at"`
	// Joined fields
	Person            *Person   `json:"person,omitempty"`
}

// VehicleServiceRecord represents a service or maintenance record
type VehicleServiceRecord struct {
	ID                 uuid.UUID        `json:"id"`
	VehicleID          uuid.UUID        `json:"vehicle_id"`
	ServiceType        string           `json:"service_type"`
	ServiceDate        time.Time        `json:"service_date"`
	Mileage            *int             `json:"mileage,omitempty"`
	Provider           string           `json:"provider,omitempty"`
	Description        string           `json:"description,omitempty"`
	Cost               *decimal.Decimal `json:"cost,omitempty"`
	Currency           string           `json:"currency"`
	NextServiceDate    *time.Time       `json:"next_service_date,omitempty"`
	NextServiceMileage *int             `json:"next_service_mileage,omitempty"`
	Notes              string           `json:"notes,omitempty"`
	CreatedAt          time.Time        `json:"created_at"`
}

// CalculateDaysUntil calculates days until a given date
func CalculateDaysUntil(date *time.Time) *int {
	if date == nil {
		return nil
	}
	days := int(time.Until(*date).Hours() / 24)
	return &days
}

// GetDisplayName returns a display name for the vehicle
func (v *Vehicle) GetDisplayName() string {
	if v.Name != "" {
		return v.Name
	}
	if v.Make != "" && v.Model != "" {
		if v.Year != nil {
			return v.Make + " " + v.Model + " (" + string(rune(*v.Year)) + ")"
		}
		return v.Make + " " + v.Model
	}
	if v.Registration != "" {
		return v.Registration
	}
	return "Vehicle"
}

// PopulateComputedFields calculates and sets computed fields
func (v *Vehicle) PopulateComputedFields() {
	v.DaysUntilMOT = CalculateDaysUntil(v.MOTExpiry)
	v.DaysUntilTax = CalculateDaysUntil(v.TaxExpiry)
	v.DaysUntilInsurance = CalculateDaysUntil(v.InsuranceExpiry)
}

// ValidVehicleTypes returns all valid vehicle types
func ValidVehicleTypes() []string {
	return []string{
		VehicleTypeCar,
		VehicleTypeMotorcycle,
		VehicleTypeVan,
		VehicleTypeBoat,
		VehicleTypeCaravan,
		VehicleTypeOther,
	}
}

// ValidFuelTypes returns all valid fuel types
func ValidFuelTypes() []string {
	return []string{
		FuelTypePetrol,
		FuelTypeDiesel,
		FuelTypeElectric,
		FuelTypeHybrid,
		FuelTypeOther,
	}
}

// ValidServiceTypes returns all valid service types
func ValidServiceTypes() []string {
	return []string{
		ServiceTypeMOT,
		ServiceTypeService,
		ServiceTypeRepair,
		ServiceTypeTyre,
		ServiceTypeOther,
	}
}
