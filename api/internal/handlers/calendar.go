package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type CalendarHandler struct {
	configRepo   *repository.CalendarConfigRepository
	reminderRepo *repository.ReminderRepository
	generator    *services.ReminderGenerator
}

func NewCalendarHandler(
	configRepo *repository.CalendarConfigRepository,
	reminderRepo *repository.ReminderRepository,
	generator *services.ReminderGenerator,
) *CalendarHandler {
	return &CalendarHandler{
		configRepo:   configRepo,
		reminderRepo: reminderRepo,
		generator:    generator,
	}
}

// Routes returns the calendar router
func (h *CalendarHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Calendar Config
	r.Route("/config", func(r chi.Router) {
		r.Get("/", h.GetConfig)
		r.Put("/", h.UpdateConfig)
		r.Delete("/", h.DeleteConfig)
		r.Post("/test", h.TestConnection)
	})

	// Reminders
	r.Route("/reminders", func(r chi.Router) {
		r.Get("/", h.ListReminders)
		r.Post("/", h.CreateReminder)
		r.Get("/upcoming", h.GetUpcoming)
		r.Get("/overdue", h.GetOverdue)
		r.Get("/summary", h.GetSummary)
		r.Post("/generate", h.GenerateReminders)

		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", h.GetReminder)
			r.Put("/", h.UpdateReminder)
			r.Delete("/", h.DeleteReminder)
			r.Post("/complete", h.CompleteReminder)
			r.Post("/dismiss", h.DismissReminder)
			r.Post("/snooze", h.SnoozeReminder)
			r.Post("/unsnooze", h.UnsnoozeReminder)
		})
	})

	return r
}

// =============================================================================
// Calendar Config Handlers
// =============================================================================

func (h *CalendarHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get calendar config")
		return
	}

	if config == nil {
		// Return empty config
		config = &models.CalendarConfig{
			UserID:   userID,
			Provider: models.CalendarProviderNone,
			IsActive: false,
		}
	}

	JSON(w, http.StatusOK, config)
}

func (h *CalendarHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.UpdateCalendarConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Get existing config or create new
	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get calendar config")
		return
	}

	if config == nil {
		config = &models.CalendarConfig{
			UserID:   userID,
			Provider: models.CalendarProviderNone,
		}
	}

	// Update fields if provided
	if req.Provider != nil {
		config.Provider = *req.Provider
	}
	if req.CalDAVURL != nil {
		config.CalDAVURL = req.CalDAVURL
	}
	if req.Username != nil {
		config.Username = req.Username
	}
	if req.Password != nil && *req.Password != "" {
		config.Password = req.Password
	}
	if req.CalendarID != nil {
		config.CalendarID = req.CalendarID
	}
	if req.CalendarName != nil {
		config.CalendarName = req.CalendarName
	}
	if req.IsActive != nil {
		config.IsActive = *req.IsActive
	}
	if req.SyncEnabled != nil {
		config.SyncEnabled = *req.SyncEnabled
	}

	if err := h.configRepo.Upsert(r.Context(), config); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to save calendar config")
		return
	}

	// Clear password from response
	config.Password = nil

	JSON(w, http.StatusOK, config)
}

func (h *CalendarHandler) DeleteConfig(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if err := h.configRepo.Delete(r.Context(), userID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete calendar config")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Calendar config deleted"})
}

func (h *CalendarHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	config, err := h.configRepo.Get(r.Context(), userID)
	if err != nil || config == nil {
		JSON(w, http.StatusOK, map[string]interface{}{
			"connected": false,
			"error":     "No calendar configured",
		})
		return
	}

	// TODO: Implement actual CalDAV connection testing
	// For now, just check if credentials are set
	if config.Provider == models.CalendarProviderNone {
		JSON(w, http.StatusOK, map[string]interface{}{
			"connected": false,
			"error":     "No calendar provider configured",
		})
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"connected": true,
		"provider":  config.Provider,
		"message":   "Calendar connection test - provider configured (sync not implemented)",
	})
}

// =============================================================================
// Reminder Handlers
// =============================================================================

func (h *CalendarHandler) ListReminders(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	includeCompleted := r.URL.Query().Get("include_completed") == "true"
	domain := r.URL.Query().Get("domain")
	limit := 100
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 500 {
			limit = l
		}
	}

	var reminders []*models.Reminder
	var err error

	if domain != "" {
		reminders, err = h.reminderRepo.GetByDomain(r.Context(), userID, domain, limit)
	} else {
		reminders, err = h.reminderRepo.List(r.Context(), userID, includeCompleted, limit)
	}

	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to list reminders")
		return
	}

	if reminders == nil {
		reminders = []*models.Reminder{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"reminders": reminders,
	})
}

func (h *CalendarHandler) GetUpcoming(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	daysAhead := 7
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 90 {
			daysAhead = d
		}
	}

	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	reminders, err := h.reminderRepo.GetUpcoming(r.Context(), userID, daysAhead, limit)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get upcoming reminders")
		return
	}

	if reminders == nil {
		reminders = []*models.Reminder{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"reminders": reminders,
	})
}

func (h *CalendarHandler) GetOverdue(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	reminders, err := h.reminderRepo.GetOverdue(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get overdue reminders")
		return
	}

	if reminders == nil {
		reminders = []*models.Reminder{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"reminders": reminders,
	})
}

func (h *CalendarHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	summary, err := h.reminderRepo.GetSummary(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder summary")
		return
	}

	JSON(w, http.StatusOK, summary)
}

func (h *CalendarHandler) GetReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder ID")
		return
	}

	reminder, err := h.reminderRepo.GetByID(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder")
		return
	}

	if reminder == nil || reminder.UserID != userID {
		Error(w, http.StatusNotFound, "Reminder not found")
		return
	}

	JSON(w, http.StatusOK, reminder)
}

func (h *CalendarHandler) CreateReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateReminderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title == "" || req.Domain == "" || req.ReminderDate == "" {
		Error(w, http.StatusBadRequest, "Title, domain, and reminder_date are required")
		return
	}

	reminderDate, err := time.Parse("2006-01-02", req.ReminderDate)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder_date format (use YYYY-MM-DD)")
		return
	}

	reminder := &models.Reminder{
		UserID:       userID,
		Domain:       req.Domain,
		EntityType:   req.EntityType,
		EntityName:   req.EntityName,
		Title:        req.Title,
		Description:  req.Description,
		ReminderDate: reminderDate,
		ReminderTime: req.ReminderTime,
		IsAllDay:     req.IsAllDay,
		IsRecurring:  req.IsRecurring,
	}

	if req.EntityID != nil {
		id, err := uuid.Parse(*req.EntityID)
		if err == nil {
			reminder.EntityID = &id
		}
	}

	if req.RecurrenceType != nil {
		reminder.RecurrenceType = req.RecurrenceType
	}
	if req.RecurrenceInterval != nil {
		reminder.RecurrenceInterval = *req.RecurrenceInterval
	}
	if req.RecurrenceEndDate != nil {
		reminder.RecurrenceEndDate = req.RecurrenceEndDate
	}
	if req.NotifyDaysBefore != nil {
		reminder.NotifyDaysBefore = *req.NotifyDaysBefore
	}
	if req.NotifyEmail != nil {
		reminder.NotifyEmail = *req.NotifyEmail
	}
	if req.NotifyPush != nil {
		reminder.NotifyPush = *req.NotifyPush
	}
	if req.Priority != nil {
		reminder.Priority = *req.Priority
	}

	if err := h.reminderRepo.Create(r.Context(), reminder); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create reminder")
		return
	}

	JSON(w, http.StatusCreated, reminder)
}

func (h *CalendarHandler) UpdateReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder ID")
		return
	}

	reminder, err := h.reminderRepo.GetByID(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder")
		return
	}

	if reminder == nil || reminder.UserID != userID {
		Error(w, http.StatusNotFound, "Reminder not found")
		return
	}

	var req models.UpdateReminderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title != nil {
		reminder.Title = *req.Title
	}
	if req.Description != nil {
		reminder.Description = req.Description
	}
	if req.ReminderDate != nil {
		date, err := time.Parse("2006-01-02", *req.ReminderDate)
		if err == nil {
			reminder.ReminderDate = date
		}
	}
	if req.ReminderTime != nil {
		reminder.ReminderTime = req.ReminderTime
	}
	if req.IsAllDay != nil {
		reminder.IsAllDay = *req.IsAllDay
	}
	if req.IsRecurring != nil {
		reminder.IsRecurring = *req.IsRecurring
	}
	if req.RecurrenceType != nil {
		reminder.RecurrenceType = req.RecurrenceType
	}
	if req.RecurrenceInterval != nil {
		reminder.RecurrenceInterval = *req.RecurrenceInterval
	}
	if req.RecurrenceEndDate != nil {
		reminder.RecurrenceEndDate = req.RecurrenceEndDate
	}
	if req.NotifyDaysBefore != nil {
		reminder.NotifyDaysBefore = *req.NotifyDaysBefore
	}
	if req.NotifyEmail != nil {
		reminder.NotifyEmail = *req.NotifyEmail
	}
	if req.NotifyPush != nil {
		reminder.NotifyPush = *req.NotifyPush
	}
	if req.Priority != nil {
		reminder.Priority = *req.Priority
	}

	if err := h.reminderRepo.Update(r.Context(), reminder); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update reminder")
		return
	}

	JSON(w, http.StatusOK, reminder)
}

func (h *CalendarHandler) DeleteReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder ID")
		return
	}

	reminder, err := h.reminderRepo.GetByID(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder")
		return
	}

	if reminder == nil || reminder.UserID != userID {
		Error(w, http.StatusNotFound, "Reminder not found")
		return
	}

	if err := h.reminderRepo.Delete(r.Context(), id); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete reminder")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Reminder deleted"})
}

func (h *CalendarHandler) CompleteReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder ID")
		return
	}

	reminder, err := h.reminderRepo.GetByID(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder")
		return
	}

	if reminder == nil || reminder.UserID != userID {
		Error(w, http.StatusNotFound, "Reminder not found")
		return
	}

	if err := h.reminderRepo.Complete(r.Context(), id); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to complete reminder")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Reminder completed"})
}

func (h *CalendarHandler) DismissReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder ID")
		return
	}

	reminder, err := h.reminderRepo.GetByID(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder")
		return
	}

	if reminder == nil || reminder.UserID != userID {
		Error(w, http.StatusNotFound, "Reminder not found")
		return
	}

	if err := h.reminderRepo.Dismiss(r.Context(), id); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to dismiss reminder")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Reminder dismissed"})
}

func (h *CalendarHandler) SnoozeReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder ID")
		return
	}

	reminder, err := h.reminderRepo.GetByID(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder")
		return
	}

	if reminder == nil || reminder.UserID != userID {
		Error(w, http.StatusNotFound, "Reminder not found")
		return
	}

	var req models.SnoozeReminderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	until, err := time.Parse("2006-01-02", req.SnoozeUntil)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid snooze_until date format (use YYYY-MM-DD)")
		return
	}

	if err := h.reminderRepo.Snooze(r.Context(), id, until); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to snooze reminder")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Reminder snoozed"})
}

func (h *CalendarHandler) UnsnoozeReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid reminder ID")
		return
	}

	reminder, err := h.reminderRepo.GetByID(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get reminder")
		return
	}

	if reminder == nil || reminder.UserID != userID {
		Error(w, http.StatusNotFound, "Reminder not found")
		return
	}

	if err := h.reminderRepo.Unsnooze(r.Context(), id); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to unsnooze reminder")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Reminder unsnoozed"})
}

func (h *CalendarHandler) GenerateReminders(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.GenerateRemindersRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Empty body is fine, generate all
		req.Domains = nil
	}

	if len(req.Domains) == 0 {
		// Generate for all domains
		if err := h.generator.GenerateAll(r.Context(), userID); err != nil {
			Error(w, http.StatusInternalServerError, "Failed to generate reminders")
			return
		}
	} else {
		// Generate for specific domains
		for _, domain := range req.Domains {
			if err := h.generator.GenerateForDomain(r.Context(), userID, domain); err != nil {
				// Continue with other domains
				continue
			}
		}
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Reminders generated"})
}
