

## Overview

I want to transform my existing "wellf" portfolio management application into "liyf" - a comprehensive life management platform that serves as a personal/family "second brain". This prompt will guide you through understanding the current platform, rebranding it, and planning the expansion into multiple life management domains.

## Phase 0: Understanding the Current Platform

Before making any changes, thoroughly analyze the existing codebase:

### 0.1 Codebase Analysis

Please examine and summarize:

1. **Project Structure**
   - List all directories and their purposes
   - Identify the tech stack and dependencies
   - Map the database schema (all tables and relationships)

2. **Backend Architecture** (`api/`)
   - Review `cmd/server/main.go` - entry point and route registration
   - Analyze `internal/models/` - all data models
   - Review `internal/repository/` - database access patterns
   - Examine `internal/handlers/` - API endpoint handlers
   - Check `internal/services/` - business logic
   - Note any external integrations (Yahoo Finance, etc.)

3. **Frontend Architecture** (`frontend/`)
   - Review `src/types/` - TypeScript type definitions
   - Analyze `src/api/` - API client functions
   - Examine `src/pages/` - all page components
   - Review `src/components/` - reusable components
   - Check `src/store/` - Zustand state management
   - Note the routing structure in `App.tsx`

4. **Database Schema**
   - Review `api/migrations/` for complete schema
   - Document all tables, relationships, and indexes
   - Note any JSONB metadata patterns used

5. **Configuration & Infrastructure**
   - Review `docker-compose.yml`
   - Check `.env.example` for all config options
   - Note any external services (Redis, etc.)

After analysis, provide me with:
- A summary of current features
- The architectural patterns being used
- Any technical debt or areas for improvement
- Dependencies that will need updates for new features

## Phase 1: Rebranding to Liyf

### 1.1 Create Feature Branch

```bash
git checkout -b feature/liyf-rebrand
```

### 1.2 Rename Repository (Manual Step)

Note: I will need to manually rename the GitHub repository from `wellf` to `liyf`. Document any places in the code that reference the repo URL.

### 1.3 Code Rebranding

Update all references from "wellf" to "liyf":

1. **Package Names**
   - `go.mod` - change module path
   - All Go import statements
   - Update `package.json` name

2. **Application Names**
   - Page titles
   - Browser tab titles
   - Footer/header branding
   - Docker container names
   - Docker Compose service names

3. **Documentation**
   - `README.md` - full rebrand
   - Any inline documentation
   - API documentation if present

4. **Configuration**
   - Environment variable prefixes (if applicable)
   - Database name in configs
   - Redis key prefixes

### 1.4 New Logo/Icon

Create a new brand identity:
- Design concept: "liyf" represents life management - consider a minimalist icon that suggests organization, growth, or life cycles
- Create SVG logo for header
- Create favicon (multiple sizes)
- Create PWA icons if applicable
- Color palette suggestion: Keep existing or propose new theme

### 1.5 Update UI Theme

- Update primary colors if desired
- Ensure consistent branding across all pages
- Update any splash screens or loading states

## Phase 2: LiyfHub Dashboard

Before building individual modules, create a central hub dashboard.

### 2.1 Dashboard Concept

The LiyfHub should be the main landing page showing:
- Quick access cards/tiles for each life domain
- Summary widgets showing key info from each module
- Recent activity across all modules
- Quick actions (add recipe, log book, water plant, etc.)

### 2.2 Life Domains

The platform will manage these domains (existing + new):

| Domain | Icon | Description | Status |
|--------|------|-------------|--------|
| **Finance** | 💰 | Portfolios, investments, net worth | Existing |
| **Family** | 👨‍👩‍👧‍👦 | People, relationships, documents | Existing |
| **Property** | 🏠 | Homes, mortgages, maintenance | Existing |
| **Vehicles** | 🚗 | Cars, MOT, service history | Existing |
| **Insurance** | 🛡️ | Policies, renewals, claims | Existing |
| **Cooking** | 🍳 | Recipes, meal planning | New |
| **Books** | 📚 | Reading lists, reviews | New |
| **Plants** | 🌱 | Plant care, watering schedules | New |
| **Code** | 💻 | GitHub projects, scripts | New |
| **Calendar** | 📅 | Unified reminders, events | New |

### 2.3 Database Schema for Hub

```sql
-- migrations/XXX_liyf_hub.sql

-- Quick actions / shortcuts
CREATE TABLE IF NOT EXISTS quick_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB DEFAULT '{}',
    icon VARCHAR(50),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log for recent activity feed
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    domain VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- created, updated, deleted, viewed
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_domain ON activity_log(domain);
```

### 2.4 Hub API Endpoints

```go
// GET /api/v1/hub/summary - Get summary data for all domains
// GET /api/v1/hub/activity - Get recent activity feed
// GET /api/v1/hub/quick-actions - Get user's quick actions
// POST /api/v1/hub/quick-actions - Create quick action
// DELETE /api/v1/hub/quick-actions/{id} - Delete quick action
```

### 2.5 Hub Frontend Components

**`frontend/src/pages/Hub.tsx`** - Main hub dashboard:
```typescript
// Grid of domain cards with:
// - Icon and title
// - Key metric/summary (e.g., "5 books reading", "3 plants need water")
// - Quick action button
// - Link to full module

// Recent activity feed
// Upcoming reminders/events
// Search across all domains
```

**`frontend/src/components/hub/DomainCard.tsx`** - Reusable domain card
**`frontend/src/components/hub/ActivityFeed.tsx`** - Activity stream
**`frontend/src/components/hub/QuickActions.tsx`** - Quick action buttons
**`frontend/src/components/hub/UpcomingReminders.tsx`** - Calendar integration

### 2.6 Navigation Update

Update the sidebar/navigation to:
- Have "Hub" as the home/default page
- Group domains into categories:
  - **Life** (Family, Calendar)
  - **Finance** (Portfolios, Insurance)
  - **Property** (Homes, Vehicles)
  - **Lifestyle** (Cooking, Books, Plants)
  - **Tech** (Code/GitHub)
- Collapsible sections for cleaner navigation

## Phase 3: New Module Specifications

### 3.1 Recipe Manager (Cooking Module)

#### Features
- Add recipes by URL (scrape from any recipe site)
- Manual recipe entry
- Search recipes on BBC Good Food and Waitrose
- Ingredient-based recipe search
- Meal planning calendar
- Shopping list generation
- Recipe scaling
- Favourites and collections

#### Technical Requirements

**Backend:**
- Headless browser (Playwright or Puppeteer via Go) for scraping
- Integration with `recipe-scrapers` Python library (via subprocess or microservice)
- Recipe search API proxies for Good Food/Waitrose

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_url VARCHAR(500),
    source_name VARCHAR(100),
    image_url VARCHAR(500),
    
    -- Timing
    prep_time_minutes INT,
    cook_time_minutes INT,
    total_time_minutes INT,
    
    -- Servings
    servings INT,
    servings_unit VARCHAR(50),
    
    -- Content (stored as JSONB for flexibility)
    ingredients JSONB NOT NULL DEFAULT '[]', -- [{amount, unit, name, notes}]
    instructions JSONB NOT NULL DEFAULT '[]', -- [{step, text}]
    
    -- Categorisation
    cuisine VARCHAR(50),
    course VARCHAR(50), -- starter, main, dessert, etc.
    diet_tags TEXT[], -- vegetarian, vegan, gluten-free, etc.
    
    -- User data
    rating INT CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    is_favourite BOOLEAN DEFAULT false,
    times_cooked INT DEFAULT 0,
    last_cooked_at DATE,
    
    -- Nutrition (if scraped)
    nutrition JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL, -- breakfast, lunch, dinner, snack
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    custom_meal VARCHAR(255), -- if not using a saved recipe
    servings INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, plan_date, meal_type)
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    amount VARCHAR(50),
    unit VARCHAR(50),
    category VARCHAR(50), -- produce, dairy, meat, etc.
    is_checked BOOLEAN DEFAULT false,
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Recipe Scraper Service:**
Create a small Python microservice or use subprocess:
```python
# services/recipe-scraper/main.py
from recipe_scrapers import scrape_me
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/scrape', methods=['POST'])
def scrape_recipe():
    url = request.json.get('url')
    scraper = scrape_me(url)
    return jsonify({
        'title': scraper.title(),
        'image': scraper.image(),
        'ingredients': scraper.ingredients(),
        'instructions': scraper.instructions_list(),
        'prep_time': scraper.prep_time(),
        'cook_time': scraper.cook_time(),
        'total_time': scraper.total_time(),
        'yields': scraper.yields(),
        'nutrients': scraper.nutrients(),
    })
```

**Frontend Pages:**
- `/cooking` - Recipe dashboard
- `/cooking/recipes` - All recipes
- `/cooking/recipes/:id` - Recipe detail
- `/cooking/recipes/new` - Add recipe (URL or manual)
- `/cooking/meal-plan` - Weekly meal planner
- `/cooking/shopping-list` - Shopping list
- `/cooking/search` - Search external recipe sites

### 3.2 Book Tracker (Books Module)

#### Features
- Search books via Google Books API (free, no key required for basic)
- Create reading lists (To Read, Reading, Read)
- Track reading progress
- Write reviews and ratings
- Reading statistics and goals
- Goodreads import (CSV)

#### Technical Requirements

**Google Books API:**
```
GET https://www.googleapis.com/books/v1/volumes?q={search_term}
```
No API key required for basic searches.

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Book identifiers
    google_books_id VARCHAR(50),
    isbn_10 VARCHAR(10),
    isbn_13 VARCHAR(13),
    
    -- Book info
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    authors TEXT[], -- Array of author names
    publisher VARCHAR(255),
    published_date VARCHAR(20),
    description TEXT,
    page_count INT,
    categories TEXT[],
    language VARCHAR(10),
    
    -- Images
    thumbnail_url VARCHAR(500),
    cover_url VARCHAR(500),
    
    -- User's copy info
    format VARCHAR(20), -- physical, ebook, audiobook
    owned BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(household_id, google_books_id)
);

CREATE TABLE IF NOT EXISTS reading_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false, -- for To Read, Reading, Read
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reading_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reading_list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    
    -- Reading progress
    status VARCHAR(20) NOT NULL DEFAULT 'to_read', -- to_read, reading, read, abandoned
    current_page INT,
    progress_percent INT,
    started_at DATE,
    finished_at DATE,
    
    -- Review
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    review_date DATE,
    
    -- Metadata
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(reading_list_id, book_id)
);

CREATE TABLE IF NOT EXISTS reading_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    target_books INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);
```

**Frontend Pages:**
- `/books` - Books dashboard with reading stats
- `/books/search` - Search and add books
- `/books/library` - All books in library
- `/books/lists` - Reading lists
- `/books/lists/:id` - Reading list detail
- `/books/:id` - Book detail with progress tracking

### 3.3 Plant Tracker (Plants Module)

#### Features
- Add plants with photos
- Set watering schedules
- Care reminders (water, fertilize, repot, prune)
- Plant health log
- Room/location organization
- iCloud calendar integration for reminders

#### Database Schema
```sql
CREATE TABLE IF NOT EXISTS plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Plant info
    name VARCHAR(100) NOT NULL, -- User's name for the plant
    species VARCHAR(255),
    variety VARCHAR(255),
    nickname VARCHAR(100),
    
    -- Location
    room VARCHAR(100),
    location_detail VARCHAR(255), -- e.g., "window sill", "corner"
    
    -- Photos
    photo_url VARCHAR(500),
    
    -- Acquisition
    acquired_date DATE,
    acquired_from VARCHAR(255),
    purchase_price DECIMAL(10, 2),
    
    -- Care requirements
    watering_frequency_days INT, -- water every X days
    light_requirement VARCHAR(50), -- low, medium, bright, direct
    humidity_preference VARCHAR(50), -- low, medium, high
    temperature_min INT,
    temperature_max INT,
    soil_type VARCHAR(100),
    
    -- Current status
    health_status VARCHAR(20) DEFAULT 'healthy', -- healthy, struggling, sick, dormant
    last_watered_at DATE,
    last_fertilized_at DATE,
    last_repotted_at DATE,
    next_water_date DATE,
    
    -- Notes
    care_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plant_care_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    care_type VARCHAR(50) NOT NULL, -- watered, fertilized, pruned, repotted, treated, inspected
    care_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    photo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plant_health_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    health_status VARCHAR(20) NOT NULL,
    issues TEXT[], -- yellowing, wilting, pests, etc.
    treatments TEXT[], -- actions taken
    notes TEXT,
    photo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Frontend Pages:**
- `/plants` - Plant dashboard with care reminders
- `/plants/all` - All plants grid
- `/plants/:id` - Plant detail with care history
- `/plants/:id/care` - Log care activity
- `/plants/rooms` - View by room
- `/plants/calendar` - Care schedule calendar

### 3.4 Code/GitHub Manager (Code Module)

#### Features
- List and manage GitHub repositories
- Store useful code snippets and scripts
- Quick deploy new project from templates
- Repository templates for common setups
- Link to documentation

#### GitHub API Integration
Use GitHub's REST API with a Personal Access Token:
```
Authorization: Bearer {github_token}
```

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS github_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_username VARCHAR(100),
    github_token TEXT, -- Encrypted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS code_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(50),
    code TEXT NOT NULL,
    tags TEXT[],
    is_favourite BOOLEAN DEFAULT false,
    source_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_repo VARCHAR(255), -- GitHub template repo
    setup_commands TEXT[], -- Commands to run after cloning
    default_branch VARCHAR(50) DEFAULT 'main',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Frontend Pages:**
- `/code` - Code dashboard
- `/code/repos` - GitHub repositories
- `/code/snippets` - Code snippets
- `/code/snippets/new` - Add snippet
- `/code/templates` - Project templates
- `/code/deploy` - Deploy new project

### 3.5 Calendar Integration (iCloud/CalDAV)

#### Features
- Unified reminder system
- Create calendar events for:
  - Plant watering
  - Insurance renewals
  - MOT/Tax reminders
  - Book due dates
  - Meal planning
  - Investment reviews
- View upcoming events from all domains
- iCloud CalDAV integration

#### CalDAV Integration
iCloud uses CalDAV protocol:
- Server: `caldav.icloud.com`
- Requires app-specific password
- Use a Go CalDAV library like `emersion/go-webdav`

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS calendar_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- icloud, google, caldav
    caldav_url VARCHAR(500),
    username VARCHAR(255),
    password TEXT, -- Encrypted (app-specific password)
    calendar_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Reminders generated by the system
CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- What this reminder is for
    domain VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    
    -- Reminder details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reminder_date DATE NOT NULL,
    reminder_time TIME,
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule VARCHAR(100), -- RRULE format
    
    -- Status
    calendar_event_id VARCHAR(255), -- ID from external calendar
    is_synced BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_date ON scheduled_reminders(reminder_date);
CREATE INDEX idx_reminders_user ON scheduled_reminders(user_id);
```

**Background Job:**
Create a service that:
1. Generates reminders based on entity data (plant water dates, insurance renewals, etc.)
2. Syncs reminders to the configured calendar via CalDAV
3. Marks completed when acknowledged

## Phase 4: Implementation Order

### Recommended Sequence

1. **Phase 0**: Codebase analysis (1 session)
2. **Phase 1**: Rebranding to Liyf (1-2 sessions)
3. **Phase 2**: LiyfHub dashboard (2-3 sessions)
4. **Phase 3a**: Recipe Manager (3-4 sessions)
5. **Phase 3b**: Book Tracker (2-3 sessions)
6. **Phase 3c**: Plant Tracker (2 sessions)
7. **Phase 3d**: Code/GitHub Manager (2 sessions)
8. **Phase 3e**: Calendar Integration (2-3 sessions)

### For Each Module

Follow this implementation pattern:

1. **Database Migration** - Create schema
2. **Backend Models** - Define Go structs
3. **Backend Repository** - CRUD operations
4. **Backend Handlers** - API endpoints
5. **Backend Routes** - Register in main.go
6. **Frontend Types** - TypeScript interfaces
7. **Frontend API Client** - API functions
8. **Frontend Components** - Reusable UI
9. **Frontend Pages** - Page components
10. **Frontend Routes** - Add to router
11. **Navigation** - Add to sidebar/hub
12. **Testing** - Manual and automated

## Getting Started

Please begin by:

1. **Analyzing the current codebase** (Phase 0)
   - Provide a comprehensive summary
   - Identify any issues or technical debt
   - Confirm the architectural patterns

2. **Create the feature branch** for rebranding

3. **Start the rebranding process** (Phase 1)
   - List all files that need changes
   - Make the changes systematically
   - Create new logo/branding assets

4. **After rebranding**, proceed to Phase 2 (LiyfHub)

## Questions to Answer First

Before starting implementation, please clarify:

1. What is the current state of the document management code that will be replaced by Paperless integration?
2. Are there any existing calendar or reminder features?
3. What authentication/session management approach is currently used?
4. Is there a background job runner already set up (for scheduled tasks)?
5. What's the deployment environment (Docker, Kubernetes, etc.)?

## Notes

- Maintain existing code patterns and conventions
- Use shadcn/ui components consistently
- Follow the established repository pattern
- Keep the API RESTful and consistent
- Add proper error handling throughout
- Consider mobile responsiveness
- Add loading states and error states
- Use optimistic updates where appropriate

Let's begin with Phase 0 - please analyze the codebase and provide your findings.