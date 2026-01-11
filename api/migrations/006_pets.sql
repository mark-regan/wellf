-- Migration: 006_pets.sql
-- Description: Add pets table for household pet management

-- Pet types enum
DO $$ BEGIN
    CREATE TYPE pet_type AS ENUM (
        'DOG', 'CAT', 'BIRD', 'FISH', 'REPTILE', 'RABBIT', 'HAMSTER', 'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Pet gender enum
DO $$ BEGIN
    CREATE TYPE pet_gender AS ENUM (
        'MALE', 'FEMALE', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    pet_type VARCHAR(50) NOT NULL,
    breed VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(50),
    microchip_number VARCHAR(100),
    vet_name VARCHAR(255),
    vet_phone VARCHAR(50),
    vet_address TEXT,
    insurance_policy_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pets_household_id ON pets(household_id);
CREATE INDEX IF NOT EXISTS idx_pets_insurance_policy_id ON pets(insurance_policy_id);
CREATE INDEX IF NOT EXISTS idx_pets_pet_type ON pets(pet_type);

-- Add pet count to household overview queries
COMMENT ON TABLE pets IS 'Stores pets belonging to a household';
