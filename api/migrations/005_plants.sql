-- Migration: 005_plants.sql
-- Description: Plants module - plant tracking, care logging, health monitoring

-- Plants table
CREATE TABLE IF NOT EXISTS plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(100) NOT NULL,
    species VARCHAR(255),
    variety VARCHAR(255),
    nickname VARCHAR(100),

    -- Location
    room VARCHAR(100),
    location_detail VARCHAR(255),

    -- Photo
    photo_url VARCHAR(500),

    -- Acquisition
    acquired_date DATE,
    acquired_from VARCHAR(255),
    purchase_price DECIMAL(10, 2),

    -- Care requirements
    watering_frequency_days INT DEFAULT 7,
    light_requirement VARCHAR(50) DEFAULT 'medium', -- low, medium, bright_indirect, direct
    humidity_preference VARCHAR(50) DEFAULT 'medium', -- low, medium, high

    -- Fertilizing
    fertilizing_frequency_days INT,
    last_fertilized_at DATE,

    -- Status
    health_status VARCHAR(20) DEFAULT 'healthy', -- thriving, healthy, fair, struggling, critical
    is_active BOOLEAN DEFAULT true,

    -- Last care dates
    last_watered_at DATE,
    last_repotted_at DATE,
    last_pruned_at DATE,

    -- Next care dates (computed/cached)
    next_water_date DATE,
    next_fertilize_date DATE,

    -- Notes
    notes TEXT,
    care_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plant care logs
CREATE TABLE IF NOT EXISTS plant_care_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    care_type VARCHAR(50) NOT NULL, -- watered, fertilized, pruned, repotted, treated, misted, rotated, cleaned
    care_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    photo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plant health logs
CREATE TABLE IF NOT EXISTS plant_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    health_status VARCHAR(20) NOT NULL,
    observations TEXT[], -- yellowing, wilting, drooping, pests, spots, new_growth, flowering, etc.
    actions_taken TEXT[],
    notes TEXT,
    photo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plants_user ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_active ON plants(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plants_next_water ON plants(user_id, next_water_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plants_room ON plants(user_id, room);
CREATE INDEX IF NOT EXISTS idx_plants_health ON plants(user_id, health_status);
CREATE INDEX IF NOT EXISTS idx_plant_care_logs_plant ON plant_care_logs(plant_id, care_date DESC);
CREATE INDEX IF NOT EXISTS idx_plant_care_logs_user ON plant_care_logs(user_id, care_date DESC);
CREATE INDEX IF NOT EXISTS idx_plant_health_logs_plant ON plant_health_logs(plant_id, log_date DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_plants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plants_updated_at ON plants;
CREATE TRIGGER plants_updated_at
    BEFORE UPDATE ON plants
    FOR EACH ROW
    EXECUTE FUNCTION update_plants_updated_at();
