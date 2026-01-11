-- Family Entities Migration
-- Phase 1: Core Entity Foundation - Households, People, Relationships

-- Households represent a family unit (can share data)
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household members (links users to households with roles)
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    invited_email VARCHAR(255),
    invite_status VARCHAR(20) DEFAULT 'accepted', -- pending, accepted, declined
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, user_id)
);

-- People (family members, may or may not have user accounts)
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    nickname VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(50),
    national_insurance_number VARCHAR(255), -- Encrypted in application layer
    passport_number VARCHAR(255), -- Encrypted in application layer
    driving_licence_number VARCHAR(255), -- Encrypted in application layer
    blood_type VARCHAR(10),
    medical_notes TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    avatar_url VARCHAR(500),
    is_primary_account_holder BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family relationships
CREATE TABLE IF NOT EXISTS family_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    related_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    relationship_type VARCHAR(30) NOT NULL, -- SPOUSE, PARTNER, CHILD, PARENT, SIBLING, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(person_id, related_person_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_households_owner ON households(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_people_household ON people(household_id);
CREATE INDEX IF NOT EXISTS idx_people_user ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_person ON family_relationships(person_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_related ON family_relationships(related_person_id);

-- Auto-create household for existing users
-- Each existing user gets their own household with themselves as owner and member
DO $$
DECLARE
    user_record RECORD;
    new_household_id UUID;
BEGIN
    FOR user_record IN SELECT id, email, display_name FROM users LOOP
        -- Check if user already has a household
        IF NOT EXISTS (SELECT 1 FROM households WHERE owner_user_id = user_record.id) THEN
            -- Create household
            INSERT INTO households (name, owner_user_id)
            VALUES (COALESCE(user_record.display_name, 'My Household'), user_record.id)
            RETURNING id INTO new_household_id;

            -- Add user as owner member
            INSERT INTO household_members (household_id, user_id, role, invite_status)
            VALUES (new_household_id, user_record.id, 'owner', 'accepted');

            -- Create person record for the user
            INSERT INTO people (household_id, user_id, first_name, email, is_primary_account_holder)
            VALUES (
                new_household_id,
                user_record.id,
                COALESCE(SPLIT_PART(user_record.display_name, ' ', 1), SPLIT_PART(user_record.email, '@', 1)),
                user_record.email,
                true
            );
        END IF;
    END LOOP;
END $$;
