# Wellf: Family Life Management "Second Brain" Expansion Plan

## Executive Summary

This document outlines a comprehensive, phased approach to expanding the Wellf portfolio management system into a holistic family life management platform. The goal is to create a centralised "second brain" where families can manage their financial, property, vehicle, insurance, and personal information in one secure, interconnected system.

---

## Vision & Core Principles

### Ultimate Vision
A single, unified platform where a family can:
- Track all financial assets and liabilities
- Manage property and vehicle information
- Store and track all insurance policies with renewal reminders
- Maintain family member profiles with important dates and documents
- Generate comprehensive reports for tax, insurance, and planning purposes
- Set goals and track progress across all life domains

### Architectural Principles
1. **Entity-First Design**: Build core entities (Person, Home, Vehicle) that other features reference
2. **Relationship-Centric**: Model real-world relationships between entities
3. **Progressive Enhancement**: Each phase delivers standalone value while building toward the whole
4. **Existing Pattern Compliance**: Follow established Go repository/handler patterns and React/TypeScript conventions
5. **Multi-Tenancy Ready**: Design for household-level access from the start

---

## Phase Overview

```
Phase 1: Core Entity Foundation (4-6 weeks)
    └── Person, Family, Household models
    
Phase 2: Property & Vehicle Management (4-5 weeks)
    └── Home, Vehicle entities with ownership links
    
Phase 3: Insurance Policy Tracking (3-4 weeks)
    └── Policies linked to entities, renewal tracking
    
Phase 4: Document Management (3-4 weeks)
    └── File storage, document linking to entities
    
Phase 5: Calendar & Reminders (2-3 weeks)
    └── Unified calendar, automated reminders
    
Phase 6: Reporting & Insights (3-4 weeks)
    └── Cross-entity reports, net worth including assets
    
Phase 7: Advanced Features (Ongoing)
    └── Goals, budgeting, expense tracking, AI insights
```

---

## Phase 1: Core Entity Foundation

### Objective
Establish the foundational entities that all future features will reference: **Person**, **Family**, and **Household**.

### 1.1 Database Schema

```sql
-- migrations/002_family_entities.sql

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
    invite_status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined
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
    national_insurance_number VARCHAR(20), -- Encrypted
    passport_number VARCHAR(50), -- Encrypted
    driving_licence_number VARCHAR(50), -- Encrypted
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
    relationship_type VARCHAR(30) NOT NULL, -- spouse, child, parent, sibling, etc.
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
```

### 1.2 Backend Implementation

#### Models (`api/internal/models/family.go`)

```go
// Relationship types
const (
    RelationshipSpouse    = "SPOUSE"
    RelationshipPartner   = "PARTNER"
    RelationshipChild     = "CHILD"
    RelationshipParent    = "PARENT"
    RelationshipSibling   = "SIBLING"
    RelationshipGrandchild = "GRANDCHILD"
    RelationshipGrandparent = "GRANDPARENT"
    RelationshipOther     = "OTHER"
)

// Household roles
const (
    HouseholdRoleOwner  = "owner"
    HouseholdRoleAdmin  = "admin"
    HouseholdRoleMember = "member"
    HouseholdRoleViewer = "viewer"
)

type Household struct {
    ID          uuid.UUID `json:"id"`
    Name        string    `json:"name"`
    OwnerUserID uuid.UUID `json:"owner_user_id"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    Members     []HouseholdMember `json:"members,omitempty"`
}

type HouseholdMember struct {
    ID           uuid.UUID  `json:"id"`
    HouseholdID  uuid.UUID  `json:"household_id"`
    UserID       *uuid.UUID `json:"user_id,omitempty"`
    Role         string     `json:"role"`
    InvitedEmail string     `json:"invited_email,omitempty"`
    InviteStatus string     `json:"invite_status"`
    CreatedAt    time.Time  `json:"created_at"`
}

type Person struct {
    ID                      uuid.UUID       `json:"id"`
    HouseholdID             uuid.UUID       `json:"household_id"`
    UserID                  *uuid.UUID      `json:"user_id,omitempty"`
    FirstName               string          `json:"first_name"`
    LastName                string          `json:"last_name,omitempty"`
    Nickname                string          `json:"nickname,omitempty"`
    DateOfBirth             *time.Time      `json:"date_of_birth,omitempty"`
    Gender                  string          `json:"gender,omitempty"`
    Email                   string          `json:"email,omitempty"`
    Phone                   string          `json:"phone,omitempty"`
    NationalInsuranceNumber string          `json:"national_insurance_number,omitempty"` // Encrypted
    PassportNumber          string          `json:"passport_number,omitempty"`          // Encrypted
    DrivingLicenceNumber    string          `json:"driving_licence_number,omitempty"`   // Encrypted
    BloodType               string          `json:"blood_type,omitempty"`
    MedicalNotes            string          `json:"medical_notes,omitempty"`
    EmergencyContactName    string          `json:"emergency_contact_name,omitempty"`
    EmergencyContactPhone   string          `json:"emergency_contact_phone,omitempty"`
    AvatarURL               string          `json:"avatar_url,omitempty"`
    IsPrimaryAccountHolder  bool            `json:"is_primary_account_holder"`
    Metadata                *PersonMetadata `json:"metadata,omitempty"`
    CreatedAt               time.Time       `json:"created_at"`
    UpdatedAt               time.Time       `json:"updated_at"`
    Age                     int             `json:"age,omitempty"` // Computed
    Relationships           []FamilyRelationship `json:"relationships,omitempty"`
}

type PersonMetadata struct {
    Occupation       string `json:"occupation,omitempty"`
    Employer         string `json:"employer,omitempty"`
    Allergies        []string `json:"allergies,omitempty"`
    Medications      []string `json:"medications,omitempty"`
    DoctorName       string `json:"doctor_name,omitempty"`
    DoctorPhone      string `json:"doctor_phone,omitempty"`
    DentistName      string `json:"dentist_name,omitempty"`
    DentistPhone     string `json:"dentist_phone,omitempty"`
    SchoolName       string `json:"school_name,omitempty"`
    Notes            string `json:"notes,omitempty"`
}

type FamilyRelationship struct {
    ID              uuid.UUID `json:"id"`
    HouseholdID     uuid.UUID `json:"household_id"`
    PersonID        uuid.UUID `json:"person_id"`
    RelatedPersonID uuid.UUID `json:"related_person_id"`
    RelationshipType string   `json:"relationship_type"`
    CreatedAt       time.Time `json:"created_at"`
    RelatedPerson   *Person   `json:"related_person,omitempty"`
}
```

#### Repository (`api/internal/repository/household.go`, `person.go`)

Follow existing patterns from `portfolio.go`:
- CRUD operations for Household, HouseholdMember, Person
- GetByHouseholdID for listing
- Relationship management functions

#### Handlers (`api/internal/handlers/household.go`, `person.go`)

```go
// Routes to add in main.go
r.Route("/households", func(r chi.Router) {
    r.Use(authMiddleware.Authenticate)
    r.Post("/", householdHandler.Create)
    r.Get("/", householdHandler.GetUserHouseholds)
    r.Get("/{id}", householdHandler.GetByID)
    r.Put("/{id}", householdHandler.Update)
    r.Delete("/{id}", householdHandler.Delete)
    r.Post("/{id}/members", householdHandler.InviteMember)
    r.Delete("/{id}/members/{memberId}", householdHandler.RemoveMember)
})

r.Route("/people", func(r chi.Router) {
    r.Use(authMiddleware.Authenticate)
    r.Get("/", personHandler.GetByHousehold)
    r.Post("/", personHandler.Create)
    r.Get("/{id}", personHandler.GetByID)
    r.Put("/{id}", personHandler.Update)
    r.Delete("/{id}", personHandler.Delete)
    r.Post("/{id}/relationships", personHandler.AddRelationship)
    r.Delete("/{id}/relationships/{relId}", personHandler.RemoveRelationship)
})
```

### 1.3 Frontend Implementation

#### Types (`frontend/src/types/family.ts`)

```typescript
export interface Household {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  members?: HouseholdMember[];
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_email?: string;
  invite_status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface Person {
  id: string;
  household_id: string;
  user_id?: string;
  first_name: string;
  last_name?: string;
  nickname?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  avatar_url?: string;
  is_primary_account_holder: boolean;
  metadata?: PersonMetadata;
  created_at: string;
  updated_at: string;
  age?: number;
  relationships?: FamilyRelationship[];
}

export type RelationshipType = 
  | 'SPOUSE' | 'PARTNER' | 'CHILD' | 'PARENT' 
  | 'SIBLING' | 'GRANDCHILD' | 'GRANDPARENT' | 'OTHER';

export interface FamilyRelationship {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: RelationshipType;
  related_person?: Person;
}
```

#### New Pages
- `/family` - Family overview with member cards
- `/family/members` - List/manage family members
- `/family/members/:id` - Individual person profile
- `/family/tree` - Visual family tree (optional)
- `/settings?section=household` - Household settings

#### Components
- `FamilyMemberCard` - Card showing person summary
- `PersonForm` - Add/edit person form
- `RelationshipBadge` - Shows relationship type
- `FamilyTreeDiagram` - Visual relationship display (Recharts or D3)

### 1.4 Migration Steps

1. Create migration file `002_family_entities.sql`
2. Add models to `models/family.go`
3. Create repositories: `household.go`, `person.go`
4. Create handlers following existing patterns
5. Register routes in `main.go`
6. Add frontend types and API client
7. Build pages and components
8. Add navigation to sidebar

### 1.5 Testing Checklist

- [ ] Create household assigns owner correctly
- [ ] Invite member sends email (if email service exists)
- [ ] Person CRUD with all fields
- [ ] Relationships are bidirectional (create both directions)
- [ ] Household access control (only members can view)
- [ ] Sensitive fields encryption working
- [ ] Frontend forms validate required fields
- [ ] Family tree renders correctly with relationships

---

## Phase 2: Property & Vehicle Management

### Objective
Create **Home** and **Vehicle** entities that can be linked to People and later to Insurance policies.

### 2.1 Database Schema

```sql
-- migrations/003_property_vehicle.sql

-- Properties (homes, rental properties, land)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    property_type VARCHAR(30) NOT NULL, -- PRIMARY_RESIDENCE, RENTAL, HOLIDAY_HOME, LAND, OTHER
    ownership_type VARCHAR(30) NOT NULL, -- FREEHOLD, LEASEHOLD, SHARED_OWNERSHIP
    
    -- Address
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    county VARCHAR(100),
    postcode VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'United Kingdom',
    
    -- Financial
    purchase_date DATE,
    purchase_price DECIMAL(20, 2),
    current_value DECIMAL(20, 2),
    valuation_date DATE,
    currency CHAR(3) DEFAULT 'GBP',
    
    -- Mortgage (if applicable)
    has_mortgage BOOLEAN DEFAULT false,
    mortgage_provider VARCHAR(100),
    mortgage_account_number VARCHAR(50),
    mortgage_start_date DATE,
    mortgage_term_months INT,
    mortgage_balance DECIMAL(20, 2),
    mortgage_rate DECIMAL(5, 4),
    mortgage_rate_type VARCHAR(20), -- FIXED, VARIABLE, TRACKER
    mortgage_rate_end_date DATE,
    monthly_payment DECIMAL(10, 2),
    
    -- Property details
    bedrooms INT,
    bathrooms INT,
    square_footage DECIMAL(10, 2),
    year_built INT,
    epc_rating VARCHAR(5),
    council_tax_band VARCHAR(5),
    
    -- Rental (if applicable)
    is_rented_out BOOLEAN DEFAULT false,
    monthly_rent DECIMAL(10, 2),
    tenant_name VARCHAR(100),
    tenancy_start_date DATE,
    tenancy_end_date DATE,
    
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property ownership (links properties to people)
CREATE TABLE IF NOT EXISTS property_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    ownership_percentage DECIMAL(5, 2) DEFAULT 100.00,
    is_primary_resident BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, person_id)
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(100), -- Friendly name e.g., "Family Car"
    registration_number VARCHAR(20) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    variant VARCHAR(100),
    year INT NOT NULL,
    colour VARCHAR(30),
    body_type VARCHAR(30), -- HATCHBACK, SALOON, ESTATE, SUV, etc.
    fuel_type VARCHAR(20), -- PETROL, DIESEL, ELECTRIC, HYBRID, PLUGIN_HYBRID
    transmission VARCHAR(20), -- MANUAL, AUTOMATIC
    engine_size_cc INT,
    doors INT,
    
    -- Identifiers
    vin VARCHAR(17),
    
    -- Financial
    purchase_date DATE,
    purchase_price DECIMAL(20, 2),
    current_value DECIMAL(20, 2),
    valuation_date DATE,
    currency CHAR(3) DEFAULT 'GBP',
    
    -- Finance (if applicable)
    has_finance BOOLEAN DEFAULT false,
    finance_type VARCHAR(20), -- PCP, HP, LEASE, LOAN
    finance_provider VARCHAR(100),
    finance_agreement_number VARCHAR(50),
    finance_start_date DATE,
    finance_end_date DATE,
    finance_balance DECIMAL(20, 2),
    monthly_payment DECIMAL(10, 2),
    balloon_payment DECIMAL(20, 2),
    annual_mileage_limit INT,
    
    -- Important dates
    mot_expiry_date DATE,
    tax_expiry_date DATE,
    service_due_date DATE,
    service_due_mileage INT,
    
    -- Current status
    current_mileage INT,
    mileage_updated_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle ownership/usage
CREATE TABLE IF NOT EXISTS vehicle_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    is_registered_keeper BOOLEAN DEFAULT false,
    is_primary_driver BOOLEAN DEFAULT false,
    is_named_driver BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vehicle_id, person_id)
);

-- Vehicle service history
CREATE TABLE IF NOT EXISTS vehicle_service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- MOT, SERVICE, REPAIR, TYRE_CHANGE, etc.
    provider VARCHAR(100),
    mileage INT,
    cost DECIMAL(10, 2),
    currency CHAR(3) DEFAULT 'GBP',
    description TEXT,
    next_service_date DATE,
    next_service_mileage INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_household ON properties(household_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_property ON property_owners(property_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_person ON property_owners(person_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_household ON vehicles(household_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_users_vehicle ON vehicle_users(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_users_person ON vehicle_users(person_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_service_vehicle ON vehicle_service_records(vehicle_id);
```

### 2.2 Backend Implementation

#### Models (`api/internal/models/property.go`, `vehicle.go`)

```go
// Property types
const (
    PropertyTypePrimaryResidence = "PRIMARY_RESIDENCE"
    PropertyTypeRental           = "RENTAL"
    PropertyTypeHolidayHome      = "HOLIDAY_HOME"
    PropertyTypeLand             = "LAND"
    PropertyTypeOther            = "OTHER"
)

// Ownership types
const (
    OwnershipFreehold       = "FREEHOLD"
    OwnershipLeasehold      = "LEASEHOLD"
    OwnershipSharedOwnership = "SHARED_OWNERSHIP"
)

// Vehicle finance types
const (
    FinanceTypePCP   = "PCP"
    FinanceTypeHP    = "HP"
    FinanceTypeLease = "LEASE"
    FinanceTypeLoan  = "LOAN"
)

type Property struct {
    ID              uuid.UUID `json:"id"`
    HouseholdID     uuid.UUID `json:"household_id"`
    Name            string    `json:"name"`
    PropertyType    string    `json:"property_type"`
    OwnershipType   string    `json:"ownership_type"`
    // ... all fields
    Owners          []PropertyOwner `json:"owners,omitempty"`
    Equity          float64   `json:"equity,omitempty"` // Computed: current_value - mortgage_balance
}

type Vehicle struct {
    ID                 uuid.UUID `json:"id"`
    HouseholdID        uuid.UUID `json:"household_id"`
    Name               string    `json:"name,omitempty"`
    RegistrationNumber string    `json:"registration_number"`
    Make               string    `json:"make"`
    Model              string    `json:"model"`
    // ... all fields
    Users              []VehicleUser `json:"users,omitempty"`
    ServiceRecords     []VehicleServiceRecord `json:"service_records,omitempty"`
    DaysUntilMOT       int       `json:"days_until_mot,omitempty"` // Computed
    DaysUntilTax       int       `json:"days_until_tax,omitempty"` // Computed
}
```

### 2.3 Frontend Pages

- `/properties` - List all properties with summary cards
- `/properties/:id` - Property detail with mortgage tracker, equity chart
- `/properties/:id/edit` - Edit property form
- `/vehicles` - List all vehicles
- `/vehicles/:id` - Vehicle detail with MOT/tax countdown, service history
- `/vehicles/:id/service` - Add service record

### 2.4 Key Features

**Properties:**
- Equity calculator (value - mortgage)
- Mortgage rate end date alerts
- Rental income tracking
- Link to property fixed asset for net worth calculation

**Vehicles:**
- MOT/Tax expiry warnings
- Service due reminders
- Mileage tracking
- DVLA API integration (optional enhancement)

### 2.5 Integration Points

- Link properties to `fixed_assets` table for net worth
- Link vehicles to `fixed_assets` for depreciation tracking
- Both will link to insurance policies in Phase 3

---

## Phase 3: Insurance Policy Tracking

### Objective
Create a comprehensive **Insurance Policy** system that links to People, Properties, and Vehicles.

### 3.1 Database Schema

```sql
-- migrations/004_insurance.sql

-- Insurance policies
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Policy basics
    policy_type VARCHAR(30) NOT NULL, -- HOME, VEHICLE, HEALTH, LIFE, TRAVEL, PET, CONTENTS, LANDLORD
    policy_number VARCHAR(100) NOT NULL,
    policy_name VARCHAR(100),
    
    -- Provider
    provider_name VARCHAR(100) NOT NULL,
    provider_phone VARCHAR(50),
    provider_email VARCHAR(255),
    provider_website VARCHAR(255),
    provider_portal_url VARCHAR(255),
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE,
    auto_renew BOOLEAN DEFAULT false,
    
    -- Financial
    premium_amount DECIMAL(10, 2) NOT NULL,
    premium_frequency VARCHAR(20) NOT NULL, -- MONTHLY, ANNUAL, QUARTERLY
    annual_premium DECIMAL(10, 2),
    excess_amount DECIMAL(10, 2),
    currency CHAR(3) DEFAULT 'GBP',
    
    -- Coverage
    cover_amount DECIMAL(20, 2),
    cover_type VARCHAR(50), -- COMPREHENSIVE, THIRD_PARTY, etc.
    
    -- Linked entities (polymorphic)
    linked_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    linked_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled, pending
    
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance policy covered people
CREATE TABLE IF NOT EXISTS insurance_covered_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    coverage_type VARCHAR(50), -- PRIMARY, SPOUSE, DEPENDENT, NAMED_DRIVER
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(policy_id, person_id)
);

-- Insurance claims history
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    claim_number VARCHAR(100),
    claim_date DATE NOT NULL,
    incident_date DATE,
    description TEXT NOT NULL,
    claim_amount DECIMAL(20, 2),
    settled_amount DECIMAL(20, 2),
    status VARCHAR(20) NOT NULL, -- submitted, in_progress, approved, rejected, settled
    settlement_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance documents
CREATE TABLE IF NOT EXISTS insurance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- POLICY, SCHEDULE, CERTIFICATE, CLAIM, OTHER
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_policies_household ON insurance_policies(household_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_type ON insurance_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_renewal ON insurance_policies(renewal_date);
CREATE INDEX IF NOT EXISTS idx_insurance_covered_people_policy ON insurance_covered_people(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON insurance_claims(policy_id);
```

### 3.2 Insurance Types & Metadata

```go
// Policy types with specific metadata
const (
    InsuranceTypeHome     = "HOME"
    InsuranceTypeVehicle  = "VEHICLE"
    InsuranceTypeHealth   = "HEALTH"
    InsuranceTypeLife     = "LIFE"
    InsuranceTypeTravel   = "TRAVEL"
    InsuranceTypePet      = "PET"
    InsuranceTypeContents = "CONTENTS"
    InsuranceTypeLandlord = "LANDLORD"
)

type InsurancePolicyMetadata struct {
    // Home insurance
    BuildingsCover      float64 `json:"buildings_cover,omitempty"`
    ContentsCover       float64 `json:"contents_cover,omitempty"`
    AccidentalDamage    bool    `json:"accidental_damage,omitempty"`
    LegalExpenses       bool    `json:"legal_expenses,omitempty"`
    HomeEmergency       bool    `json:"home_emergency,omitempty"`
    
    // Vehicle insurance
    CoverType           string  `json:"cover_type,omitempty"` // COMPREHENSIVE, THIRD_PARTY_FIRE_THEFT, THIRD_PARTY
    VoluntaryExcess     float64 `json:"voluntary_excess,omitempty"`
    NoClaimsDiscount    int     `json:"no_claims_discount,omitempty"` // Years
    ProtectedNCD        bool    `json:"protected_ncd,omitempty"`
    BreakdownCover      bool    `json:"breakdown_cover,omitempty"`
    CourtesyCar         bool    `json:"courtesy_car,omitempty"`
    
    // Health insurance
    InpatientCover      bool    `json:"inpatient_cover,omitempty"`
    OutpatientCover     bool    `json:"outpatient_cover,omitempty"`
    DentalCover         bool    `json:"dental_cover,omitempty"`
    OpticalCover        bool    `json:"optical_cover,omitempty"`
    MentalHealthCover   bool    `json:"mental_health_cover,omitempty"`
    
    // Life insurance
    LifeCoverAmount     float64 `json:"life_cover_amount,omitempty"`
    CriticalIllness     bool    `json:"critical_illness,omitempty"`
    TermYears           int     `json:"term_years,omitempty"`
}
```

### 3.3 Frontend Pages

- `/insurance` - Dashboard showing all policies with renewal timeline
- `/insurance/policies` - List all policies
- `/insurance/policies/:id` - Policy detail
- `/insurance/renewals` - Upcoming renewals view
- `/insurance/claims` - Claims history

### 3.4 Key Features

1. **Renewal Alerts**: Notify X days before expiry (configurable)
2. **Comparison Mode**: Compare quotes when renewal due
3. **Document Storage**: Attach policy documents
4. **Claims Tracking**: Log and track claims
5. **Cost Analysis**: Show annual insurance spend by category

---

## Phase 4: Document Management

### Objective
Create a centralised document storage system linked to all entities.

### 4.1 Database Schema

```sql
-- migrations/005_documents.sql

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- File info
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Categorisation
    category VARCHAR(50) NOT NULL, -- IDENTITY, FINANCIAL, PROPERTY, VEHICLE, INSURANCE, MEDICAL, LEGAL, OTHER
    subcategory VARCHAR(50),
    tags TEXT[], -- Array of tags for flexible categorisation
    
    -- Metadata
    title VARCHAR(255),
    description TEXT,
    document_date DATE, -- Date on the document
    expiry_date DATE, -- If document expires (passport, etc.)
    
    -- Linked entities (can link to multiple)
    linked_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    linked_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    linked_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    linked_policy_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,
    
    -- Access
    uploaded_by UUID NOT NULL REFERENCES users(id),
    is_sensitive BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_household ON documents(household_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN (tags);
```

### 4.2 Storage Strategy

**Option A: Local Storage (Simple)**
- Store in `/uploads/{household_id}/{category}/{uuid}.{ext}`
- Configure in environment variable
- Good for self-hosted deployments

**Option B: Cloud Storage (Scalable)**
- S3-compatible storage (AWS S3, MinIO, Cloudflare R2)
- Signed URLs for secure access
- Good for production deployments

### 4.3 Frontend Features

- Drag-and-drop upload
- Category/tag filtering
- Full-text search (optional: integrate with PostgreSQL FTS)
- Document preview (PDF, images)
- Expiry date alerts

---

## Phase 5: Calendar & Reminders

### Objective
Unified calendar showing all important dates with automated reminders.

### 5.1 Database Schema

```sql
-- migrations/006_calendar.sql

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Event details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- BIRTHDAY, RENEWAL, MOT, TAX, APPOINTMENT, CUSTOM
    
    -- Timing
    event_date DATE NOT NULL,
    event_time TIME,
    is_all_day BOOLEAN DEFAULT true,
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule VARCHAR(255), -- RRULE format
    
    -- Source (auto-generated events)
    source_type VARCHAR(50), -- PERSON, PROPERTY, VEHICLE, INSURANCE, MANUAL
    source_id UUID,
    
    -- Reminders
    reminder_days INT[], -- Array of days before to remind
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    
    -- Reminder details
    title VARCHAR(255) NOT NULL,
    message TEXT,
    reminder_date DATE NOT NULL,
    reminder_time TIME,
    
    -- Delivery
    notify_email BOOLEAN DEFAULT true,
    notify_push BOOLEAN DEFAULT false,
    
    -- Status
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_household ON calendar_events(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(is_sent, reminder_date);
```

### 5.2 Auto-Generated Events

System automatically creates events for:
- Birthdays (from People)
- MOT expiry dates (from Vehicles)
- Tax expiry dates (from Vehicles)
- Service due dates (from Vehicles)
- Insurance renewal dates (from Policies)
- Mortgage rate end dates (from Properties)
- Tenancy end dates (from Properties)
- Document expiry dates (from Documents)

### 5.3 Background Job

```go
// services/reminder_service.go
// Run daily to:
// 1. Generate reminder entries based on reminder_days
// 2. Send notifications for due reminders
// 3. Update event dates for recurring events
```

---

## Phase 6: Reporting & Insights

### Objective
Comprehensive reports that pull data from all entities.

### 6.1 Report Types

**Net Worth Report**
- Total assets (investments + properties + vehicles + other)
- Total liabilities (mortgages + finance + loans)
- Net worth over time chart
- Breakdown by category

**Insurance Overview**
- All active policies
- Total annual premium
- Upcoming renewals
- Coverage gaps analysis

**Property Report**
- Property values over time
- Equity growth
- Rental income (if applicable)
- Mortgage amortisation schedule

**Family Overview**
- Family tree visualisation
- Important dates upcoming
- Document expiry warnings
- Action items summary

### 6.2 Dashboard Enhancements

Update existing dashboard to include:
- Insurance renewal alerts widget
- MOT/Tax due widget
- Upcoming birthdays widget
- Document expiry widget

---

## Phase 7: Advanced Features (Future)

### 7.1 Goal Tracking
- Set goals for savings, mortgage payoff, etc.
- Track progress with milestones
- Link to relevant entities

### 7.2 Budgeting & Expenses
- Monthly budget categories
- Expense tracking (manual or bank integration)
- Cash flow projections

### 7.3 AI Insights
- Spend analysis with recommendations
- Insurance comparison suggestions
- Net worth projections

### 7.4 Sharing & Permissions
- Share specific data with advisors (accountants, solicitors)
- Time-limited access links
- Audit log of access

### 7.5 Mobile App
- React Native or PWA
- Document scanning with OCR
- Quick add for expenses

---

## Implementation Workflow

### For Each Phase

1. **Planning Session**
   - Review this plan with Claude
   - Refine requirements based on current state
   - Break into smaller tasks

2. **Database First**
   - Create migration file
   - Run migration locally
   - Verify schema

3. **Backend Development**
   - Models
   - Repository (CRUD operations)
   - Service layer (business logic)
   - Handlers (HTTP endpoints)
   - Register routes
   - Write tests

4. **Frontend Development**
   - Types
   - API client
   - Store (if needed)
   - Components
   - Pages
   - Navigation updates

5. **Integration Testing**
   - End-to-end flows
   - Edge cases
   - Error handling

6. **Review & Refine**
   - UI/UX polish
   - Performance optimisation
   - Security review

---

## Working with Claude

### Effective Prompts for Each Phase

**Starting a Phase:**
```
I'm ready to start Phase [X] of the Wellf expansion plan. 
Here's what we're building: [brief description]
Let's begin with the database migration. Please create the SQL file 
following the patterns in my existing 001_init.sql migration.
```

**Backend Development:**
```
Now let's create the [Entity] model and repository. 
Follow the patterns from my existing portfolio.go repository.
Include: [specific operations needed]
```

**Frontend Development:**
```
Create the [Page/Component] following my existing patterns:
- Use shadcn/ui components
- Follow the Settings.tsx page layout
- Use Zustand for state if needed
Reference my existing types in frontend/src/types/index.ts
```

**Debugging:**
```
I'm getting this error: [error message]
Here's the relevant code: [code snippet]
This is for the [feature] in Phase [X].
```

---

## Quick Reference: Entity Relationships

```
Household
├── Users (members)
├── People (family members)
│   ├── Relationships (to other People)
│   ├── PropertyOwnership
│   ├── VehicleUsage
│   └── InsuranceCoverage
├── Properties
│   ├── Owners (People)
│   └── InsurancePolicies
├── Vehicles
│   ├── Users (People)
│   ├── ServiceRecords
│   └── InsurancePolicies
├── InsurancePolicies
│   ├── CoveredPeople
│   ├── Claims
│   └── Documents
├── Documents
│   └── Links to all entities
└── CalendarEvents
    └── Reminders
```

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Core Entities | 4-6 weeks | 4-6 weeks |
| Phase 2: Property & Vehicle | 4-5 weeks | 8-11 weeks |
| Phase 3: Insurance | 3-4 weeks | 11-15 weeks |
| Phase 4: Documents | 3-4 weeks | 14-19 weeks |
| Phase 5: Calendar | 2-3 weeks | 16-22 weeks |
| Phase 6: Reporting | 3-4 weeks | 19-26 weeks |

**Total: ~5-7 months for full implementation**

---

## Next Steps

1. Review this plan and adjust priorities
2. Set up project tracking (GitHub Issues/Projects)
3. Begin Phase 1 with household migration
4. Use this document as reference throughout

---

*Document created: January 2026*
*To be used alongside Claude for implementation guidance*
