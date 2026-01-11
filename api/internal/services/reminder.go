package services

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
)

type ReminderService struct {
	documentRepo  *repository.DocumentRepository
	vehicleRepo   *repository.VehicleRepository
	insuranceRepo *repository.InsuranceRepository
	propertyRepo  *repository.PropertyRepository
}

func NewReminderService(
	documentRepo *repository.DocumentRepository,
	vehicleRepo *repository.VehicleRepository,
	insuranceRepo *repository.InsuranceRepository,
	propertyRepo *repository.PropertyRepository,
) *ReminderService {
	return &ReminderService{
		documentRepo:  documentRepo,
		vehicleRepo:   vehicleRepo,
		insuranceRepo: insuranceRepo,
		propertyRepo:  propertyRepo,
	}
}

// GetReminders retrieves all upcoming reminders for a household
func (s *ReminderService) GetReminders(ctx context.Context, householdID uuid.UUID, daysAhead int) ([]*models.Reminder, error) {
	var reminders []*models.Reminder
	now := time.Now()

	// Get document expiry reminders
	docReminders, err := s.getDocumentReminders(ctx, householdID, daysAhead, now)
	if err != nil {
		return nil, fmt.Errorf("failed to get document reminders: %w", err)
	}
	reminders = append(reminders, docReminders...)

	// Get vehicle reminders (MOT, tax, insurance, service)
	vehicleReminders, err := s.getVehicleReminders(ctx, householdID, daysAhead, now)
	if err != nil {
		return nil, fmt.Errorf("failed to get vehicle reminders: %w", err)
	}
	reminders = append(reminders, vehicleReminders...)

	// Get insurance renewal reminders
	insuranceReminders, err := s.getInsuranceReminders(ctx, householdID, daysAhead, now)
	if err != nil {
		return nil, fmt.Errorf("failed to get insurance reminders: %w", err)
	}
	reminders = append(reminders, insuranceReminders...)

	// Get property reminders (mortgage end dates)
	propertyReminders, err := s.getPropertyReminders(ctx, householdID, daysAhead, now)
	if err != nil {
		return nil, fmt.Errorf("failed to get property reminders: %w", err)
	}
	reminders = append(reminders, propertyReminders...)

	// Sort by due date
	sort.Slice(reminders, func(i, j int) bool {
		return reminders[i].DueDate.Before(reminders[j].DueDate)
	})

	return reminders, nil
}

// GetCalendarEvents returns events for calendar display
func (s *ReminderService) GetCalendarEvents(ctx context.Context, householdID uuid.UUID, startDate, endDate time.Time) ([]*models.CalendarEvent, error) {
	daysAhead := int(endDate.Sub(time.Now()).Hours() / 24)
	if daysAhead < 0 {
		daysAhead = 0
	}

	reminders, err := s.GetReminders(ctx, householdID, daysAhead+365) // Get more to include past events
	if err != nil {
		return nil, err
	}

	var events []*models.CalendarEvent
	for _, r := range reminders {
		// Filter to date range
		if r.DueDate.Before(startDate) || r.DueDate.After(endDate) {
			continue
		}

		events = append(events, &models.CalendarEvent{
			ID:          r.ID,
			Title:       r.Title,
			Description: r.Description,
			Date:        r.DueDate.Format("2006-01-02"),
			Type:        r.Type,
			Priority:    r.Priority,
			EntityID:    r.EntityID,
			EntityType:  r.EntityType,
		})
	}

	return events, nil
}

// GetReminderSummary returns summary statistics
func (s *ReminderService) GetReminderSummary(ctx context.Context, householdID uuid.UUID, daysAhead int) (*models.ReminderSummary, error) {
	reminders, err := s.GetReminders(ctx, householdID, daysAhead)
	if err != nil {
		return nil, err
	}

	summary := &models.ReminderSummary{
		TotalCount:   len(reminders),
		ByType:       make(map[string]int),
		ByPriority:   make(map[string]int),
	}

	for _, r := range reminders {
		if r.IsOverdue {
			summary.OverdueCount++
		}
		if r.Priority == models.ReminderPriorityUrgent {
			summary.UrgentCount++
		}
		summary.ByType[r.Type]++
		summary.ByPriority[r.Priority]++
	}

	return summary, nil
}

func (s *ReminderService) getDocumentReminders(ctx context.Context, householdID uuid.UUID, daysAhead int, now time.Time) ([]*models.Reminder, error) {
	docs, err := s.documentRepo.GetExpiringDocuments(ctx, householdID, daysAhead)
	if err != nil {
		return nil, err
	}

	var reminders []*models.Reminder
	for _, doc := range docs {
		if doc.ExpiryDate == nil || *doc.ExpiryDate == "" {
			continue
		}

		expiryDate, err := time.Parse("2006-01-02", *doc.ExpiryDate)
		if err != nil {
			continue
		}

		daysUntil := int(expiryDate.Sub(now).Hours() / 24)
		reminders = append(reminders, &models.Reminder{
			ID:          fmt.Sprintf("doc_%s", doc.ID.String()),
			Type:        models.ReminderTypeDocumentExpiry,
			Title:       fmt.Sprintf("%s expires", doc.Name),
			Description: fmt.Sprintf("Document expires on %s", expiryDate.Format("2 Jan 2006")),
			DueDate:     expiryDate,
			DaysUntil:   daysUntil,
			Priority:    models.GetPriority(daysUntil),
			IsOverdue:   daysUntil < 0,
			EntityID:    doc.ID,
			EntityType:  "document",
			EntityName:  doc.Name,
			Category:    doc.Category,
		})
	}

	return reminders, nil
}

func (s *ReminderService) getVehicleReminders(ctx context.Context, householdID uuid.UUID, daysAhead int, now time.Time) ([]*models.Reminder, error) {
	vehicles, err := s.vehicleRepo.GetByHouseholdID(ctx, householdID)
	if err != nil {
		return nil, err
	}

	var reminders []*models.Reminder
	for _, v := range vehicles {
		// MOT expiry
		if v.MOTExpiry != nil {
			motDate := *v.MOTExpiry
			daysUntil := int(motDate.Sub(now).Hours() / 24)
			if daysUntil <= daysAhead {
				reminders = append(reminders, &models.Reminder{
					ID:          fmt.Sprintf("mot_%s", v.ID.String()),
					Type:        models.ReminderTypeVehicleMOT,
					Title:       fmt.Sprintf("%s MOT expires", v.Name),
					Description: fmt.Sprintf("MOT expires on %s", motDate.Format("2 Jan 2006")),
					DueDate:     motDate,
					DaysUntil:   daysUntil,
					Priority:    models.GetPriority(daysUntil),
					IsOverdue:   daysUntil < 0,
					EntityID:    v.ID,
					EntityType:  "vehicle",
					EntityName:  v.Name,
				})
			}
		}

		// Tax expiry
		if v.TaxExpiry != nil {
			taxDate := *v.TaxExpiry
			daysUntil := int(taxDate.Sub(now).Hours() / 24)
			if daysUntil <= daysAhead {
				reminders = append(reminders, &models.Reminder{
					ID:          fmt.Sprintf("tax_%s", v.ID.String()),
					Type:        models.ReminderTypeVehicleTax,
					Title:       fmt.Sprintf("%s road tax expires", v.Name),
					Description: fmt.Sprintf("Road tax expires on %s", taxDate.Format("2 Jan 2006")),
					DueDate:     taxDate,
					DaysUntil:   daysUntil,
					Priority:    models.GetPriority(daysUntil),
					IsOverdue:   daysUntil < 0,
					EntityID:    v.ID,
					EntityType:  "vehicle",
					EntityName:  v.Name,
				})
			}
		}

		// Insurance expiry
		if v.InsuranceExpiry != nil {
			insDate := *v.InsuranceExpiry
			daysUntil := int(insDate.Sub(now).Hours() / 24)
			if daysUntil <= daysAhead {
				reminders = append(reminders, &models.Reminder{
					ID:          fmt.Sprintf("vins_%s", v.ID.String()),
					Type:        models.ReminderTypeVehicleInsurance,
					Title:       fmt.Sprintf("%s insurance expires", v.Name),
					Description: fmt.Sprintf("Vehicle insurance expires on %s", insDate.Format("2 Jan 2006")),
					DueDate:     insDate,
					DaysUntil:   daysUntil,
					Priority:    models.GetPriority(daysUntil),
					IsOverdue:   daysUntil < 0,
					EntityID:    v.ID,
					EntityType:  "vehicle",
					EntityName:  v.Name,
				})
			}
		}
	}

	return reminders, nil
}

func (s *ReminderService) getInsuranceReminders(ctx context.Context, householdID uuid.UUID, daysAhead int, now time.Time) ([]*models.Reminder, error) {
	policies, err := s.insuranceRepo.GetUpcomingRenewals(ctx, householdID, daysAhead)
	if err != nil {
		return nil, err
	}

	var reminders []*models.Reminder
	for _, p := range policies {
		if p.RenewalDate == nil || *p.RenewalDate == "" {
			continue
		}

		renewalDate, err := time.Parse("2006-01-02", *p.RenewalDate)
		if err != nil {
			continue
		}

		daysUntil := int(renewalDate.Sub(now).Hours() / 24)
		reminders = append(reminders, &models.Reminder{
			ID:          fmt.Sprintf("ins_%s", p.ID.String()),
			Type:        models.ReminderTypeInsuranceRenewal,
			Title:       fmt.Sprintf("%s renewal due", p.PolicyName),
			Description: fmt.Sprintf("Insurance policy renews on %s", renewalDate.Format("2 Jan 2006")),
			DueDate:     renewalDate,
			DaysUntil:   daysUntil,
			Priority:    models.GetPriority(daysUntil),
			IsOverdue:   daysUntil < 0,
			EntityID:    p.ID,
			EntityType:  "insurance",
			EntityName:  p.PolicyName,
			Category:    p.PolicyType,
		})
	}

	return reminders, nil
}

func (s *ReminderService) getPropertyReminders(ctx context.Context, householdID uuid.UUID, daysAhead int, now time.Time) ([]*models.Reminder, error) {
	properties, err := s.propertyRepo.GetByHouseholdID(ctx, householdID)
	if err != nil {
		return nil, err
	}

	var reminders []*models.Reminder
	for _, p := range properties {
		// Mortgage end date
		if p.MortgageEndDate != nil {
			mortgageDate := *p.MortgageEndDate
			daysUntil := int(mortgageDate.Sub(now).Hours() / 24)
			if daysUntil <= daysAhead && daysUntil >= -30 { // Include recently ended
				reminders = append(reminders, &models.Reminder{
					ID:          fmt.Sprintf("mort_%s", p.ID.String()),
					Type:        models.ReminderTypeMortgageEnd,
					Title:       fmt.Sprintf("%s mortgage ends", p.Name),
					Description: fmt.Sprintf("Mortgage term ends on %s", mortgageDate.Format("2 Jan 2006")),
					DueDate:     mortgageDate,
					DaysUntil:   daysUntil,
					Priority:    models.GetPriority(daysUntil),
					IsOverdue:   daysUntil < 0,
					EntityID:    p.ID,
					EntityType:  "property",
					EntityName:  p.Name,
				})
			}
		}
	}

	return reminders, nil
}
