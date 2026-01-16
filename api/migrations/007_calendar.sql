-- Calendar Integration Migration
-- Phase 7: Unified reminders and calendar sync

-- Calendar configuration per user
CREATE TABLE IF NOT EXISTS calendar_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'none', -- none, icloud, google, caldav
    caldav_url VARCHAR(500),
    username VARCHAR(255),
    password TEXT, -- Encrypted (app-specific password for iCloud)
    calendar_id VARCHAR(255), -- Specific calendar to use
    calendar_name VARCHAR(255),
    is_active BOOLEAN DEFAULT false,
    sync_enabled BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Unified reminders from all domains
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Source domain
    domain VARCHAR(50) NOT NULL, -- plants, finance, cooking, reading, coding, household, custom
    entity_type VARCHAR(50), -- plant, book, recipe, bill, etc.
    entity_id UUID,
    entity_name VARCHAR(255),

    -- Reminder content
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Timing
    reminder_date DATE NOT NULL,
    reminder_time TIME,
    is_all_day BOOLEAN DEFAULT true,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type VARCHAR(20), -- daily, weekly, monthly, yearly, custom
    recurrence_interval INT DEFAULT 1, -- Every X days/weeks/months
    recurrence_end_date DATE,

    -- Notification settings
    notify_days_before INT DEFAULT 0, -- 0 = on the day, 1 = day before, etc.
    notify_email BOOLEAN DEFAULT false,
    notify_push BOOLEAN DEFAULT true,

    -- Calendar sync
    external_event_id VARCHAR(255),
    external_event_url VARCHAR(500),
    is_synced BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,

    -- Status
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    is_snoozed BOOLEAN DEFAULT false,
    snoozed_until DATE,

    -- Auto-generated flag (from other modules)
    is_auto_generated BOOLEAN DEFAULT false,
    auto_generate_key VARCHAR(255), -- Unique key to prevent duplicates

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_configs_user ON calendar_configs(user_id);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_user_date ON reminders(user_id, reminder_date);
CREATE INDEX idx_reminders_pending ON reminders(user_id, is_completed, is_dismissed, reminder_date)
    WHERE is_completed = false AND is_dismissed = false;
CREATE INDEX idx_reminders_domain ON reminders(domain, entity_id);
CREATE INDEX idx_reminders_auto_key ON reminders(user_id, auto_generate_key) WHERE auto_generate_key IS NOT NULL;
CREATE INDEX idx_reminders_upcoming ON reminders(user_id, reminder_date, is_completed, is_dismissed)
    WHERE is_completed = false AND is_dismissed = false;
