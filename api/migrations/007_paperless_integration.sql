-- Paperless-ngx Integration
-- Migration 007
-- Adds Paperless configuration to households and creates document_links table

-- Add Paperless configuration to households
ALTER TABLE households ADD COLUMN IF NOT EXISTS paperless_url VARCHAR(255);
ALTER TABLE households ADD COLUMN IF NOT EXISTS paperless_api_token TEXT;

-- Document links table - stores references to Paperless documents
CREATE TABLE IF NOT EXISTS document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    -- Paperless reference
    paperless_document_id INT NOT NULL,
    paperless_title VARCHAR(255),
    paperless_correspondent VARCHAR(100),
    paperless_document_type VARCHAR(100),
    paperless_created DATE,
    cached_at TIMESTAMPTZ DEFAULT NOW(),

    -- Local categorisation
    category VARCHAR(50), -- IDENTITY, INSURANCE, PROPERTY, VEHICLE, FINANCIAL, MEDICAL, LEGAL, OTHER
    description TEXT,

    -- Polymorphic links to entities
    linked_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    linked_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    linked_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    linked_policy_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate links to the same Paperless document within a household
    UNIQUE(household_id, paperless_document_id)
);

-- Index for household lookup
CREATE INDEX IF NOT EXISTS idx_document_links_household ON document_links(household_id);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_document_links_category ON document_links(category) WHERE category IS NOT NULL;

-- Index for linked entities
CREATE INDEX IF NOT EXISTS idx_document_links_person ON document_links(linked_person_id) WHERE linked_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_links_property ON document_links(linked_property_id) WHERE linked_property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_links_vehicle ON document_links(linked_vehicle_id) WHERE linked_vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_links_policy ON document_links(linked_policy_id) WHERE linked_policy_id IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_document_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_links_updated_at ON document_links;
CREATE TRIGGER trigger_document_links_updated_at
    BEFORE UPDATE ON document_links
    FOR EACH ROW
    EXECUTE FUNCTION update_document_links_updated_at();
