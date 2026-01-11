package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type ReminderHandler struct {
	reminderService *services.ReminderService
	householdRepo   *repository.HouseholdRepository
}

func NewReminderHandler(reminderService *services.ReminderService, householdRepo *repository.HouseholdRepository) *ReminderHandler {
	return &ReminderHandler{
		reminderService: reminderService,
		householdRepo:   householdRepo,
	}
}

// GetReminders returns all upcoming reminders for the user's household
func (h *ReminderHandler) GetReminders(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			JSON(w, http.StatusOK, []interface{}{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	// Default to 90 days ahead
	daysAhead := 90
	if d := r.URL.Query().Get("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			daysAhead = parsed
		}
	}

	reminders, err := h.reminderService.GetReminders(r.Context(), household.ID, daysAhead)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch reminders")
		return
	}

	if reminders == nil {
		JSON(w, http.StatusOK, []interface{}{})
		return
	}

	JSON(w, http.StatusOK, reminders)
}

// GetReminderSummary returns summary statistics for reminders
func (h *ReminderHandler) GetReminderSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			JSON(w, http.StatusOK, map[string]interface{}{
				"total_count":   0,
				"overdue_count": 0,
				"urgent_count":  0,
				"by_type":       map[string]int{},
				"by_priority":   map[string]int{},
			})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	// Default to 90 days ahead
	daysAhead := 90
	if d := r.URL.Query().Get("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			daysAhead = parsed
		}
	}

	summary, err := h.reminderService.GetReminderSummary(r.Context(), household.ID, daysAhead)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch reminder summary")
		return
	}

	JSON(w, http.StatusOK, summary)
}

// GetCalendarEvents returns events for calendar display
func (h *ReminderHandler) GetCalendarEvents(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			JSON(w, http.StatusOK, []interface{}{})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	// Parse date range
	now := time.Now()
	startDate := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
	endDate := startDate.AddDate(0, 3, 0) // Default 3 months

	if start := r.URL.Query().Get("start"); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			startDate = parsed
		}
	}

	if end := r.URL.Query().Get("end"); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			endDate = parsed
		}
	}

	events, err := h.reminderService.GetCalendarEvents(r.Context(), household.ID, startDate, endDate)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch calendar events")
		return
	}

	if events == nil {
		JSON(w, http.StatusOK, []interface{}{})
		return
	}

	JSON(w, http.StatusOK, events)
}
