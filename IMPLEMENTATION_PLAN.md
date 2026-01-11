# Wellf Family Expansion - Implementation Plan

This file tracks implementation progress across sessions. Update checkboxes as work is completed.

---

## Current Status

**Current Phase:** Phase 1 - Core Entity Foundation (Complete)
**Started:** 2026-01-10
**Last Updated:** 2026-01-10

---

## Phase 1: Core Entity Foundation

### 1.1 Database Migration
- [x] Create `api/migrations/002_family_entities.sql`
  - [x] `households` table
  - [x] `household_members` table
  - [x] `people` table
  - [x] `family_relationships` table
  - [x] All indexes
- [ ] Run migration locally and verify schema

### 1.2 Backend - Models
- [x] Create `api/internal/models/family.go`
  - [x] Household struct
  - [x] HouseholdMember struct
  - [x] Person struct
  - [x] PersonMetadata struct
  - [x] FamilyRelationship struct
  - [x] Constants for relationship types and roles

### 1.3 Backend - Repositories
- [x] Create `api/internal/repository/household.go`
  - [x] Create
  - [x] GetByID
  - [x] GetByUserID (all households user is member of)
  - [x] Update
  - [x] Delete
  - [x] AddMember
  - [x] RemoveMember
  - [x] GetMembers
  - [x] BelongsToUser (access control)
- [x] Create `api/internal/repository/person.go`
  - [x] Create
  - [x] GetByID
  - [x] GetByHouseholdID
  - [x] Update
  - [x] Delete
  - [x] AddRelationship
  - [x] RemoveRelationship
  - [x] GetRelationships
  - [x] BelongsToHousehold (access control)

### 1.4 Backend - Handlers
- [x] Create `api/internal/handlers/household.go`
  - [x] Create (POST /households)
  - [x] GetUserHouseholds (GET /households)
  - [x] GetByID (GET /households/{id})
  - [x] Update (PUT /households/{id})
  - [x] Delete (DELETE /households/{id})
  - [x] InviteMember (POST /households/{id}/members)
  - [x] RemoveMember (DELETE /households/{id}/members/{memberId})
- [x] Create `api/internal/handlers/person.go`
  - [x] Create (POST /people)
  - [x] GetByHousehold (GET /people)
  - [x] GetByID (GET /people/{id})
  - [x] Update (PUT /people/{id})
  - [x] Delete (DELETE /people/{id})
  - [x] AddRelationship (POST /people/{id}/relationships)
  - [x] RemoveRelationship (DELETE /people/{id}/relationships/{relId})

### 1.5 Backend - Routes & Middleware
- [x] Add household access middleware
- [x] Register routes in `main.go`
- [x] Add config endpoint for relationship types

### 1.6 Frontend - Types
- [x] Create `frontend/src/types/family.ts` (added to index.ts)
  - [x] Household interface
  - [x] HouseholdMember interface
  - [x] Person interface
  - [x] PersonMetadata interface
  - [x] FamilyRelationship interface
  - [x] RelationshipType type

### 1.7 Frontend - API Client
- [x] Create `frontend/src/api/household.ts`
- [x] Create `frontend/src/api/person.ts`

### 1.8 Frontend - Store
- [x] Create `frontend/src/store/household.ts` (current household context)

### 1.9 Frontend - Pages
- [x] Create `/family` - Family overview dashboard (combined with members list)
- [x] Create `/family/members` - List all family members (included in /family page)
- [x] Create `/family/members/new` - Add new person (inline form in /family page)
- [x] Create `/family/members/:id` - Person profile/edit (inline edit in /family page)
- [ ] Update `/settings` - Add household settings section (deferred)

### 1.10 Frontend - Components
- [x] Create `FamilyMemberCard` component (inline in Family.tsx)
- [x] Create `PersonForm` component (inline in Family.tsx)
- [x] Create `RelationshipBadge` component (inline in Family.tsx)
- [ ] Create `HouseholdSelector` component (for header) (deferred - single household for now)

### 1.11 Frontend - Navigation
- [x] Add "Family" section to sidebar
- [ ] Add household switcher to header (if user has multiple) (deferred)

### 1.12 Testing & Polish
- [ ] Test household CRUD
- [ ] Test person CRUD
- [ ] Test relationship management
- [ ] Test access control (user can only see own households)
- [ ] Test UI responsiveness
- [ ] Handle loading and error states

---

## Phase 2: Property & Vehicle Management

### 2.1 Database Migration
- [ ] Create `api/migrations/003_property_vehicle.sql`
  - [ ] `properties` table
  - [ ] `property_owners` table
  - [ ] `vehicles` table
  - [ ] `vehicle_users` table
  - [ ] `vehicle_service_records` table
  - [ ] All indexes

### 2.2 Backend - Models
- [ ] Create `api/internal/models/property.go`
- [ ] Create `api/internal/models/vehicle.go`

### 2.3 Backend - Repositories
- [ ] Create `api/internal/repository/property.go`
- [ ] Create `api/internal/repository/vehicle.go`

### 2.4 Backend - Handlers
- [ ] Create `api/internal/handlers/property.go`
- [ ] Create `api/internal/handlers/vehicle.go`

### 2.5 Backend - Routes
- [ ] Register property routes
- [ ] Register vehicle routes

### 2.6 Frontend - Types
- [ ] Add Property types to `family.ts` or new file
- [ ] Add Vehicle types

### 2.7 Frontend - API & Store
- [ ] Create property API client
- [ ] Create vehicle API client

### 2.8 Frontend - Pages
- [ ] Create `/properties` - List properties
- [ ] Create `/properties/:id` - Property detail
- [ ] Create `/vehicles` - List vehicles
- [ ] Create `/vehicles/:id` - Vehicle detail

### 2.9 Frontend - Components
- [ ] PropertyCard component
- [ ] PropertyForm component
- [ ] VehicleCard component
- [ ] VehicleForm component
- [ ] ServiceRecordForm component
- [ ] MortgageTracker component
- [ ] MOT/Tax countdown component

### 2.10 Integration
- [ ] Link properties to fixed_assets for net worth
- [ ] Link vehicles to fixed_assets
- [ ] Update dashboard with property/vehicle widgets

---

## Phase 3: Insurance Policy Tracking

### 3.1 Database Migration
- [ ] Create `api/migrations/004_insurance.sql`
  - [ ] `insurance_policies` table
  - [ ] `insurance_covered_people` table
  - [ ] `insurance_claims` table
  - [ ] `insurance_documents` table

### 3.2 Backend Implementation
- [ ] Models
- [ ] Repositories
- [ ] Handlers
- [ ] Routes

### 3.3 Frontend Implementation
- [ ] Types
- [ ] API client
- [ ] Pages (`/insurance`, `/insurance/policies/:id`)
- [ ] Components (PolicyCard, PolicyForm, ClaimForm)

### 3.4 Features
- [ ] Link policies to properties/vehicles/people
- [ ] Renewal date tracking
- [ ] Claims history

---

## Phase 4: Document Management

### 4.1 Database Migration
- [ ] Create `api/migrations/005_documents.sql`

### 4.2 Backend Implementation
- [ ] Document upload endpoint
- [ ] File storage service - (assume user has onedrive or other cloud account)
- [ ] Document retrieval with signed URLs

### 4.3 Frontend Implementation
- [ ] Document upload component
- [ ] Document list/grid view
- [ ] Document preview modal
- [ ] Link documents to entities

---

## Phase 5: Calendar & Reminders

### 5.1 Database Migration
- [ ] Create `api/migrations/006_calendar.sql`

### 5.2 Backend Implementation
- [ ] Calendar event CRUD
- [ ] Auto-generate events from entities
- [ ] Reminder service (background job)

### 5.3 Frontend Implementation
- [ ] Calendar page
- [ ] Upcoming events widget
- [ ] Reminder settings

---

## Phase 6: Reporting & Insights

### 6.1 Backend Implementation
- [ ] Net worth calculation service
- [ ] Report generation endpoints

### 6.2 Frontend Implementation
- [ ] Net worth report page
- [ ] Insurance overview report
- [ ] Enhanced dashboard widgets

---

## Notes & Decisions

### Architecture Decisions
- Using existing Go patterns from portfolio/holdings
- Household-scoped data access (all entities belong to household)
- Sensitive fields (NI number, passport) stored encrypted
- Frontend uses Zustand for household context

### Open Questions
- [ ] Email service for invitations - implement or skip for now?
- [ ] Document storage - store links only (assume user has onedrive or other cloud account)
- [ ] Family tree visualization library choice

### Session Notes
_Add notes here during implementation sessions_

---

## Quick Commands

```bash
# Run API locally
cd api && go run cmd/server/main.go

# Run frontend locally
cd frontend && npm run dev

# Run migrations
# (automatic on API start)

# Build and push images
docker build -t ghcr.io/mark-regan/wellf-api:latest ./api
docker build --build-arg PORT=3001 -t ghcr.io/mark-regan/wellf-frontend:latest ./frontend
docker push ghcr.io/mark-regan/wellf-api:latest
docker push ghcr.io/mark-regan/wellf-frontend:latest
```
