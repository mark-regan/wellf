package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
)

type ReportService struct {
	personRepo      *repository.PersonRepository
	propertyRepo    *repository.PropertyRepository
	vehicleRepo     *repository.VehicleRepository
	insuranceRepo   *repository.InsuranceRepository
	documentRepo    *repository.DocumentRepository
	portfolioRepo   *repository.PortfolioRepository
	holdingRepo     *repository.HoldingRepository
	cashRepo        *repository.CashAccountRepository
	fixedAssetRepo  *repository.FixedAssetRepository
	petRepo         *repository.PetRepository
	reminderService *ReminderService
}

func NewReportService(
	personRepo *repository.PersonRepository,
	propertyRepo *repository.PropertyRepository,
	vehicleRepo *repository.VehicleRepository,
	insuranceRepo *repository.InsuranceRepository,
	documentRepo *repository.DocumentRepository,
	portfolioRepo *repository.PortfolioRepository,
	holdingRepo *repository.HoldingRepository,
	cashRepo *repository.CashAccountRepository,
	fixedAssetRepo *repository.FixedAssetRepository,
	petRepo *repository.PetRepository,
	reminderService *ReminderService,
) *ReportService {
	return &ReportService{
		personRepo:      personRepo,
		propertyRepo:    propertyRepo,
		vehicleRepo:     vehicleRepo,
		insuranceRepo:   insuranceRepo,
		documentRepo:    documentRepo,
		portfolioRepo:   portfolioRepo,
		holdingRepo:     holdingRepo,
		cashRepo:        cashRepo,
		fixedAssetRepo:  fixedAssetRepo,
		petRepo:         petRepo,
		reminderService: reminderService,
	}
}

// GetHouseholdOverview returns a comprehensive overview of the household
func (s *ReportService) GetHouseholdOverview(ctx context.Context, householdID uuid.UUID, userID uuid.UUID, currency string) (*models.HouseholdOverview, error) {
	overview := &models.HouseholdOverview{
		Currency: currency,
	}

	// Get family members
	people, err := s.personRepo.GetByHouseholdID(ctx, householdID)
	if err == nil {
		overview.MemberCount = len(people)
		now := time.Now()
		for _, p := range people {
			if p.DateOfBirth != nil {
				dob := *p.DateOfBirth
				age := now.Year() - dob.Year()
				if now.YearDay() < dob.YearDay() {
					age--
				}
				if age >= 18 {
					overview.AdultCount++
				} else {
					overview.ChildCount++
				}
			} else {
				// Assume adult if DOB not set
				overview.AdultCount++
			}
		}
	}

	// Get pets
	petCount, err := s.petRepo.CountByHouseholdID(ctx, householdID)
	if err == nil {
		overview.PetCount = petCount
	}

	// Get properties
	properties, err := s.propertyRepo.GetByHouseholdID(ctx, householdID)
	if err == nil {
		overview.PropertyCount = len(properties)
		for _, p := range properties {
			if p.CurrentValue != nil {
				overview.PropertyValue = overview.PropertyValue.Add(*p.CurrentValue)
			}
			if p.MortgageBalance != nil {
				overview.MortgageBalance = overview.MortgageBalance.Add(*p.MortgageBalance)
			}
		}
		overview.PropertyEquity = overview.PropertyValue.Sub(overview.MortgageBalance)
	}

	// Get vehicles
	vehicles, err := s.vehicleRepo.GetByHouseholdID(ctx, householdID)
	if err == nil {
		overview.VehicleCount = len(vehicles)
		for _, v := range vehicles {
			if v.CurrentValue != nil {
				overview.VehicleValue = overview.VehicleValue.Add(*v.CurrentValue)
			}
		}
	}

	// Get insurance policies
	policies, err := s.insuranceRepo.GetByHouseholdID(ctx, householdID)
	if err == nil {
		overview.InsurancePolicyCount = len(policies)
		for _, p := range policies {
			if p.PremiumAmount != nil && p.PremiumFrequency != nil {
				annual := s.annualizePremium(*p.PremiumAmount, *p.PremiumFrequency)
				overview.AnnualPremiums = overview.AnnualPremiums.Add(annual)
			}
		}
	}

	// Get documents
	docs, err := s.documentRepo.GetByHouseholdID(ctx, householdID)
	if err == nil {
		overview.DocumentCount = len(docs)
	}

	// Get expiring documents (next 30 days)
	expiringDocs, err := s.documentRepo.GetExpiringDocuments(ctx, householdID, 30)
	if err == nil {
		overview.ExpiringDocCount = len(expiringDocs)
	}

	return overview, nil
}

// GetNetWorthBreakdown returns detailed net worth breakdown
func (s *ReportService) GetNetWorthBreakdown(ctx context.Context, householdID uuid.UUID, userID uuid.UUID, currency string) (*models.NetWorthBreakdown, error) {
	breakdown := &models.NetWorthBreakdown{
		Currency: currency,
	}

	// Get investment portfolios value
	portfolios, err := s.portfolioRepo.GetByUserID(ctx, userID)
	if err == nil {
		for _, p := range portfolios {
			holdings, err := s.holdingRepo.GetByPortfolioID(ctx, p.ID)
			if err == nil {
				for _, h := range holdings {
					val := decimal.NewFromFloat(h.Quantity).Mul(decimal.NewFromFloat(h.AverageCost))
					breakdown.Investments = breakdown.Investments.Add(val)
				}
			}
		}
	}

	// Get cash accounts
	cashAccounts, err := s.cashRepo.GetByUserID(ctx, userID)
	if err == nil {
		for _, c := range cashAccounts {
			breakdown.Cash = breakdown.Cash.Add(decimal.NewFromFloat(c.Balance))
		}
	}

	// Get properties
	properties, err := s.propertyRepo.GetByHouseholdID(ctx, householdID)
	if err == nil {
		for _, p := range properties {
			if p.CurrentValue != nil {
				breakdown.Properties = breakdown.Properties.Add(*p.CurrentValue)
			}
			if p.MortgageBalance != nil {
				breakdown.Mortgages = breakdown.Mortgages.Add(*p.MortgageBalance)
			}
		}
	}

	// Get vehicles
	vehicles, err := s.vehicleRepo.GetByHouseholdID(ctx, householdID)
	if err == nil {
		for _, v := range vehicles {
			if v.CurrentValue != nil {
				breakdown.Vehicles = breakdown.Vehicles.Add(*v.CurrentValue)
			}
			if v.FinanceBalance != nil {
				breakdown.VehicleFinance = breakdown.VehicleFinance.Add(*v.FinanceBalance)
			}
		}
	}

	// Get fixed assets
	fixedAssets, err := s.fixedAssetRepo.GetByUserID(ctx, userID)
	if err == nil {
		for _, a := range fixedAssets {
			breakdown.OtherAssets = breakdown.OtherAssets.Add(decimal.NewFromFloat(a.CurrentValue))
		}
	}

	// Calculate totals
	breakdown.TotalAssets = breakdown.Investments.
		Add(breakdown.Cash).
		Add(breakdown.Properties).
		Add(breakdown.Vehicles).
		Add(breakdown.OtherAssets)

	breakdown.TotalLiabilities = breakdown.Mortgages.Add(breakdown.VehicleFinance)
	breakdown.NetWorth = breakdown.TotalAssets.Sub(breakdown.TotalLiabilities)

	return breakdown, nil
}

// GetInsuranceCoverage returns insurance coverage report
func (s *ReportService) GetInsuranceCoverage(ctx context.Context, householdID uuid.UUID, currency string) (*models.InsuranceCoverageReport, error) {
	report := &models.InsuranceCoverageReport{
		Currency: currency,
		ByType:   []models.PolicyTypeSummary{},
	}

	policies, err := s.insuranceRepo.GetByHouseholdID(ctx, householdID)
	if err != nil {
		return report, nil
	}

	report.TotalPolicies = len(policies)

	// Group by type
	typeMap := make(map[string]*models.PolicyTypeSummary)
	for _, p := range policies {
		if p.CoverAmount != nil {
			report.TotalCoverage = report.TotalCoverage.Add(*p.CoverAmount)
		}
		if p.PremiumAmount != nil && p.PremiumFrequency != nil {
			annual := s.annualizePremium(*p.PremiumAmount, *p.PremiumFrequency)
			report.AnnualPremiums = report.AnnualPremiums.Add(annual)
		}

		if _, ok := typeMap[p.PolicyType]; !ok {
			typeMap[p.PolicyType] = &models.PolicyTypeSummary{
				PolicyType: p.PolicyType,
			}
		}
		typeMap[p.PolicyType].Count++
		if p.CoverAmount != nil {
			typeMap[p.PolicyType].TotalCoverage = typeMap[p.PolicyType].TotalCoverage.Add(*p.CoverAmount)
		}
		if p.PremiumAmount != nil && p.PremiumFrequency != nil {
			annual := s.annualizePremium(*p.PremiumAmount, *p.PremiumFrequency)
			typeMap[p.PolicyType].AnnualPremiums = typeMap[p.PolicyType].AnnualPremiums.Add(annual)
		}
	}

	for _, v := range typeMap {
		report.ByType = append(report.ByType, *v)
	}

	// Get upcoming renewals
	renewals, err := s.insuranceRepo.GetUpcomingRenewals(ctx, householdID, 30)
	if err == nil {
		report.UpcomingRenewals = len(renewals)
	}

	return report, nil
}

// GetAssetAllocation returns asset allocation report
func (s *ReportService) GetAssetAllocation(ctx context.Context, householdID uuid.UUID, userID uuid.UUID, currency string) (*models.AssetAllocationReport, error) {
	report := &models.AssetAllocationReport{
		Currency:   currency,
		ByCategory: []models.AllocationCategory{},
	}

	categories := make(map[string]*models.AllocationCategory)

	// Investments
	portfolios, _ := s.portfolioRepo.GetByUserID(ctx, userID)
	investmentsValue := decimal.Zero
	investmentsCount := 0
	for _, p := range portfolios {
		holdings, _ := s.holdingRepo.GetByPortfolioID(ctx, p.ID)
		for _, h := range holdings {
			val := decimal.NewFromFloat(h.Quantity).Mul(decimal.NewFromFloat(h.AverageCost))
			investmentsValue = investmentsValue.Add(val)
			investmentsCount++
		}
	}
	if investmentsCount > 0 {
		categories["Investments"] = &models.AllocationCategory{
			Category: "Investments",
			Value:    investmentsValue,
			Items:    investmentsCount,
		}
	}

	// Cash
	cashAccounts, _ := s.cashRepo.GetByUserID(ctx, userID)
	cashValue := decimal.Zero
	for _, c := range cashAccounts {
		cashValue = cashValue.Add(decimal.NewFromFloat(c.Balance))
	}
	if len(cashAccounts) > 0 {
		categories["Cash"] = &models.AllocationCategory{
			Category: "Cash",
			Value:    cashValue,
			Items:    len(cashAccounts),
		}
	}

	// Properties
	properties, _ := s.propertyRepo.GetByHouseholdID(ctx, householdID)
	propertyValue := decimal.Zero
	for _, p := range properties {
		if p.CurrentValue != nil {
			propertyValue = propertyValue.Add(*p.CurrentValue)
		}
	}
	if len(properties) > 0 {
		categories["Properties"] = &models.AllocationCategory{
			Category: "Properties",
			Value:    propertyValue,
			Items:    len(properties),
		}
	}

	// Vehicles
	vehicles, _ := s.vehicleRepo.GetByHouseholdID(ctx, householdID)
	vehicleValue := decimal.Zero
	for _, v := range vehicles {
		if v.CurrentValue != nil {
			vehicleValue = vehicleValue.Add(*v.CurrentValue)
		}
	}
	if len(vehicles) > 0 {
		categories["Vehicles"] = &models.AllocationCategory{
			Category: "Vehicles",
			Value:    vehicleValue,
			Items:    len(vehicles),
		}
	}

	// Other assets
	fixedAssets, _ := s.fixedAssetRepo.GetByUserID(ctx, userID)
	otherValue := decimal.Zero
	for _, a := range fixedAssets {
		otherValue = otherValue.Add(decimal.NewFromFloat(a.CurrentValue))
	}
	if len(fixedAssets) > 0 {
		categories["Other Assets"] = &models.AllocationCategory{
			Category: "Other Assets",
			Value:    otherValue,
			Items:    len(fixedAssets),
		}
	}

	// Calculate total and percentages
	for _, cat := range categories {
		report.Total = report.Total.Add(cat.Value)
	}

	for _, cat := range categories {
		if !report.Total.IsZero() {
			pct, _ := cat.Value.Div(report.Total).Mul(decimal.NewFromInt(100)).Float64()
			cat.Percentage = pct
		}
		report.ByCategory = append(report.ByCategory, *cat)
	}

	return report, nil
}

// GetUpcomingEvents returns upcoming events summary
func (s *ReportService) GetUpcomingEvents(ctx context.Context, householdID uuid.UUID) (*models.UpcomingEventsReport, error) {
	report := &models.UpcomingEventsReport{
		ByType: make(map[string]int),
	}

	// Get all reminders for next 90 days
	reminders, err := s.reminderService.GetReminders(ctx, householdID, 90)
	if err != nil {
		return report, nil
	}

	report.TotalEvents = len(reminders)
	for _, r := range reminders {
		if r.IsOverdue {
			report.OverdueEvents++
		}
		report.ByType[r.Type]++
		if r.DaysUntil >= 0 && r.DaysUntil <= 7 {
			report.NextSevenDays++
		}
		if r.DaysUntil >= 0 && r.DaysUntil <= 30 {
			report.NextThirtyDays++
		}
	}

	return report, nil
}

func (s *ReportService) annualizePremium(premium decimal.Decimal, frequency string) decimal.Decimal {
	switch frequency {
	case "MONTHLY":
		return premium.Mul(decimal.NewFromInt(12))
	case "QUARTERLY":
		return premium.Mul(decimal.NewFromInt(4))
	case "ANNUALLY":
		return premium
	default:
		return premium
	}
}
