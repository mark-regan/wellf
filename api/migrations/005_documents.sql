-- Document Management
-- Migration 005
-- Documents are stored as links (URLs) to external storage (OneDrive, Google Drive, etc.)

-- Document categories
-- IDENTITY: Passport, driving licence, birth certificate
-- PROPERTY: Deeds, contracts, surveys
-- VEHICLE: V5C, MOT certificates, service history
-- INSURANCE: Policy documents, certificates
-- FINANCIAL: Statements, tax returns
-- MEDICAL: Medical records, prescriptions
-- LEGAL: Wills, powers of attorney
-- OTHER: Miscellaneous documents

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    -- Document info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- IDENTITY, PROPERTY, VEHICLE, INSURANCE, FINANCIAL, MEDICAL, LEGAL, OTHER

    -- Link to external storage
    url TEXT NOT NULL,
    file_type VARCHAR(50), -- PDF, DOC, JPG, PNG, etc.
    file_size BIGINT, -- Size in bytes (optional metadata)

    -- Dates
    document_date DATE, -- Date of the document itself
    expiry_date DATE, -- For documents that expire

    -- Tags for additional categorization
    tags TEXT[], -- Array of tags

    -- Linked entities (optional)
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    insurance_policy_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for household lookup
CREATE INDEX IF NOT EXISTS idx_documents_household ON documents(household_id);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Index for expiry dates (for reminders)
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Index for linked entities
CREATE INDEX IF NOT EXISTS idx_documents_person ON documents(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON documents(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_insurance ON documents(insurance_policy_id) WHERE insurance_policy_id IS NOT NULL;

-- GIN index for tag searching
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON documents;
CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();
