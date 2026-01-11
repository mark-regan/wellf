package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Property types
const (
	PropertyTypeHouse      = "HOUSE"
	PropertyTypeFlat       = "FLAT"
	PropertyTypeLand       = "LAND"
	PropertyTypeCommercial = "COMMERCIAL"
	PropertyTypeOther      = "OTHER"
)

// Ownership types
const (
	OwnershipTypeSole            = "SOLE"
	OwnershipTypeJointTenants    = "JOINT_TENANTS"
	OwnershipTypeTenantsInCommon = "TENANTS_IN_COMMON"
)

// Property represents a real estate property
type Property struct {
	ID                    uuid.UUID        `json:"id"`
	HouseholdID           uuid.UUID        `json:"household_id"`
	Name                  string           `json:"name"`
	PropertyType          string           `json:"property_type"`
	AddressLine1          string           `json:"address_line1,omitempty"`
	AddressLine2          string           `json:"address_line2,omitempty"`
	City                  string           `json:"city,omitempty"`
	County                string           `json:"county,omitempty"`
	Postcode              string           `json:"postcode,omitempty"`
	Country               string           `json:"country,omitempty"`
	PurchaseDate          *time.Time       `json:"purchase_date,omitempty"`
	PurchasePrice         *decimal.Decimal `json:"purchase_price,omitempty"`
	CurrentValue          *decimal.Decimal `json:"current_value,omitempty"`
	Currency              string           `json:"currency"`
	Bedrooms              *int             `json:"bedrooms,omitempty"`
	Bathrooms             *int             `json:"bathrooms,omitempty"`
	SquareFeet            *int             `json:"square_feet,omitempty"`
	LandRegistryTitle     string           `json:"land_registry_title,omitempty"`
	EPCRating             string           `json:"epc_rating,omitempty"`
	CouncilTaxBand        string           `json:"council_tax_band,omitempty"`
	IsPrimaryResidence    bool             `json:"is_primary_residence"`
	IsRental              bool             `json:"is_rental"`
	RentalIncome          *decimal.Decimal `json:"rental_income,omitempty"`
	MortgageProvider      string           `json:"mortgage_provider,omitempty"`
	MortgageAccountNumber string           `json:"mortgage_account_number,omitempty"`
	MortgageBalance       *decimal.Decimal `json:"mortgage_balance,omitempty"`
	MortgageRate          *decimal.Decimal `json:"mortgage_rate,omitempty"`
	MortgageEndDate       *time.Time       `json:"mortgage_end_date,omitempty"`
	MortgageMonthlyPayment *decimal.Decimal `json:"mortgage_monthly_payment,omitempty"`
	Notes                 string           `json:"notes,omitempty"`
	Metadata              map[string]any   `json:"metadata,omitempty"`
	CreatedAt             time.Time        `json:"created_at"`
	UpdatedAt             time.Time        `json:"updated_at"`
	// Joined fields
	Owners                []PropertyOwner  `json:"owners,omitempty"`
	Equity                *decimal.Decimal `json:"equity,omitempty"`
}

// PropertyOwner links a person to a property with ownership percentage
type PropertyOwner struct {
	ID                  uuid.UUID        `json:"id"`
	PropertyID          uuid.UUID        `json:"property_id"`
	PersonID            uuid.UUID        `json:"person_id"`
	OwnershipPercentage decimal.Decimal  `json:"ownership_percentage"`
	OwnershipType       string           `json:"ownership_type,omitempty"`
	CreatedAt           time.Time        `json:"created_at"`
	// Joined fields
	Person              *Person          `json:"person,omitempty"`
}

// CalculateEquity calculates property equity (value - mortgage balance)
func (p *Property) CalculateEquity() decimal.Decimal {
	if p.CurrentValue == nil {
		return decimal.Zero
	}
	if p.MortgageBalance == nil {
		return *p.CurrentValue
	}
	return p.CurrentValue.Sub(*p.MortgageBalance)
}

// GetFullAddress returns the formatted full address
func (p *Property) GetFullAddress() string {
	var parts []string
	if p.AddressLine1 != "" {
		parts = append(parts, p.AddressLine1)
	}
	if p.AddressLine2 != "" {
		parts = append(parts, p.AddressLine2)
	}
	if p.City != "" {
		parts = append(parts, p.City)
	}
	if p.County != "" {
		parts = append(parts, p.County)
	}
	if p.Postcode != "" {
		parts = append(parts, p.Postcode)
	}
	if p.Country != "" {
		parts = append(parts, p.Country)
	}

	result := ""
	for i, part := range parts {
		if i > 0 {
			result += ", "
		}
		result += part
	}
	return result
}

// ValidPropertyTypes returns all valid property types
func ValidPropertyTypes() []string {
	return []string{
		PropertyTypeHouse,
		PropertyTypeFlat,
		PropertyTypeLand,
		PropertyTypeCommercial,
		PropertyTypeOther,
	}
}

// ValidOwnershipTypes returns all valid ownership types
func ValidOwnershipTypes() []string {
	return []string{
		OwnershipTypeSole,
		OwnershipTypeJointTenants,
		OwnershipTypeTenantsInCommon,
	}
}
