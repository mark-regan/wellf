-- Property & Vehicle Management Migration
-- Phase 2: Properties and Vehicles with ownership tracking

-- Properties (houses, flats, land, etc.)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    property_type VARCHAR(50) NOT NULL, -- HOUSE, FLAT, LAND, COMMERCIAL, OTHER
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    county VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United Kingdom',
    purchase_date DATE,
    purchase_price DECIMAL(15,2),
    current_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'GBP',
    bedrooms INTEGER,
    bathrooms INTEGER,
    square_feet INTEGER,
    land_registry_title VARCHAR(100),
    epc_rating VARCHAR(5),
    council_tax_band VARCHAR(5),
    is_primary_residence BOOLEAN DEFAULT false,
    is_rental BOOLEAN DEFAULT false,
    rental_income DECIMAL(10,2),
    mortgage_provider VARCHAR(100),
    mortgage_account_number VARCHAR(100),
    mortgage_balance DECIMAL(15,2),
    mortgage_rate DECIMAL(5,4),
    mortgage_end_date DATE,
    mortgage_monthly_payment DECIMAL(10,2),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property owners (links people to properties with ownership percentage)
CREATE TABLE IF NOT EXISTS property_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    ownership_percentage DECIMAL(5,2) DEFAULT 100.00,
    ownership_type VARCHAR(50), -- SOLE, JOINT_TENANTS, TENANTS_IN_COMMON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, person_id)
);

-- Vehicles (cars, motorcycles, boats, etc.)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- CAR, MOTORCYCLE, VAN, BOAT, CARAVAN, OTHER
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    registration VARCHAR(20),
    vin VARCHAR(50),
    color VARCHAR(50),
    fuel_type VARCHAR(50), -- PETROL, DIESEL, ELECTRIC, HYBRID, OTHER
    transmission VARCHAR(50), -- MANUAL, AUTOMATIC
    engine_size VARCHAR(20),
    mileage INTEGER,
    purchase_date DATE,
    purchase_price DECIMAL(15,2),
    current_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'GBP',
    mot_expiry DATE,
    tax_expiry DATE,
    insurance_expiry DATE,
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(100),
    finance_provider VARCHAR(100),
    finance_end_date DATE,
    finance_monthly_payment DECIMAL(10,2),
    finance_balance DECIMAL(15,2),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle users (who is allowed to use each vehicle)
CREATE TABLE IF NOT EXISTS vehicle_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    is_primary_driver BOOLEAN DEFAULT false,
    is_named_on_insurance BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vehicle_id, person_id)
);

-- Vehicle service records
CREATE TABLE IF NOT EXISTS vehicle_service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- MOT, SERVICE, REPAIR, TYRE, OTHER
    service_date DATE NOT NULL,
    mileage INTEGER,
    provider VARCHAR(100),
    description TEXT,
    cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'GBP',
    next_service_date DATE,
    next_service_mileage INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_household ON properties(household_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_property ON property_owners(property_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_person ON property_owners(person_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_household ON vehicles(household_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_users_vehicle ON vehicle_users(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_users_person ON vehicle_users(person_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_service_records_vehicle ON vehicle_service_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry);
CREATE INDEX IF NOT EXISTS idx_vehicles_tax_expiry ON vehicles(tax_expiry);
