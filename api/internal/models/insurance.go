package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Insurance policy types
const (
	PolicyTypeHome     = "HOME"
	PolicyTypeMotor    = "MOTOR"
	PolicyTypeLife     = "LIFE"
	PolicyTypeHealth   = "HEALTH"
	PolicyTypeTravel   = "TRAVEL"
	PolicyTypePet      = "PET"
	PolicyTypeContents = "CONTENTS"
	PolicyTypeLandlord = "LANDLORD"
	PolicyTypeOther    = "OTHER"
)

// Premium frequencies
const (
	PremiumMonthly   = "MONTHLY"
	PremiumQuarterly = "QUARTERLY"
	PremiumAnnually  = "ANNUALLY"
)

// Coverage types for covered people
const (
	CoveragePrimary   = "PRIMARY"
	CoverageNamed     = "NAMED"
	CoverageDependent = "DEPENDENT"
)

// Claim types
const (
	ClaimTypeTheft    = "THEFT"
	ClaimTypeDamage   = "DAMAGE"
	ClaimTypeAccident = "ACCIDENT"
	ClaimTypeMedical  = "MEDICAL"
	ClaimTypeOther    = "OTHER"
)

// Claim statuses
const (
	ClaimStatusPending    = "PENDING"
	ClaimStatusInProgress = "IN_PROGRESS"
	ClaimStatusApproved   = "APPROVED"
	ClaimStatusRejected   = "REJECTED"
	ClaimStatusSettled    = "SETTLED"
)

// InsurancePolicy represents an insurance policy
type InsurancePolicy struct {
	ID          uuid.UUID `json:"id" db:"id"`
	HouseholdID uuid.UUID `json:"household_id" db:"household_id"`

	// Basic info
	PolicyName   string  `json:"policy_name" db:"policy_name"`
	PolicyType   string  `json:"policy_type" db:"policy_type"`
	Provider     *string `json:"provider,omitempty" db:"provider"`
	PolicyNumber *string `json:"policy_number,omitempty" db:"policy_number"`

	// Dates
	StartDate   *string `json:"start_date,omitempty" db:"start_date"`
	EndDate     *string `json:"end_date,omitempty" db:"end_date"`
	RenewalDate *string `json:"renewal_date,omitempty" db:"renewal_date"`

	// Financial
	PremiumAmount    *decimal.Decimal `json:"premium_amount,omitempty" db:"premium_amount"`
	PremiumFrequency *string          `json:"premium_frequency,omitempty" db:"premium_frequency"`
	ExcessAmount     *decimal.Decimal `json:"excess_amount,omitempty" db:"excess_amount"`
	CoverAmount      *decimal.Decimal `json:"cover_amount,omitempty" db:"cover_amount"`
	Currency         string           `json:"currency" db:"currency"`

	// Auto-renewal
	AutoRenewal bool `json:"auto_renewal" db:"auto_renewal"`

	// Linked entities
	PropertyID *uuid.UUID `json:"property_id,omitempty" db:"property_id"`
	VehicleID  *uuid.UUID `json:"vehicle_id,omitempty" db:"vehicle_id"`

	// Contact & reference
	BrokerName  *string `json:"broker_name,omitempty" db:"broker_name"`
	BrokerPhone *string `json:"broker_phone,omitempty" db:"broker_phone"`
	BrokerEmail *string `json:"broker_email,omitempty" db:"broker_email"`

	Notes *string `json:"notes,omitempty" db:"notes"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	// Computed/joined fields
	CoveredPeople []*InsuranceCoveredPerson `json:"covered_people,omitempty" db:"-"`
	Claims        []*InsuranceClaim         `json:"claims,omitempty" db:"-"`
	Property      *Property                 `json:"property,omitempty" db:"-"`
	Vehicle       *Vehicle                  `json:"vehicle,omitempty" db:"-"`
	DaysUntilRenewal *int                   `json:"days_until_renewal,omitempty" db:"-"`
	IsExpired        *bool                  `json:"is_expired,omitempty" db:"-"`
}

// InsuranceCoveredPerson represents a person covered by a policy
type InsuranceCoveredPerson struct {
	ID           uuid.UUID `json:"id" db:"id"`
	PolicyID     uuid.UUID `json:"policy_id" db:"policy_id"`
	PersonID     uuid.UUID `json:"person_id" db:"person_id"`
	CoverageType *string   `json:"coverage_type,omitempty" db:"coverage_type"`
	Notes        *string   `json:"notes,omitempty" db:"notes"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`

	// Joined fields
	Person *Person `json:"person,omitempty" db:"-"`
}

// InsuranceClaim represents a claim on a policy
type InsuranceClaim struct {
	ID       uuid.UUID `json:"id" db:"id"`
	PolicyID uuid.UUID `json:"policy_id" db:"policy_id"`

	ClaimReference *string `json:"claim_reference,omitempty" db:"claim_reference"`
	ClaimDate      string  `json:"claim_date" db:"claim_date"`
	IncidentDate   *string `json:"incident_date,omitempty" db:"incident_date"`

	ClaimType   *string `json:"claim_type,omitempty" db:"claim_type"`
	Description *string `json:"description,omitempty" db:"description"`

	// Financial
	ClaimAmount   *decimal.Decimal `json:"claim_amount,omitempty" db:"claim_amount"`
	SettledAmount *decimal.Decimal `json:"settled_amount,omitempty" db:"settled_amount"`
	ExcessPaid    *decimal.Decimal `json:"excess_paid,omitempty" db:"excess_paid"`
	Currency      string           `json:"currency" db:"currency"`

	// Status
	Status string `json:"status" db:"status"`

	// Resolution
	ResolutionDate  *string `json:"resolution_date,omitempty" db:"resolution_date"`
	ResolutionNotes *string `json:"resolution_notes,omitempty" db:"resolution_notes"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// PopulateComputedFields calculates derived fields for the policy
func (p *InsurancePolicy) PopulateComputedFields() {
	now := time.Now()

	// Calculate days until renewal
	if p.RenewalDate != nil && *p.RenewalDate != "" {
		if renewalDate, err := time.Parse("2006-01-02", *p.RenewalDate); err == nil {
			days := int(renewalDate.Sub(now).Hours() / 24)
			p.DaysUntilRenewal = &days
		}
	}

	// Check if expired
	if p.EndDate != nil && *p.EndDate != "" {
		if endDate, err := time.Parse("2006-01-02", *p.EndDate); err == nil {
			expired := endDate.Before(now)
			p.IsExpired = &expired
		}
	}
}

// ValidPolicyTypes returns valid policy types
func ValidPolicyTypes() []string {
	return []string{
		PolicyTypeHome,
		PolicyTypeMotor,
		PolicyTypeLife,
		PolicyTypeHealth,
		PolicyTypeTravel,
		PolicyTypePet,
		PolicyTypeContents,
		PolicyTypeLandlord,
		PolicyTypeOther,
	}
}

// ValidPremiumFrequencies returns valid premium frequencies
func ValidPremiumFrequencies() []string {
	return []string{
		PremiumMonthly,
		PremiumQuarterly,
		PremiumAnnually,
	}
}

// ValidCoverageTypes returns valid coverage types
func ValidCoverageTypes() []string {
	return []string{
		CoveragePrimary,
		CoverageNamed,
		CoverageDependent,
	}
}

// ValidClaimTypes returns valid claim types
func ValidClaimTypes() []string {
	return []string{
		ClaimTypeTheft,
		ClaimTypeDamage,
		ClaimTypeAccident,
		ClaimTypeMedical,
		ClaimTypeOther,
	}
}

// ValidClaimStatuses returns valid claim statuses
func ValidClaimStatuses() []string {
	return []string{
		ClaimStatusPending,
		ClaimStatusInProgress,
		ClaimStatusApproved,
		ClaimStatusRejected,
		ClaimStatusSettled,
	}
}
