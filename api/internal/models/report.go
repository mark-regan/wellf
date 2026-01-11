package models

import "github.com/shopspring/decimal"

// HouseholdOverview provides a comprehensive summary of household data
type HouseholdOverview struct {
	// Family
	MemberCount     int `json:"member_count"`
	AdultCount      int `json:"adult_count"`
	ChildCount      int `json:"child_count"`

	// Pets
	PetCount        int `json:"pet_count"`

	// Properties
	PropertyCount   int             `json:"property_count"`
	PropertyValue   decimal.Decimal `json:"property_value"`
	MortgageBalance decimal.Decimal `json:"mortgage_balance"`
	PropertyEquity  decimal.Decimal `json:"property_equity"`

	// Vehicles
	VehicleCount    int             `json:"vehicle_count"`
	VehicleValue    decimal.Decimal `json:"vehicle_value"`

	// Insurance
	InsurancePolicyCount int             `json:"insurance_policy_count"`
	AnnualPremiums       decimal.Decimal `json:"annual_premiums"`

	// Documents
	DocumentCount        int `json:"document_count"`
	ExpiringDocCount     int `json:"expiring_doc_count"`

	// Currency for monetary values
	Currency string `json:"currency"`
}

// NetWorthBreakdown shows net worth by category
type NetWorthBreakdown struct {
	Investments    decimal.Decimal `json:"investments"`
	Cash           decimal.Decimal `json:"cash"`
	Properties     decimal.Decimal `json:"properties"`
	Vehicles       decimal.Decimal `json:"vehicles"`
	OtherAssets    decimal.Decimal `json:"other_assets"`
	TotalAssets    decimal.Decimal `json:"total_assets"`

	Mortgages      decimal.Decimal `json:"mortgages"`
	VehicleFinance decimal.Decimal `json:"vehicle_finance"`
	TotalLiabilities decimal.Decimal `json:"total_liabilities"`

	NetWorth       decimal.Decimal `json:"net_worth"`
	Currency       string          `json:"currency"`
}

// InsuranceCoverageReport shows insurance coverage summary
type InsuranceCoverageReport struct {
	TotalPolicies  int                     `json:"total_policies"`
	TotalCoverage  decimal.Decimal         `json:"total_coverage"`
	AnnualPremiums decimal.Decimal         `json:"annual_premiums"`
	ByType         []PolicyTypeSummary     `json:"by_type"`
	UpcomingRenewals int                   `json:"upcoming_renewals"`
	Currency       string                  `json:"currency"`
}

// PolicyTypeSummary summarizes policies by type
type PolicyTypeSummary struct {
	PolicyType     string          `json:"policy_type"`
	Count          int             `json:"count"`
	TotalCoverage  decimal.Decimal `json:"total_coverage"`
	AnnualPremiums decimal.Decimal `json:"annual_premiums"`
}

// AssetAllocationReport shows how assets are distributed
type AssetAllocationReport struct {
	ByCategory []AllocationCategory `json:"by_category"`
	Total      decimal.Decimal      `json:"total"`
	Currency   string               `json:"currency"`
}

// AllocationCategory represents one category of assets
type AllocationCategory struct {
	Category   string          `json:"category"`
	Value      decimal.Decimal `json:"value"`
	Percentage float64         `json:"percentage"`
	Items      int             `json:"items"`
}

// UpcomingEventsReport shows upcoming events summary
type UpcomingEventsReport struct {
	TotalEvents    int             `json:"total_events"`
	OverdueEvents  int             `json:"overdue_events"`
	ByType         map[string]int  `json:"by_type"`
	NextSevenDays  int             `json:"next_seven_days"`
	NextThirtyDays int             `json:"next_thirty_days"`
}
