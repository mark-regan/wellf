package models

import (
	"time"

	"github.com/google/uuid"
)

// Reminder types
const (
	ReminderTypeDocumentExpiry    = "DOCUMENT_EXPIRY"
	ReminderTypeVehicleMOT        = "VEHICLE_MOT"
	ReminderTypeVehicleTax        = "VEHICLE_TAX"
	ReminderTypeVehicleInsurance  = "VEHICLE_INSURANCE"
	ReminderTypeVehicleService    = "VEHICLE_SERVICE"
	ReminderTypeInsuranceRenewal  = "INSURANCE_RENEWAL"
	ReminderTypeMortgageEnd       = "MORTGAGE_END"
)

// ReminderPriority levels
const (
	ReminderPriorityLow    = "LOW"
	ReminderPriorityMedium = "MEDIUM"
	ReminderPriorityHigh   = "HIGH"
	ReminderPriorityUrgent = "URGENT"
)

// Reminder represents a unified reminder aggregated from various sources
type Reminder struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	DueDate     time.Time `json:"due_date"`
	DaysUntil   int       `json:"days_until"`
	Priority    string    `json:"priority"`
	IsOverdue   bool      `json:"is_overdue"`

	// Source entity references
	EntityID   uuid.UUID `json:"entity_id"`
	EntityType string    `json:"entity_type"` // document, vehicle, insurance, property
	EntityName string    `json:"entity_name"`

	// Additional context
	Category string `json:"category,omitempty"`
	URL      string `json:"url,omitempty"`
}

// CalendarEvent represents an event for calendar display
type CalendarEvent struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Date        string    `json:"date"` // YYYY-MM-DD format
	Type        string    `json:"type"`
	Priority    string    `json:"priority"`
	EntityID    uuid.UUID `json:"entity_id"`
	EntityType  string    `json:"entity_type"`
}

// ReminderSummary provides counts by priority/type
type ReminderSummary struct {
	TotalCount   int            `json:"total_count"`
	OverdueCount int            `json:"overdue_count"`
	UrgentCount  int            `json:"urgent_count"`
	ByType       map[string]int `json:"by_type"`
	ByPriority   map[string]int `json:"by_priority"`
}

// ValidReminderTypes returns valid reminder types
func ValidReminderTypes() []string {
	return []string{
		ReminderTypeDocumentExpiry,
		ReminderTypeVehicleMOT,
		ReminderTypeVehicleTax,
		ReminderTypeVehicleInsurance,
		ReminderTypeVehicleService,
		ReminderTypeInsuranceRenewal,
		ReminderTypeMortgageEnd,
	}
}

// GetPriority calculates priority based on days until due
func GetPriority(daysUntil int) string {
	if daysUntil < 0 {
		return ReminderPriorityUrgent
	}
	if daysUntil <= 7 {
		return ReminderPriorityUrgent
	}
	if daysUntil <= 14 {
		return ReminderPriorityHigh
	}
	if daysUntil <= 30 {
		return ReminderPriorityMedium
	}
	return ReminderPriorityLow
}
