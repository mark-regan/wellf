package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

// =============================================================================
// CalendarConfigRepository
// =============================================================================

type CalendarConfigRepository struct {
	pool *pgxpool.Pool
}

func NewCalendarConfigRepository(pool *pgxpool.Pool) *CalendarConfigRepository {
	return &CalendarConfigRepository{pool: pool}
}

func (r *CalendarConfigRepository) Get(ctx context.Context, userID uuid.UUID) (*models.CalendarConfig, error) {
	query := `
		SELECT id, user_id, provider, caldav_url, username, password, calendar_id,
			   calendar_name, is_active, sync_enabled, last_sync_at, sync_error,
			   created_at, updated_at
		FROM calendar_configs
		WHERE user_id = $1
	`

	var config models.CalendarConfig
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&config.ID, &config.UserID, &config.Provider, &config.CalDAVURL,
		&config.Username, &config.Password, &config.CalendarID, &config.CalendarName,
		&config.IsActive, &config.SyncEnabled, &config.LastSyncAt, &config.SyncError,
		&config.CreatedAt, &config.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (r *CalendarConfigRepository) Upsert(ctx context.Context, config *models.CalendarConfig) error {
	query := `
		INSERT INTO calendar_configs (
			id, user_id, provider, caldav_url, username, password, calendar_id,
			calendar_name, is_active, sync_enabled, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
		ON CONFLICT (user_id) DO UPDATE SET
			provider = EXCLUDED.provider,
			caldav_url = EXCLUDED.caldav_url,
			username = EXCLUDED.username,
			password = COALESCE(NULLIF(EXCLUDED.password, ''), calendar_configs.password),
			calendar_id = EXCLUDED.calendar_id,
			calendar_name = EXCLUDED.calendar_name,
			is_active = EXCLUDED.is_active,
			sync_enabled = EXCLUDED.sync_enabled,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`

	if config.ID == uuid.Nil {
		config.ID = uuid.New()
	}

	return r.pool.QueryRow(ctx, query,
		config.ID, config.UserID, config.Provider, config.CalDAVURL,
		config.Username, config.Password, config.CalendarID, config.CalendarName,
		config.IsActive, config.SyncEnabled, time.Now(),
	).Scan(&config.ID, &config.CreatedAt, &config.UpdatedAt)
}

func (r *CalendarConfigRepository) UpdateSyncStatus(ctx context.Context, userID uuid.UUID, syncError *string) error {
	query := `
		UPDATE calendar_configs
		SET last_sync_at = NOW(), sync_error = $2, updated_at = NOW()
		WHERE user_id = $1
	`
	_, err := r.pool.Exec(ctx, query, userID, syncError)
	return err
}

func (r *CalendarConfigRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM calendar_configs WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// =============================================================================
// ReminderRepository
// =============================================================================

type ReminderRepository struct {
	pool *pgxpool.Pool
}

func NewReminderRepository(pool *pgxpool.Pool) *ReminderRepository {
	return &ReminderRepository{pool: pool}
}

func (r *ReminderRepository) List(ctx context.Context, userID uuid.UUID, includeCompleted bool, limit int) ([]*models.Reminder, error) {
	query := `
		SELECT id, user_id, domain, entity_type, entity_id, entity_name,
			   title, description, reminder_date, reminder_time, is_all_day,
			   is_recurring, recurrence_type, recurrence_interval, recurrence_end_date,
			   notify_days_before, notify_email, notify_push,
			   external_event_id, external_event_url, is_synced, last_synced_at,
			   priority, is_completed, completed_at, is_dismissed, dismissed_at,
			   is_snoozed, snoozed_until, is_auto_generated, auto_generate_key,
			   created_at, updated_at
		FROM reminders
		WHERE user_id = $1
	`
	args := []interface{}{userID}

	if !includeCompleted {
		query += " AND is_completed = false AND is_dismissed = false"
	}

	query += " ORDER BY reminder_date ASC, created_at ASC"

	if limit > 0 {
		query += " LIMIT $2"
		args = append(args, limit)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanReminders(rows)
}

func (r *ReminderRepository) GetUpcoming(ctx context.Context, userID uuid.UUID, daysAhead int, limit int) ([]*models.Reminder, error) {
	if daysAhead <= 0 {
		daysAhead = 7
	}
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT id, user_id, domain, entity_type, entity_id, entity_name,
			   title, description, reminder_date, reminder_time, is_all_day,
			   is_recurring, recurrence_type, recurrence_interval, recurrence_end_date,
			   notify_days_before, notify_email, notify_push,
			   external_event_id, external_event_url, is_synced, last_synced_at,
			   priority, is_completed, completed_at, is_dismissed, dismissed_at,
			   is_snoozed, snoozed_until, is_auto_generated, auto_generate_key,
			   created_at, updated_at
		FROM reminders
		WHERE user_id = $1
		  AND is_completed = false
		  AND is_dismissed = false
		  AND (is_snoozed = false OR snoozed_until <= CURRENT_DATE)
		  AND reminder_date <= CURRENT_DATE + $2
		ORDER BY reminder_date ASC, priority DESC, created_at ASC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, userID, daysAhead, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanReminders(rows)
}

func (r *ReminderRepository) GetOverdue(ctx context.Context, userID uuid.UUID) ([]*models.Reminder, error) {
	query := `
		SELECT id, user_id, domain, entity_type, entity_id, entity_name,
			   title, description, reminder_date, reminder_time, is_all_day,
			   is_recurring, recurrence_type, recurrence_interval, recurrence_end_date,
			   notify_days_before, notify_email, notify_push,
			   external_event_id, external_event_url, is_synced, last_synced_at,
			   priority, is_completed, completed_at, is_dismissed, dismissed_at,
			   is_snoozed, snoozed_until, is_auto_generated, auto_generate_key,
			   created_at, updated_at
		FROM reminders
		WHERE user_id = $1
		  AND is_completed = false
		  AND is_dismissed = false
		  AND reminder_date < CURRENT_DATE
		ORDER BY reminder_date ASC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanReminders(rows)
}

func (r *ReminderRepository) GetByDomain(ctx context.Context, userID uuid.UUID, domain string, limit int) ([]*models.Reminder, error) {
	query := `
		SELECT id, user_id, domain, entity_type, entity_id, entity_name,
			   title, description, reminder_date, reminder_time, is_all_day,
			   is_recurring, recurrence_type, recurrence_interval, recurrence_end_date,
			   notify_days_before, notify_email, notify_push,
			   external_event_id, external_event_url, is_synced, last_synced_at,
			   priority, is_completed, completed_at, is_dismissed, dismissed_at,
			   is_snoozed, snoozed_until, is_auto_generated, auto_generate_key,
			   created_at, updated_at
		FROM reminders
		WHERE user_id = $1 AND domain = $2
		  AND is_completed = false AND is_dismissed = false
		ORDER BY reminder_date ASC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, userID, domain, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanReminders(rows)
}

func (r *ReminderRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Reminder, error) {
	query := `
		SELECT id, user_id, domain, entity_type, entity_id, entity_name,
			   title, description, reminder_date, reminder_time, is_all_day,
			   is_recurring, recurrence_type, recurrence_interval, recurrence_end_date,
			   notify_days_before, notify_email, notify_push,
			   external_event_id, external_event_url, is_synced, last_synced_at,
			   priority, is_completed, completed_at, is_dismissed, dismissed_at,
			   is_snoozed, snoozed_until, is_auto_generated, auto_generate_key,
			   created_at, updated_at
		FROM reminders
		WHERE id = $1
	`

	var reminder models.Reminder
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&reminder.ID, &reminder.UserID, &reminder.Domain, &reminder.EntityType,
		&reminder.EntityID, &reminder.EntityName, &reminder.Title, &reminder.Description,
		&reminder.ReminderDate, &reminder.ReminderTime, &reminder.IsAllDay,
		&reminder.IsRecurring, &reminder.RecurrenceType, &reminder.RecurrenceInterval,
		&reminder.RecurrenceEndDate, &reminder.NotifyDaysBefore, &reminder.NotifyEmail,
		&reminder.NotifyPush, &reminder.ExternalEventID, &reminder.ExternalEventURL,
		&reminder.IsSynced, &reminder.LastSyncedAt, &reminder.Priority, &reminder.IsCompleted,
		&reminder.CompletedAt, &reminder.IsDismissed, &reminder.DismissedAt,
		&reminder.IsSnoozed, &reminder.SnoozedUntil, &reminder.IsAutoGenerated,
		&reminder.AutoGenerateKey, &reminder.CreatedAt, &reminder.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	r.computeFields(&reminder)
	return &reminder, nil
}

func (r *ReminderRepository) Create(ctx context.Context, reminder *models.Reminder) error {
	query := `
		INSERT INTO reminders (
			id, user_id, domain, entity_type, entity_id, entity_name,
			title, description, reminder_date, reminder_time, is_all_day,
			is_recurring, recurrence_type, recurrence_interval, recurrence_end_date,
			notify_days_before, notify_email, notify_push, priority,
			is_auto_generated, auto_generate_key, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $22
		)
		RETURNING id, created_at, updated_at
	`

	if reminder.ID == uuid.Nil {
		reminder.ID = uuid.New()
	}
	if reminder.Priority == "" {
		reminder.Priority = models.ReminderPriorityNormal
	}
	if reminder.RecurrenceInterval == 0 {
		reminder.RecurrenceInterval = 1
	}

	return r.pool.QueryRow(ctx, query,
		reminder.ID, reminder.UserID, reminder.Domain, reminder.EntityType,
		reminder.EntityID, reminder.EntityName, reminder.Title, reminder.Description,
		reminder.ReminderDate, reminder.ReminderTime, reminder.IsAllDay,
		reminder.IsRecurring, reminder.RecurrenceType, reminder.RecurrenceInterval,
		reminder.RecurrenceEndDate, reminder.NotifyDaysBefore, reminder.NotifyEmail,
		reminder.NotifyPush, reminder.Priority, reminder.IsAutoGenerated,
		reminder.AutoGenerateKey, time.Now(),
	).Scan(&reminder.ID, &reminder.CreatedAt, &reminder.UpdatedAt)
}

func (r *ReminderRepository) Update(ctx context.Context, reminder *models.Reminder) error {
	query := `
		UPDATE reminders SET
			title = $2, description = $3, reminder_date = $4, reminder_time = $5,
			is_all_day = $6, is_recurring = $7, recurrence_type = $8,
			recurrence_interval = $9, recurrence_end_date = $10,
			notify_days_before = $11, notify_email = $12, notify_push = $13,
			priority = $14, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	return r.pool.QueryRow(ctx, query,
		reminder.ID, reminder.Title, reminder.Description, reminder.ReminderDate,
		reminder.ReminderTime, reminder.IsAllDay, reminder.IsRecurring,
		reminder.RecurrenceType, reminder.RecurrenceInterval, reminder.RecurrenceEndDate,
		reminder.NotifyDaysBefore, reminder.NotifyEmail, reminder.NotifyPush,
		reminder.Priority,
	).Scan(&reminder.UpdatedAt)
}

func (r *ReminderRepository) Complete(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE reminders SET
			is_completed = true, completed_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

func (r *ReminderRepository) Dismiss(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE reminders SET
			is_dismissed = true, dismissed_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

func (r *ReminderRepository) Snooze(ctx context.Context, id uuid.UUID, until time.Time) error {
	query := `
		UPDATE reminders SET
			is_snoozed = true, snoozed_until = $2, updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id, until)
	return err
}

func (r *ReminderRepository) Unsnooze(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE reminders SET
			is_snoozed = false, snoozed_until = NULL, updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

func (r *ReminderRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM reminders WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

func (r *ReminderRepository) DeleteByAutoKey(ctx context.Context, userID uuid.UUID, autoKey string) error {
	query := `DELETE FROM reminders WHERE user_id = $1 AND auto_generate_key = $2`
	_, err := r.pool.Exec(ctx, query, userID, autoKey)
	return err
}

func (r *ReminderRepository) UpsertByAutoKey(ctx context.Context, reminder *models.Reminder) error {
	query := `
		INSERT INTO reminders (
			id, user_id, domain, entity_type, entity_id, entity_name,
			title, description, reminder_date, reminder_time, is_all_day,
			is_recurring, recurrence_type, recurrence_interval, recurrence_end_date,
			notify_days_before, notify_email, notify_push, priority,
			is_auto_generated, auto_generate_key, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $22
		)
		ON CONFLICT (user_id, auto_generate_key) WHERE auto_generate_key IS NOT NULL
		DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			reminder_date = EXCLUDED.reminder_date,
			reminder_time = EXCLUDED.reminder_time,
			entity_name = EXCLUDED.entity_name,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`

	if reminder.ID == uuid.Nil {
		reminder.ID = uuid.New()
	}
	if reminder.Priority == "" {
		reminder.Priority = models.ReminderPriorityNormal
	}

	return r.pool.QueryRow(ctx, query,
		reminder.ID, reminder.UserID, reminder.Domain, reminder.EntityType,
		reminder.EntityID, reminder.EntityName, reminder.Title, reminder.Description,
		reminder.ReminderDate, reminder.ReminderTime, reminder.IsAllDay,
		reminder.IsRecurring, reminder.RecurrenceType, reminder.RecurrenceInterval,
		reminder.RecurrenceEndDate, reminder.NotifyDaysBefore, reminder.NotifyEmail,
		reminder.NotifyPush, reminder.Priority, reminder.IsAutoGenerated,
		reminder.AutoGenerateKey, time.Now(),
	).Scan(&reminder.ID, &reminder.CreatedAt, &reminder.UpdatedAt)
}

func (r *ReminderRepository) GetSummary(ctx context.Context, userID uuid.UUID) (*models.ReminderSummary, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_completed = false AND is_dismissed = false) as pending,
			COUNT(*) FILTER (WHERE is_completed = false AND is_dismissed = false AND reminder_date < CURRENT_DATE) as overdue,
			COUNT(*) FILTER (WHERE is_completed = false AND is_dismissed = false AND reminder_date = CURRENT_DATE) as today,
			COUNT(*) FILTER (WHERE is_completed = false AND is_dismissed = false AND reminder_date > CURRENT_DATE AND reminder_date <= CURRENT_DATE + 7) as upcoming
		FROM reminders
		WHERE user_id = $1
	`

	var summary models.ReminderSummary
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&summary.TotalReminders, &summary.PendingReminders, &summary.OverdueReminders,
		&summary.TodayReminders, &summary.UpcomingReminders,
	)
	if err != nil {
		return nil, err
	}

	// Get by domain
	domainQuery := `
		SELECT domain, COUNT(*) as count
		FROM reminders
		WHERE user_id = $1 AND is_completed = false AND is_dismissed = false
		GROUP BY domain
	`
	rows, err := r.pool.Query(ctx, domainQuery, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summary.ByDomain = make(map[string]int)
	for rows.Next() {
		var domain string
		var count int
		if err := rows.Scan(&domain, &count); err != nil {
			continue
		}
		summary.ByDomain[domain] = count
	}

	// Get by priority
	priorityQuery := `
		SELECT priority, COUNT(*) as count
		FROM reminders
		WHERE user_id = $1 AND is_completed = false AND is_dismissed = false
		GROUP BY priority
	`
	rows2, err := r.pool.Query(ctx, priorityQuery, userID)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()

	summary.ByPriority = make(map[string]int)
	for rows2.Next() {
		var priority string
		var count int
		if err := rows2.Scan(&priority, &count); err != nil {
			continue
		}
		summary.ByPriority[priority] = count
	}

	return &summary, nil
}

func (r *ReminderRepository) scanReminders(rows pgx.Rows) ([]*models.Reminder, error) {
	var reminders []*models.Reminder
	for rows.Next() {
		var reminder models.Reminder
		err := rows.Scan(
			&reminder.ID, &reminder.UserID, &reminder.Domain, &reminder.EntityType,
			&reminder.EntityID, &reminder.EntityName, &reminder.Title, &reminder.Description,
			&reminder.ReminderDate, &reminder.ReminderTime, &reminder.IsAllDay,
			&reminder.IsRecurring, &reminder.RecurrenceType, &reminder.RecurrenceInterval,
			&reminder.RecurrenceEndDate, &reminder.NotifyDaysBefore, &reminder.NotifyEmail,
			&reminder.NotifyPush, &reminder.ExternalEventID, &reminder.ExternalEventURL,
			&reminder.IsSynced, &reminder.LastSyncedAt, &reminder.Priority, &reminder.IsCompleted,
			&reminder.CompletedAt, &reminder.IsDismissed, &reminder.DismissedAt,
			&reminder.IsSnoozed, &reminder.SnoozedUntil, &reminder.IsAutoGenerated,
			&reminder.AutoGenerateKey, &reminder.CreatedAt, &reminder.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		r.computeFields(&reminder)
		reminders = append(reminders, &reminder)
	}
	return reminders, nil
}

func (r *ReminderRepository) computeFields(reminder *models.Reminder) {
	today := time.Now().Truncate(24 * time.Hour)
	reminderDate := reminder.ReminderDate.Truncate(24 * time.Hour)

	daysUntil := int(reminderDate.Sub(today).Hours() / 24)
	reminder.DaysUntil = &daysUntil
	reminder.IsOverdue = daysUntil < 0 && !reminder.IsCompleted && !reminder.IsDismissed
}
