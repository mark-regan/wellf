# LIYF Expansion Log

> This document tracks the implementation progress of new features.

---

## Phase 8: Household Module

**Started:** January 16, 2026
**Status:** In Progress

### Overview

The Household module will track:
- **Bills** - Recurring bills with due dates and payment tracking
- **Subscriptions** - Monthly/annual subscriptions with renewal tracking
- **Insurance** - Insurance policies with coverage and renewal dates
- **Maintenance** - Home maintenance tasks and scheduling

---

### Task Log

#### January 16, 2026

**[COMPLETED] Database Migration**

Created `008_household.sql` with tables for:
- `bills` - Bill definitions with frequency and due dates
- `bill_payments` - Payment history for bills
- `subscriptions` - Subscription tracking
- `insurance_policies` - Insurance policy details
- `maintenance_tasks` - Recurring maintenance tasks
- `maintenance_logs` - Completed maintenance history

**[COMPLETED] Backend Models**

Added to `models.go`:
- Bill, BillPayment structs with computed fields (DaysUntilDue, IsOverdue)
- Subscription struct with MonthlyEquivalent, AnnualCost calculations
- InsurancePolicy struct with renewal tracking
- MaintenanceTask, MaintenanceLog structs
- HouseholdSummary for dashboard aggregation
- All Create/Update request types

**[COMPLETED] Repository Layer**

Created `household.go` repository (~850 lines) with:
- Full CRUD for Bills with payment tracking and due date advancement
- Full CRUD for Subscriptions with cost calculations
- Full CRUD for Insurance Policies with renewal tracking
- Full CRUD for Maintenance Tasks with completion logging
- GetHouseholdSummary for dashboard stats

**[COMPLETED] HTTP Handlers**

Created `household.go` handlers (~1080 lines) with:
- Routes function returning chi.Router
- Bills: list, create, get, update, delete, pay, payments
- Subscriptions: list, create, get, update, delete
- Insurance: list, create, get, update, delete
- Maintenance: list, create, get, update, delete, complete, logs
- Summary endpoint

**[COMPLETED] Route Registration**

Updated `main.go`:
- Initialized HouseholdRepository
- Initialized HouseholdHandler
- Mounted routes at `/api/v1/household`
- Integrated with Hub summary

**[COMPLETED] Hub Integration**

Updated `hub.go`:
- Added DomainHousehold constant
- Added SetHouseholdRepo method
- Added getHouseholdSummary function
- Household now appears in Hub summary

**[COMPLETED] Frontend Implementation**

Created TypeScript types in `types/index.ts`:
- Bill, BillPayment, Subscription, InsurancePolicy, MaintenanceTask, MaintenanceLog interfaces
- HouseholdSummary interface
- All category and frequency types
- Create/Update request interfaces

Created API client `api/household.ts`:
- Full CRUD operations for Bills, Subscriptions, Insurance, Maintenance
- Payment recording and maintenance completion endpoints
- Summary endpoint

Updated frontend pages:
- `Household.tsx` - Dashboard with summary cards, upcoming bills, overdue alerts, maintenance schedule
- `HouseholdBills.tsx` - Bill management with add/pay/delete, overdue tracking, auto-pay indicators
- `HouseholdSubscriptions.tsx` - Subscription tracking with cost analysis, trial alerts, category icons
- `HouseholdInsurance.tsx` - Policy management with renewal tracking, coverage details, contact info
- `HouseholdMaintenance.tsx` - Task scheduling with priority levels, completion logging, recent history

---

### Summary

**Phase 8: Household Module - COMPLETE**

All components implemented:
- Backend: Migration, Models, Repository, Handlers, Routes
- Frontend: Types, API, Dashboard, Bills, Subscriptions, Insurance, Maintenance
- Integration: Hub summary displays Household data

---

## Phase 2: Calendar Integrations

**Started:** January 16, 2026
**Status:** In Progress

### Overview

Enhancing the Calendar module with cross-module integration for reminders.

---

### Task Log

#### January 16, 2026

**[COMPLETED] Household Reminder Generator**

Updated `reminder_generator.go`:
- Added `householdRepo` field and `SetHouseholdRepo` method
- Added `generateHouseholdReminders` method that calls:
  - `generateBillReminders` - Creates reminders for bills due in next 14 days
  - `generateInsuranceReminders` - Creates reminders for policies renewing in next 30 days
  - `generateMaintenanceReminders` - Creates reminders for tasks due in next 30 days
- Added `frequencyToRecurrence` helper for bill/task frequency conversion
- Reminder priority based on urgency (overdue = urgent, due soon = high)
- Auto-generate keys prevent duplicate reminders via upsert

Updated `main.go`:
- Added `reminderGenerator.SetHouseholdRepo(householdRepo)` call

**[COMPLETED] Household Calendar Sync Button**

Updated `Household.tsx`:
- Added "Sync to Calendar" button in header
- Button calls `calendarApi.generateReminders({ domain: 'household' })`
- Shows spinning animation during sync
- Generates all household reminders (bills, insurance, maintenance)

---

## Phase 3: Cooking Module Enhancements

**Started:** January 16, 2026
**Status:** Complete

### Overview

Enhancing the Cooking module with recipe URL import, ingredient-based search, and bug fixes.

---

### Task Log

#### January 16, 2026

**[COMPLETED] Fix Ingredient Multiplier Bug**

Fixed bug in `meal_plan.go` where ingredient amounts weren't multiplied when generating shopping lists from meal plans with different serving sizes.

Updated `api/internal/repository/meal_plan.go`:
- Added `multiplyIngredientAmount()` helper function
- Handles: simple numbers, fractions (1/2), mixed fractions (1 1/2), ranges (2-3), amounts with units
- Added `formatAmount()` for clean number formatting
- Calculates multiplier from plan servings vs recipe servings

**[COMPLETED] Recipe URL Import/Scraping**

Created `api/internal/services/recipe_scraper.go`:
- Extracts JSON-LD schema.org structured data from recipe websites
- Supports @graph format and array formats
- Parses ingredients, instructions, times, servings, nutrition
- Fallback HTML parsing for basic data (title, image, description)
- ISO 8601 duration parsing (PT1H30M)
- Ingredient amount parsing (fractions, ranges, units)

Updated backend:
- Added `ImportFromURL` handler in `cooking.go`
- Added `POST /api/v1/recipes/import-url` endpoint
- CookingHandler now initializes RecipeScraper

Updated frontend `AddRecipeModal.tsx`:
- Added mode selector: "Import from URL" vs "Add Manually"
- URL import form with loading state
- Success view showing imported recipe preview
- Navigation to view imported recipe

Updated `api/cooking.ts`:
- Added `importFromURL` method

**[COMPLETED] Ingredient-Based Recipe Search**

Added "What Can I Make?" feature to find recipes based on available ingredients.

Backend changes:
- Added `SearchByIngredients()` to RecipeRepository
- Uses JSONB containment queries to match ingredients
- Returns recipes sorted by match count
- Added `RecipeMatch` model with `matching_count` and `total_ingredients`
- Added `SearchByIngredientsRequest` model
- Added `GET/POST /api/v1/recipes/search-by-ingredients` endpoints

Frontend changes in `CookingRecipes.tsx`:
- Added search mode toggle: "Search by Name" / "What Can I Make?"
- Ingredient input with tag management (add/remove)
- Results display showing matched ingredient count
- Clear all button for ingredient tags

Updated `api/cooking.ts`:
- Added `searchByIngredients` method
- Added `RecipeMatch` and `IngredientSearchResponse` types

---

### Summary

**Phase 3: Cooking Enhancements - COMPLETE**

Completed:
- [x] Fix ingredient multiplier bug in meal plans
- [x] Recipe URL import with JSON-LD scraping
- [x] Ingredient-based recipe search ("What Can I Make?")
- [x] Frontend UI for import and ingredient search

Remaining (lower priority):
- [ ] External recipe search APIs (BBC Good Food, Waitrose)
- [ ] Pantry/inventory tracking


---

## Phase 4: Reading Module Enhancements

**Started:** January 16, 2026
**Status:** Complete

### Overview

Enhancing the Reading module with Goodreads import, statistics dashboard, and improved book detail page.

---

### Task Log

#### January 16, 2026

**[COMPLETED] Goodreads CSV Import**

Created `api/internal/services/goodreads_importer.go`:
- Parses Goodreads CSV export format
- Handles various column formats (Book Id, Title, Author, ISBN, etc.)
- Cleans ISBN values (removes `="` prefix from Goodreads format)
- Parses dates in multiple formats
- Maps Goodreads shelves to reading list types (read, currently-reading, to-read)
- Extracts rating, review, and dates for progress tracking

Updated `api/internal/repository/book.go`:
- Added `GetByISBN()` method for efficient duplicate detection

Updated `api/internal/handlers/reading.go`:
- Added `goodreadsImporter` to handler struct
- Added `POST /api/v1/books/import/goodreads` endpoint
- Handles multipart file upload
- Creates books and assigns to appropriate reading lists
- Imports ratings, dates, and reviews

Updated `api/internal/models/models.go`:
- Added `GoodreadsImportResult` struct

Updated frontend `api/reading.ts`:
- Added `importGoodreads` method with file upload support

Updated frontend `types/index.ts`:
- Added `GoodreadsImportResult` interface

Updated `ReadingLibrary.tsx`:
- Added Import button in header
- Created import modal with:
  - Instructions for exporting from Goodreads
  - Drag and drop file upload
  - Import progress and results display
  - Success/error feedback with statistics

**[COMPLETED] Reading Statistics Dashboard**

Created `api/internal/models/models.go` additions:
- `ReadingStats` struct with comprehensive statistics
- `YearlyBookCount`, `MonthlyBookCount` for time-based stats
- `GenreCount`, `AuthorCount` for breakdown stats
- `BookStat` for book records

Updated `api/internal/repository/book.go`:
- Added `GetReadingStats()` method with queries for:
  - Total books and pages read
  - Average rating and page count
  - Books by year with page counts
  - Books by month (last 12 months)
  - Genre breakdown (top 10)
  - Most read authors (top 10)
  - Longest and shortest books

Updated `api/internal/handlers/reading.go`:
- Added `GET /api/v1/books/stats` endpoint

Updated frontend `api/reading.ts`:
- Added `getStats` method

Updated frontend `types/index.ts`:
- Added `ReadingStats` and related interfaces

Created `frontend/src/pages/ReadingStats.tsx`:
- Summary cards (books read, pages, avg rating, reading pace)
- Books by year with progress bars
- Monthly reading chart (bar chart)
- Top genres with progress visualization
- Most read authors ranking
- Book records (longest/shortest)

Updated navigation:
- Added Stats link to reading navigation
- Added route in App.tsx

**[COMPLETED] Enhanced Book Detail Page**

Created `frontend/src/pages/BookDetail.tsx`:
- Full book cover display
- Complete metadata (author, publisher, date, pages, format, ISBN)
- Categories display with tags
- Reading list management:
  - Shows which lists contain the book
  - Add to list functionality
  - Move between lists
  - Remove from list
- Reading progress tracking:
  - Current page / total pages
  - Progress percentage bar
  - Start and finish dates
  - Rating display with stars
  - Review/notes display
- Update progress dialog:
  - Page number input
  - Star rating selector
  - Date pickers for start/finish
  - Review/notes textarea
- Delete book functionality

Updated `App.tsx`:
- Changed `/reading/library/:id` route to use `BookDetail` component

---

### Summary

**Phase 4: Reading Module Enhancements - COMPLETE**

Completed:
- [x] Goodreads CSV import with full data parsing
- [x] Reading statistics dashboard with charts and breakdowns
- [x] Enhanced book detail page with progress tracking and reviews

Remaining (from EXPANSION_PLAN.md, lower priority):
- [ ] Reading progress tracking improvements (already partially implemented)
- [ ] Notes and highlights system (basic notes in reviews)

---

## Phase 5: Plants Module Enhancements

**Started:** January 16, 2026
**Status:** Complete

### Overview

Enhancing the Plants module with photo upload, growth timeline, and care reminder integration.

---

### Task Log

#### January 16, 2026

**[COMPLETED] Plant Photo Upload System**

Created `api/migrations/009_plant_photos.sql`:
- `plant_photos` table with metadata (filename, content_type, file_size, photo_url)
- Photo types: general, growth, problem, treatment, milestone
- Primary photo flag with trigger to ensure only one primary per plant
- Cascade delete when plant is deleted

Created `api/internal/services/file_upload.go`:
- `FileUploadService` for handling image storage
- `UploadImage()` with validation (size limit 10MB, allowed types: JPEG, PNG, GIF, WebP)
- Unique filename generation with timestamp and UUID
- `DeleteFile()` for cleanup
- Configurable upload directory and base URL

Updated `api/internal/models/models.go`:
- Added `PlantPhoto` struct with all metadata fields
- Added `PlantPhotoType` constants
- Added `CreatePlantPhotoRequest` struct

Updated `api/internal/repository/plant.go`:
- Added `PlantPhotoRepository` with full CRUD
- Methods: Create, GetByID, GetByPlant, GetPrimary, SetPrimary, UpdateCaption, Delete, Count
- Added `GetNeedingFertilizer()` method for reminder generation

Updated `api/internal/handlers/plants.go`:
- Added `photoRepo` and `uploadService` fields
- Added photo routes:
  - `GET /{id}/photos` - List photos for plant
  - `POST /{id}/photos` - Upload photo with multipart form
  - `PUT /photos/{photoId}` - Update caption
  - `POST /photos/{photoId}/primary` - Set as primary photo
  - `DELETE /photos/{photoId}` - Delete photo

Updated `api/cmd/server/main.go`:
- Initialized `PlantPhotoRepository`
- Initialized `FileUploadService` with configurable paths
- Added static file server at `/uploads/*` for serving uploaded images
- Set repos on plant handler

Updated frontend `types/index.ts`:
- Added `PlantPhoto` interface
- Added `PlantPhotoType` type

Updated frontend `api/plants.ts`:
- Added `getPlantPhotos`, `uploadPlantPhoto`, `updatePhotoCaption`, `setPhotoPrimary`, `deletePhoto` methods
- Added `PLANT_PHOTO_TYPES` constant for UI

**[COMPLETED] Photo Gallery and Growth Timeline**

Created `frontend/src/components/plants/GrowthTimeline.tsx`:
- Groups photos by month/year
- Timeline UI with month headers and photo cards
- Photo type badges with icons
- Click to view photo details
- Sorted by date (newest first)

Updated `frontend/src/pages/PlantDetail.tsx`:
- Added photo gallery section with grid view
- Primary photo badge indicator
- Photo type overlays on hover
- Upload photo dialog with:
  - File selection with preview
  - Photo type selector
  - Caption input
  - Set as primary checkbox
- Photo viewer dialog with:
  - Full-size image display
  - Caption and date info
  - Set as primary button
  - Delete photo button
- Integrated GrowthTimeline component

**[COMPLETED] Plant Care Reminders Integration**

Updated `api/internal/services/reminder_generator.go`:
- Refactored `generatePlantReminders()` to call sub-functions
- Added `generateWateringReminders()` - Creates reminders for plants needing water
- Added `generateFertilizingReminders()` - Creates reminders for plants needing fertilizer
- Uses `GetNeedingFertilizer()` repo method
- Reminder priority: watering=normal, fertilizing=low

Updated `frontend/src/pages/Plants.tsx`:
- Added "Upcoming Care" section on dashboard
- Fetches plant-specific reminders from calendar API
- Displays reminder cards with:
  - Care type icon (water/fertilize)
  - Reminder title and date
  - Priority badge
  - Link to calendar for full list

---

### Summary

**Phase 5: Plants Module Enhancements - COMPLETE**

Completed:
- [x] Photo upload system with file storage
- [x] Photo gallery with grid view
- [x] Growth timeline component
- [x] Photo viewer with management actions
- [x] Watering reminders integration (already existed)
- [x] Fertilizing reminders generation
- [x] Upcoming care section on Plants dashboard

Remaining (lower priority):
- [ ] Plant identification API integration
- [ ] Plant health tips based on species
- [ ] Photo thumbnails generation

---

## Phase 6: Coding Module Enhancements

**Started:** January 16, 2026
**Status:** Complete

### Overview

Enhancing the Coding module with template download, commit activity visualization, and GitHub Actions integration.

---

### Task Log

#### January 16, 2026

**[COMPLETED] Template Scaffold Download**

Updated `api/internal/handlers/coding.go`:
- Added `POST /api/v1/coding/templates/{id}/download` endpoint
- Accepts variable values in request body
- Replaces `{{variable}}` placeholders in file content and filenames
- Returns ZIP file with all template files
- Added `DownloadTemplateRequest` struct

Updated frontend `api/coding.ts`:
- Added `downloadTemplate()` method with blob response handling

Updated frontend `CodingTemplates.tsx`:
- Added Download button to each template card
- Created download dialog with variable inputs
- Variable fields pre-populated with default values
- Downloads ZIP file with sanitized filename

**[COMPLETED] GitHub Commit Activity Visualization**

Updated `api/internal/github/client.go`:
- Added `CommitActivity` struct for weekly commit data
- Added `GetCommitActivity()` method - fetches 52 weeks of activity
- Added `ContributorStats` struct for contributor breakdown
- Added `GetContributorStats()` method
- Handles 202 response (stats computing) gracefully

Updated `api/internal/handlers/coding.go`:
- Added `GET /api/v1/coding/github/repos/{owner}/{repo}/commits` endpoint
- Returns commit activity data for GitHub contribution graph

Updated frontend `api/coding.ts`:
- Added `CommitActivity` interface
- Added `getRepoCommitActivity()` method

Created `frontend/src/pages/CodingRepoDetail.tsx`:
- New repository detail page with:
  - Repo metadata (stars, forks, issues, branch)
  - Repository info card (language, dates, license)
  - Topics display
  - Commit activity graph (GitHub-style contribution heatmap)
  - Last 26 weeks of daily commits
  - Total commits and 4-week summary stats

Updated `frontend/src/pages/CodingRepos.tsx`:
- Added "View Details" link to each repo card
- Links to new repo detail page

Updated `frontend/src/App.tsx`:
- Added route for `/code/repos/:owner/:repo`
- Imported `CodingRepoDetail` component

**[COMPLETED] GitHub Actions Status Display**

Updated `api/internal/github/client.go`:
- Added `Workflow` struct for workflow definitions
- Added `WorkflowsResponse` struct
- Added `ListWorkflows()` method
- Added `WorkflowRun` struct with status/conclusion fields
- Added `WorkflowRunsResponse` struct
- Added `ListWorkflowRuns()` method with limit parameter
- Added `GetWorkflowRun()` method for single run details

Updated `api/internal/handlers/coding.go`:
- Added `GET /api/v1/coding/github/repos/{owner}/{repo}/workflows` endpoint
- Added `GET /api/v1/coding/github/repos/{owner}/{repo}/runs` endpoint
- Supports `?limit=N` query parameter for runs

Updated frontend `api/coding.ts`:
- Added `Workflow` and `WorkflowRun` interfaces
- Added `getRepoWorkflows()` method
- Added `getRepoWorkflowRuns()` method

Updated `frontend/src/pages/CodingRepoDetail.tsx`:
- GitHub Actions section showing:
  - List of configured workflows with active/inactive badges
  - Recent workflow runs (last 5)
  - Status icons (success, failure, in_progress, queued, cancelled)
  - Status badges with color coding
  - Run details (branch, event, run number)
  - Relative timestamps
  - Links to GitHub run pages

---

### Summary

**Phase 6: Coding Module Enhancements - COMPLETE**

Completed:
- [x] Template download as ZIP with variable substitution
- [x] Download dialog with variable inputs
- [x] GitHub commit activity API integration
- [x] Contribution graph visualization (heatmap)
- [x] Repository detail page
- [x] GitHub Actions workflows list
- [x] Workflow runs with status/conclusion display

Remaining (lower priority):
- [ ] Create repos from templates (GitHub API)
- [ ] Custom template creation wizard
- [ ] Workflow re-run trigger

---

## Phase 7: Settings & Security

**Started:** January 16, 2026
**Status:** Complete

### Overview

Enhancing the Settings module with data export, two-factor authentication, and account deletion.

---

### Task Log

#### January 16, 2026

**[COMPLETED] Full Data Export (JSON/CSV)**

Created `api/internal/services/data_export.go`:
- `DataExportService` for comprehensive user data export
- `ExportUserData()` method collects data from all modules:
  - User profile (excluding sensitive fields like password_hash, totp_secret)
  - Portfolios, holdings, transactions
  - Recipes, meal plans
  - Books, reading lists
  - Plants, plant care logs
  - Bills, subscriptions, insurance, maintenance
  - Reminders, code snippets, templates
- `ExportAsZip()` creates downloadable ZIP containing:
  - `full_export.json` - Complete JSON export
  - Individual CSV files for major data types
  - `metadata.json` - Export metadata

Updated `api/internal/handlers/security.go`:
- Added `GET /api/v1/security/export` - Returns JSON export
- Added `GET /api/v1/security/export/download` - Returns ZIP file

Updated frontend `api/security.ts`:
- Added `exportData()` and `downloadExport()` methods

Updated frontend `Settings.tsx`:
- Replaced placeholder export with real download functionality
- Downloads ZIP file with timestamped filename

**[COMPLETED] Two-Factor Authentication (TOTP)**

Created `api/internal/services/totp.go`:
- `TOTPService` for TOTP-based 2FA
- `GenerateSecret()` - Creates secure random 20-byte secret (base32 encoded)
- `GenerateOTPAuthURL()` - Creates otpauth:// URL for authenticator apps
- `ValidateCode()` - HMAC-SHA1 based TOTP validation with time window
- `Enable2FA()` - Stores secret and enables 2FA after code verification
- `Disable2FA()` - Disables 2FA after code verification
- `Verify2FA()` - Verifies code during login
- `Is2FAEnabled()` - Checks 2FA status
- `GenerateBackupCodes()` - Generates 10 recovery codes

Created `api/migrations/010_security.sql`:
- Added `totp_secret` column (VARCHAR(64))
- Added `totp_enabled` column (BOOLEAN)
- Added `totp_backup_codes` column (TEXT)
- Added `deleted_at` column (TIMESTAMPTZ)
- Added `deletion_requested_at` column (TIMESTAMPTZ)

Updated `api/internal/handlers/security.go`:
- `GET /api/v1/security/2fa/status` - Check if 2FA enabled
- `POST /api/v1/security/2fa/setup` - Get secret and QR code URL
- `POST /api/v1/security/2fa/enable` - Enable with code verification
- `POST /api/v1/security/2fa/disable` - Disable with code verification
- `POST /api/v1/security/2fa/verify` - Verify a TOTP code
- `POST /api/v1/security/2fa/backup-codes` - Generate new backup codes

Updated frontend `api/security.ts`:
- Full 2FA API methods with TypeScript interfaces

Updated frontend `Settings.tsx`:
- 2FA setup flow:
  - QR code display (via qrserver.com API)
  - Manual secret entry option
  - 6-digit verification code input
  - Backup codes display and copy functionality
- 2FA management:
  - Status indicator (enabled/disabled)
  - Generate new backup codes
  - Disable 2FA with verification

**[COMPLETED] Account Deletion with Data Purge**

Updated `api/internal/repository/user.go`:
- Added `RequestDeletion()` - Sets deletion_requested_at timestamp
- Added `CancelDeletionRequest()` - Clears deletion request

Updated `api/internal/services/auth.go`:
- Added `RequestAccountDeletion()` method
- Added `DeleteAccount()` method

Updated `api/internal/handlers/security.go`:
- `POST /api/v1/security/delete-account` - Request deletion with password
- `POST /api/v1/security/delete-account/confirm` - Confirm with typed phrase

Updated frontend `api/security.ts`:
- Added `requestAccountDeletion()` and `confirmAccountDeletion()` methods

Updated frontend `Settings.tsx`:
- Two-step deletion process:
  - Step 1: Enter password to initiate
  - Step 2: Type "DELETE MY ACCOUNT" to confirm
- Warning messages about permanent data loss
- Immediate account deletion and logout on confirm

---

### Summary

**Phase 7: Settings & Security - COMPLETE**

Completed:
- [x] Full data export as ZIP (JSON + CSV files)
- [x] Two-factor authentication with TOTP
- [x] QR code display for authenticator apps
- [x] Backup codes generation and management
- [x] Account deletion with password and confirmation
- [x] Updated Settings UI with all security features

Remaining (from EXPANSION_PLAN.md):
- [ ] Session management (view/revoke active sessions)
- [ ] Login activity history
- [ ] 2FA enforcement during login flow

---

## Phase 8: Hub & Dashboard Improvements

**Started:** January 16, 2026
**Status:** Complete

### Overview

Improving the Hub dashboard with real data integration and customizable widget layout.

---

### Task Log

#### January 16, 2026

**[COMPLETED] Fix Hardcoded Placeholders**

Updated `frontend/src/pages/Hub.tsx`:
- Removed hardcoded "Coming Soon" placeholders from all module cards
- Added `getDomainData()` helper function to fetch real data from API
- Added `buildStats()` helper to build stats arrays with non-empty values
- All modules now display real data:
  - Finance: Net Worth value
  - Household: Monthly spending + status (bills overdue, due soon)
  - Cooking: Recipe count + favourites
  - Reading: Book count + currently reading
  - Coding: Snippet count + repos synced
  - Plants: Plant count + care status (need water)

**[COMPLETED] Customizable Widget Layout with Drag & Drop**

Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`:
- Modern, accessible drag and drop library for React
- Supports keyboard navigation and screen readers

Created sortable module system:
- Added `SortableModuleCard` wrapper component
- Uses `useSortable` hook for drag functionality
- Grip handle appears in edit mode for dragging
- Visual feedback during drag (opacity, rotation, scale)

Added edit mode toggle:
- "Customize" button in module grid header
- Toggles edit mode with spinning gear animation
- Shows instruction banner when in edit mode
- "Done" button to exit edit mode

State management:
- `moduleOrder` state tracks user's preferred order
- Persisted to `localStorage` under 'moduleOrder' key
- Loads on mount, saves on every drag end
- Modules sort by user-defined order, respecting enabled filter

DnD implementation:
- `DndContext` wraps the module grid
- `SortableContext` provides sortable item IDs
- `DragOverlay` shows dragged item with visual effects
- `closestCenter` collision detection for smooth reordering
- Pointer and keyboard sensors for accessibility

---

### Summary

**Phase 8: Hub & Dashboard Improvements - COMPLETE**

Completed:
- [x] Remove all hardcoded "Coming Soon" placeholders
- [x] Display real data from API for all modules
- [x] Add drag and drop module reordering
- [x] Persist module order to localStorage
- [x] Add edit mode with visual feedback
- [x] Accessible drag with keyboard support

Remaining (lower priority):
- [ ] Widget size options (small/medium/large)
- [ ] Widget visibility quick toggles
- [ ] Module-specific widget settings

