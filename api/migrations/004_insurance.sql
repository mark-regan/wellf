-- Insurance Policies and Claims
-- Migration 004

-- Insurance policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    -- Basic info
    policy_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50) NOT NULL, -- HOME, MOTOR, LIFE, HEALTH, TRAVEL, PET, CONTENTS, LANDLORD, OTHER
    provider VARCHAR(255),
    policy_number VARCHAR(100),

    -- Dates
    start_date DATE,
    end_date DATE,
    renewal_date DATE,

    -- Financial
    premium_amount DECIMAL(15, 2),
    premium_frequency VARCHAR(20), -- MONTHLY, QUARTERLY, ANNUALLY
    excess_amount DECIMAL(15, 2),
    cover_amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'GBP',

    -- Auto-renewal
    auto_renewal BOOLEAN DEFAULT false,

    -- Linked entities (optional references)
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

    -- Contact & reference
    broker_name VARCHAR(255),
    broker_phone VARCHAR(50),
    broker_email VARCHAR(255),

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for household lookup
CREATE INDEX IF NOT EXISTS idx_insurance_policies_household ON insurance_policies(household_id);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_insurance_policies_type ON insurance_policies(policy_type);

-- Index for renewal dates (for reminders)
CREATE INDEX IF NOT EXISTS idx_insurance_policies_renewal ON insurance_policies(renewal_date);

-- People covered by policies
CREATE TABLE IF NOT EXISTS insurance_covered_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    coverage_type VARCHAR(100), -- PRIMARY, NAMED, DEPENDENT
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(policy_id, person_id)
);

-- Index for policy lookup
CREATE INDEX IF NOT EXISTS idx_insurance_covered_people_policy ON insurance_covered_people(policy_id);

-- Index for person lookup
CREATE INDEX IF NOT EXISTS idx_insurance_covered_people_person ON insurance_covered_people(person_id);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,

    claim_reference VARCHAR(100),
    claim_date DATE NOT NULL,
    incident_date DATE,

    claim_type VARCHAR(100), -- THEFT, DAMAGE, ACCIDENT, MEDICAL, OTHER
    description TEXT,

    -- Financial
    claim_amount DECIMAL(15, 2),
    settled_amount DECIMAL(15, 2),
    excess_paid DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'GBP',

    -- Status
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, APPROVED, REJECTED, SETTLED

    -- Resolution
    resolution_date DATE,
    resolution_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for policy lookup
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON insurance_claims(policy_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);

-- Trigger for updated_at on insurance_policies
CREATE OR REPLACE FUNCTION update_insurance_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_insurance_policies_updated_at ON insurance_policies;
CREATE TRIGGER trigger_insurance_policies_updated_at
    BEFORE UPDATE ON insurance_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_insurance_policies_updated_at();

-- Trigger for updated_at on insurance_claims
CREATE OR REPLACE FUNCTION update_insurance_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_insurance_claims_updated_at ON insurance_claims;
CREATE TRIGGER trigger_insurance_claims_updated_at
    BEFORE UPDATE ON insurance_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_insurance_claims_updated_at();
