-- Migration: 008_household.sql
-- Description: Household module - bills, subscriptions, insurance, and maintenance tracking

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- utilities, housing, insurance, tax, other

    -- Amount
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',

    -- Provider/payee
    provider VARCHAR(100),
    account_number VARCHAR(100),
    reference VARCHAR(100),

    -- Frequency
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- weekly, fortnightly, monthly, quarterly, annually, one_time
    due_day INT, -- Day of month (1-31) or day of week (1-7) for weekly

    -- Dates
    start_date DATE,
    end_date DATE,
    next_due_date DATE,

    -- Payment method
    payment_method VARCHAR(50), -- direct_debit, standing_order, card, manual

    -- Status
    is_active BOOLEAN DEFAULT true,
    auto_pay BOOLEAN DEFAULT false,

    -- Notifications
    reminder_days INT DEFAULT 3, -- Days before due to remind

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill payments table
CREATE TABLE IF NOT EXISTS bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE, -- The due date this payment was for

    payment_method VARCHAR(50),
    confirmation_number VARCHAR(100),

    is_late BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- streaming, software, news, fitness, gaming, cloud, other

    -- Cost
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',

    -- Provider
    provider VARCHAR(100),
    website_url VARCHAR(500),
    cancel_url VARCHAR(500),

    -- Billing
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- weekly, monthly, quarterly, annually
    billing_day INT, -- Day of month
    next_billing_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_shared BOOLEAN DEFAULT false, -- Shared with family/friends

    -- Trial info
    is_trial BOOLEAN DEFAULT false,
    trial_end_date DATE,

    -- Dates
    start_date DATE,
    cancelled_date DATE,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name VARCHAR(100) NOT NULL,
    policy_type VARCHAR(50) NOT NULL, -- home, car, life, health, travel, pet, gadget, other

    -- Provider
    provider VARCHAR(100) NOT NULL,
    policy_number VARCHAR(100),
    phone VARCHAR(50),
    website_url VARCHAR(500),

    -- Coverage
    coverage_amount DECIMAL(14, 2),
    excess_amount DECIMAL(10, 2),
    coverage_details TEXT,

    -- Premium
    premium_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    payment_frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, annually

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_date DATE,
    next_payment_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT true,

    -- Documents
    document_url VARCHAR(500),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- hvac, plumbing, electrical, appliance, garden, cleaning, safety, other

    -- Frequency
    frequency VARCHAR(20), -- weekly, monthly, quarterly, biannually, annually, as_needed
    frequency_months INT, -- Custom frequency in months

    -- Priority
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent

    -- Scheduling
    last_completed_date DATE,
    next_due_date DATE,
    reminder_days INT DEFAULT 7,

    -- Cost tracking
    estimated_cost DECIMAL(10, 2),
    typical_provider VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT true,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Task info (denormalized in case task is deleted)
    task_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),

    -- Completion details
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Cost
    cost DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'GBP',

    -- Provider
    provider VARCHAR(100),
    provider_contact VARCHAR(100),

    -- Details
    work_done TEXT,
    parts_used TEXT,
    duration_minutes INT,

    -- Attachments
    receipt_url VARCHAR(500),
    photo_url VARCHAR(500),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_active ON bills(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(user_id, next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bills_category ON bills(user_id, category);

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON bill_payments(bill_id, paid_date DESC);
CREATE INDEX IF NOT EXISTS idx_bill_payments_user ON bill_payments(user_id, paid_date DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON subscriptions(user_id, next_billing_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(user_id, category);

CREATE INDEX IF NOT EXISTS idx_insurance_user ON insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_active ON insurance_policies(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_insurance_renewal ON insurance_policies(user_id, renewal_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_insurance_type ON insurance_policies(user_id, policy_type);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_user ON maintenance_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_active ON maintenance_tasks(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_due ON maintenance_tasks(user_id, next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_category ON maintenance_tasks(user_id, category);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_task ON maintenance_logs(task_id, completed_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user ON maintenance_logs(user_id, completed_date DESC);

-- Triggers to update updated_at
CREATE OR REPLACE FUNCTION update_household_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bills_updated_at ON bills;
CREATE TRIGGER bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_household_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_household_updated_at();

DROP TRIGGER IF EXISTS insurance_policies_updated_at ON insurance_policies;
CREATE TRIGGER insurance_policies_updated_at
    BEFORE UPDATE ON insurance_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_household_updated_at();

DROP TRIGGER IF EXISTS maintenance_tasks_updated_at ON maintenance_tasks;
CREATE TRIGGER maintenance_tasks_updated_at
    BEFORE UPDATE ON maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_household_updated_at();
