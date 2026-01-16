# LIYF Expansion Plan

> Last Updated: January 2026

This document outlines all remaining work for the LIYF (Live Your Life Fully) application, organized by module and priority.

---

## Current Status Overview

| Module | Completion | Status |
|--------|------------|--------|
| Finance | 100% | Complete |
| Household | 100% | Complete |
| Cooking | 90% | URL import & ingredient search done, missing external APIs |
| Reading | 95% | Import, stats, detail page done |
| Plants | 75% | Core complete, missing photos/notifications |
| Coding | 70% | Core complete, missing templates/actions |
| Calendar | 70% | Core complete, household integration done |
| Settings | 90% | Missing data export, 2FA |
| Hub | 95% | Hardcoded placeholders to fix |

---

## Phase 1: Household Module (COMPLETE)

**Priority: Critical** - **DONE January 16, 2026**

### Completed

- [x] Database migration `008_household.sql` with full schema
- [x] Backend models with computed fields (DaysUntilDue, MonthlyEquivalent, etc.)
- [x] Repository layer with full CRUD operations
- [x] HTTP handlers with all endpoints
- [x] Routes registered at `/api/v1/household`
- [x] Hub integration with Household summary
- [x] Frontend types and API client
- [x] Bills page with payment tracking
- [x] Subscriptions page with cost analysis
- [x] Insurance page with renewal tracking
- [x] Maintenance page with completion logging
- [x] Dashboard with summary widgets

---

## Phase 2: Calendar Integrations

**Priority: High**

### CalDAV Sync Implementation

**File:** `api/internal/handlers/calendar.go`

- [ ] Implement CalDAV client library integration
- [ ] iCloud Calendar authentication flow
- [ ] Google Calendar API integration
- [ ] Two-way sync for reminders/events
- [ ] Background sync job (cron)
- [ ] Conflict resolution strategy

### Notifications

- [ ] Web push notification setup (service worker)
- [ ] Email notification service
- [ ] Notification preferences in settings
- [ ] Reminder scheduling system
- [ ] Daily digest email option

### Cross-Module Integration

- [ ] Add "Create Reminder" button to Plants (watering schedules) - *Already has auto-generation*
- [ ] Add "Create Reminder" button to Cooking (meal prep)
- [ ] Add "Create Reminder" button to Reading (reading goals)
- [x] Add "Create Reminder" button to Household (bill due dates) - *DONE - auto-generates bills, insurance, maintenance reminders*

---

## Phase 3: Cooking Module Enhancements

**Priority: High** - **Core features DONE January 16, 2026**

### Recipe Scraping Service

- [x] ~~Create Python microservice for recipe scraping~~ *Implemented in Go*
- [x] Support major recipe sites (AllRecipes, BBC Good Food, etc.)
- [x] Extract: title, ingredients, instructions, time, servings
- [x] Handle structured data (JSON-LD, schema.org)
- [x] Fallback to HTML parsing
- [x] API endpoint: `POST /api/recipes/import-url`

### External Recipe Search

- [ ] BBC Good Food API integration
- [ ] Waitrose recipe search
- [ ] Recipe search aggregation
- [ ] Import external recipes to local collection

### Ingredient Features

- [x] Ingredient-based recipe search ("what can I make with...")
- [ ] Pantry/inventory tracking
- [ ] Ingredient substitution suggestions
- [x] **Fix:** Ingredient multiplier in meal plans (`meal_plan.go:256`)

---

## Phase 4: Reading Module Enhancements (COMPLETE)

**Priority: Medium** - **DONE January 16, 2026**

### Import Features

- [x] Goodreads CSV import
- [x] Parse Goodreads export format
- [x] Map fields to local book model
- [x] Handle duplicates
- [x] Import reading history and ratings

### Statistics Dashboard

- [x] Books read by month/year
- [x] Pages read tracking
- [x] Genre breakdown charts
- [x] Reading pace/velocity
- [x] Reading goals and progress
- [x] Author statistics

### Book Details

- [x] Full book detail page
- [x] Reading progress tracking
- [x] Notes and highlights (via reviews)
- [x] Book cover image handling

---

## Phase 5: Plants Module Enhancements

**Priority: Medium**

### Photo Management

- [ ] Photo upload for plants
- [ ] Image storage (local or S3)
- [ ] Photo gallery per plant
- [ ] Growth timeline with photos
- [ ] Thumbnail generation

### Smart Features

- [ ] Plant identification API integration (Plant.id or similar)
- [ ] Species-specific care tips
- [ ] Seasonal care reminders
- [ ] Health assessment from photos

### Notifications

- [ ] Watering reminder notifications
- [ ] Fertilizing schedule alerts
- [ ] Push notifications (web)
- [ ] Email reminders option

---

## Phase 6: Coding Module Enhancements

**Priority: Medium**

### Template System

- [ ] Template scaffold download
- [ ] Project generator from templates
- [ ] Custom template creation
- [ ] Template variables and customization

### GitHub Integration

- [ ] Create repos from templates
- [ ] Commit activity visualization
- [ ] Contribution graph
- [ ] GitHub Actions status display
- [ ] Workflow run history

---

## Phase 7: Settings & Security

**Priority: Medium**

### Data Export

**File:** `frontend/src/pages/Settings.tsx:239`

- [ ] Implement full data export
- [ ] Export formats: JSON, CSV
- [ ] Include all user data across modules
- [ ] Email delivery option
- [ ] Download as ZIP

### Two-Factor Authentication

- [ ] TOTP implementation (Google Authenticator compatible)
- [ ] QR code generation for setup
- [ ] Backup codes
- [ ] 2FA enforcement option

### Account Management

- [ ] Account deletion with data purge
- [ ] Data retention policy
- [ ] Export before delete option

---

## Phase 8: Hub & Dashboard Improvements

**Priority: Low**

### Fix Hardcoded Placeholders

**File:** `api/internal/handlers/hub.go`

- [ ] Household summary (when implemented)
- [ ] Cooking summary with real stats
- [ ] Reading summary with real stats
- [ ] Coding summary with real stats

### Dashboard Widgets

- [ ] Customizable widget layout
- [ ] Widget size options
- [ ] Drag and drop reordering
- [ ] Widget visibility settings

---

## Technical Debt

### Code Quality

- [ ] Add comprehensive test coverage
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Error handling standardization
- [ ] Logging improvements

### Performance

- [ ] Database query optimization
- [ ] Frontend code splitting
- [ ] Image optimization pipeline
- [ ] Caching strategy (Redis)

### DevOps

- [ ] CI/CD pipeline
- [ ] Automated testing in pipeline
- [ ] Staging environment
- [ ] Database backup automation

---

## Database Migrations Checklist

| Migration | Status | Description |
|-----------|--------|-------------|
| 001_init.sql | Done | Core schema, users, portfolios |
| 002_liyf_hub.sql | Done | Hub, activity tracking |
| 003_cooking.sql | Done | Recipes, meal plans, shopping |
| 004_reading.sql | Done | Books, reading lists |
| 005_plants.sql | Done | Plants, care logs |
| 006_coding.sql | Done | GitHub config, snippets, templates |
| 007_calendar.sql | Done | Calendar config, reminders |
| 008_household.sql | Done | Bills, subscriptions, insurance, maintenance |

---

## Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Household | 2-3 weeks | None |
| Phase 2: Calendar Integrations | 1-2 weeks | External APIs |
| Phase 3: Cooking Enhancements | 1-2 weeks | Python service |
| Phase 4: Reading Enhancements | 1 week | None |
| Phase 5: Plants Enhancements | 1 week | External APIs |
| Phase 6: Coding Enhancements | 1 week | GitHub API |
| Phase 7: Settings & Security | 1 week | None |
| Phase 8: Hub Improvements | 3-4 days | Other phases |

---

## Quick Wins (Can be done immediately)

1. ~~Fix ingredient multiplier bug in meal plans~~ **DONE**
2. Remove hardcoded "Coming Soon" from Hub API
3. Implement settings data export (basic JSON)
4. Add reminder creation buttons to module pages
5. ~~Reading statistics with existing data~~ **DONE**

---

## Notes

- All new features should follow existing patterns in the codebase
- Use existing UI components from `@/components/ui`
- Follow the HubLayout pattern for new module pages
- Maintain consistent API response formats
- Add new routes to both `api/cmd/server/main.go` and `frontend/src/App.tsx`
