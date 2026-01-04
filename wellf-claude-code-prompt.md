# Wellf - Personal Wealth Tracking Application
## Claude Code Implementation Prompt

---

## Project Overview

Build **Wellf**, a self-hosted personal wealth tracking application that allows users to monitor investments, cash holdings, and fixed assets in a unified dashboard. The application should integrate with Yahoo Finance for real-time pricing and provide comprehensive portfolio analytics.

**Repository**: https://github.com/mark-regan/wellf.git
**Reference Implementation**: https://github.com/venil7/assets (study for architectural patterns)

---

## Technical Architecture

### Stack Requirements

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Backend API** | Go (Golang) | Performance, single binary deployment, excellent concurrency |
| **Database** | PostgreSQL | ACID compliance, JSON support, robust for financial data |
| **Cache** | Redis | API response caching, rate limiting, session management |
| **Frontend** | React + TypeScript + Vite | Modern tooling, type safety, fast builds |
| **UI Framework** | Tailwind CSS + shadcn/ui | Consistent design system, accessibility |
| **Charts** | Recharts or Chart.js | Portfolio visualisation |
| **Containerisation** | Docker + Docker Compose | Self-hosted deployment |
| **API Documentation** | OpenAPI 3.0 (Swagger) | API-first design |

### Architecture Principles

1. **API-First Design**: Define OpenAPI specification before implementation
2. **Clean Architecture**: Separate concerns (handlers → services → repositories)
3. **Twelve-Factor App**: Environment-based configuration, stateless processes
4. **Security by Default**: JWT authentication, input validation, rate limiting
5. **Observable**: Structured logging, health checks, metrics endpoints

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│   Users     │───┬───│  Portfolios  │───┬───│     Assets      │
└─────────────┘   │   └──────────────┘   │   └─────────────────┘
                  │                       │           │
                  │   ┌──────────────┐   │   ┌───────┴───────┐
                  └───│   Settings   │   │   │               │
                      └──────────────┘   │   ▼               ▼
                                         │ ┌─────────┐ ┌───────────┐
                                         │ │Holdings │ │Transactions│
                                         │ └─────────┘ └───────────┘
                                         │
                      ┌──────────────────┴──────────────────┐
                      │                                     │
                      ▼                                     ▼
              ┌───────────────┐                    ┌────────────────┐
              │ Fixed Assets  │                    │   Cash/Bank    │
              └───────────────┘                    │   Accounts     │
                                                   └────────────────┘
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    base_currency CHAR(3) DEFAULT 'GBP',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Portfolios (ISA, SIPP, General Investment, Crypto, etc.)
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- ISA, SIPP, GIA, CRYPTO, SAVINGS, PROPERTY
    currency CHAR(3) DEFAULT 'GBP',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Assets (tradeable securities)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL UNIQUE, -- Yahoo Finance symbol
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- STOCK, ETF, FUND, CRYPTO, BOND
    exchange VARCHAR(50),
    currency CHAR(3) NOT NULL,
    data_source VARCHAR(50) DEFAULT 'YAHOO',
    last_price DECIMAL(20, 8),
    last_price_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holdings (current positions)
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id),
    quantity DECIMAL(20, 8) NOT NULL,
    average_cost DECIMAL(20, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, asset_id)
);

-- Transactions (buy, sell, dividend, etc.)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id), -- NULL for cash transactions
    transaction_type VARCHAR(20) NOT NULL, -- BUY, SELL, DIVIDEND, INTEREST, FEE, TRANSFER_IN, TRANSFER_OUT
    quantity DECIMAL(20, 8),
    price DECIMAL(20, 8),
    total_amount DECIMAL(20, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash/Bank accounts
CREATE TABLE cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- CURRENT, SAVINGS, MONEY_MARKET
    institution VARCHAR(100),
    balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) DEFAULT 'GBP',
    interest_rate DECIMAL(5, 4), -- e.g., 0.0450 for 4.5%
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed assets (property, vehicles, valuables)
CREATE TABLE fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- PROPERTY, VEHICLE, COLLECTIBLE, OTHER
    description TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(20, 2),
    current_value DECIMAL(20, 2) NOT NULL,
    currency CHAR(3) DEFAULT 'GBP',
    valuation_date DATE,
    valuation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history (for sparklines and charts)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price_date DATE NOT NULL,
    open_price DECIMAL(20, 8),
    high_price DECIMAL(20, 8),
    low_price DECIMAL(20, 8),
    close_price DECIMAL(20, 8) NOT NULL,
    volume BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, price_date)
);

-- Exchange rates cache
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency CHAR(3) NOT NULL,
    to_currency CHAR(3) NOT NULL,
    rate DECIMAL(20, 10) NOT NULL,
    rate_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, rate_date)
);

-- Create indexes
CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX idx_transactions_portfolio ON transactions(portfolio_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_price_history_asset_date ON price_history(asset_id, price_date DESC);
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
```

---

## API Specification

### Authentication Endpoints

```yaml
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login, returns JWT
POST   /api/v1/auth/refresh      # Refresh JWT token
POST   /api/v1/auth/logout       # Invalidate token
GET    /api/v1/auth/me           # Get current user profile
PUT    /api/v1/auth/me           # Update user profile
PUT    /api/v1/auth/password     # Change password
```

### Portfolio Endpoints

```yaml
GET    /api/v1/portfolios                    # List all portfolios
POST   /api/v1/portfolios                    # Create portfolio
GET    /api/v1/portfolios/:id                # Get portfolio details
PUT    /api/v1/portfolios/:id                # Update portfolio
DELETE /api/v1/portfolios/:id                # Delete portfolio
GET    /api/v1/portfolios/:id/summary        # Portfolio value summary
GET    /api/v1/portfolios/:id/performance    # Performance metrics
GET    /api/v1/portfolios/:id/allocation     # Asset allocation breakdown
```

### Holdings Endpoints

```yaml
GET    /api/v1/portfolios/:id/holdings       # List holdings in portfolio
POST   /api/v1/portfolios/:id/holdings       # Add holding
PUT    /api/v1/holdings/:id                  # Update holding
DELETE /api/v1/holdings/:id                  # Remove holding
```

### Transaction Endpoints

```yaml
GET    /api/v1/portfolios/:id/transactions   # List transactions (paginated)
POST   /api/v1/portfolios/:id/transactions   # Record transaction
GET    /api/v1/transactions/:id              # Get transaction detail
PUT    /api/v1/transactions/:id              # Update transaction
DELETE /api/v1/transactions/:id              # Delete transaction
POST   /api/v1/portfolios/:id/transactions/import  # Import CSV
```

### Asset Endpoints

```yaml
GET    /api/v1/assets/search                 # Search assets (Yahoo Finance)
GET    /api/v1/assets/:symbol                # Get asset details + current price
GET    /api/v1/assets/:symbol/history        # Historical prices
POST   /api/v1/assets/refresh                # Force price refresh
```

### Cash Account Endpoints

```yaml
GET    /api/v1/portfolios/:id/cash-accounts  # List cash accounts
POST   /api/v1/portfolios/:id/cash-accounts  # Create cash account
PUT    /api/v1/cash-accounts/:id             # Update cash account
DELETE /api/v1/cash-accounts/:id             # Delete cash account
```

### Fixed Asset Endpoints

```yaml
GET    /api/v1/fixed-assets                  # List fixed assets
POST   /api/v1/fixed-assets                  # Create fixed asset
GET    /api/v1/fixed-assets/:id              # Get fixed asset
PUT    /api/v1/fixed-assets/:id              # Update fixed asset
DELETE /api/v1/fixed-assets/:id              # Delete fixed asset
```

### Dashboard/Analytics Endpoints

```yaml
GET    /api/v1/dashboard/summary             # Total net worth summary
GET    /api/v1/dashboard/net-worth-history   # Net worth over time
GET    /api/v1/dashboard/allocation          # Global asset allocation
GET    /api/v1/dashboard/performance         # Overall performance metrics
GET    /api/v1/dashboard/top-movers          # Best/worst performing assets
```

### System Endpoints

```yaml
GET    /api/v1/health                        # Health check
GET    /api/v1/health/ready                  # Readiness probe
GET    /api/v1/metrics                       # Prometheus metrics (optional)
GET    /api/v1/config/currencies             # Supported currencies
GET    /api/v1/config/asset-types            # Supported asset types
```

---

## User Stories & Acceptance Criteria

### Epic 1: User Authentication & Security

#### US-1.1: User Registration
**As a** new user  
**I want to** create an account  
**So that** I can start tracking my wealth securely

**Acceptance Criteria:**
- [ ] Email must be valid format and unique
- [ ] Password minimum 12 characters, requires uppercase, lowercase, number, special character
- [ ] Password is hashed using bcrypt with cost factor 12
- [ ] Email verification token sent (optional for self-hosted)
- [ ] User can select base currency during registration
- [ ] Rate limit: 5 registration attempts per IP per hour

**Test Scenarios:**
```gherkin
Scenario: Successful registration
  Given I am on the registration page
  When I enter valid email "test@example.com"
  And I enter valid password "SecureP@ss123!"
  And I select base currency "GBP"
  And I submit the form
  Then I should receive a success message
  And I should be redirected to the login page

Scenario: Registration with existing email
  Given a user exists with email "existing@example.com"
  When I try to register with email "existing@example.com"
  Then I should see error "Email already registered"

Scenario: Registration with weak password
  When I enter password "weak"
  Then I should see error "Password must be at least 12 characters"
```

#### US-1.2: User Login
**As a** registered user  
**I want to** log in securely  
**So that** I can access my portfolio data

**Acceptance Criteria:**
- [ ] JWT token returned on successful login
- [ ] Token expires after configurable period (default 24h)
- [ ] Refresh token mechanism for seamless re-authentication
- [ ] Failed login attempts tracked (max 5 before 15-minute lockout)
- [ ] Last login timestamp updated
- [ ] Secure HTTP-only cookie option for token storage

**Test Scenarios:**
```gherkin
Scenario: Successful login
  Given I am a registered user
  When I enter correct credentials
  Then I should receive a JWT token
  And I should be redirected to the dashboard

Scenario: Login with invalid credentials
  When I enter incorrect password
  Then I should see error "Invalid credentials"
  And my failed attempt should be logged

Scenario: Account lockout after failed attempts
  Given I have failed login 5 times
  When I try to login again
  Then I should see error "Account locked. Try again in 15 minutes"
```

---

### Epic 2: Portfolio Management

#### US-2.1: Create Portfolio
**As a** user  
**I want to** create multiple portfolios  
**So that** I can organise my investments by account type

**Acceptance Criteria:**
- [ ] Portfolio types: ISA, SIPP, GIA, LISA, CRYPTO, SAVINGS, PROPERTY
- [ ] Portfolio name must be unique per user
- [ ] Default currency inherited from user settings
- [ ] Optional description field
- [ ] Portfolio created with zero balance

**Test Scenarios:**
```gherkin
Scenario: Create ISA portfolio
  Given I am logged in
  When I create a portfolio with name "Vanguard ISA" and type "ISA"
  Then the portfolio should be created successfully
  And it should appear in my portfolio list

Scenario: Prevent duplicate portfolio names
  Given I have a portfolio named "My ISA"
  When I try to create another portfolio named "My ISA"
  Then I should see error "Portfolio name already exists"
```

#### US-2.2: View Portfolio Summary
**As a** user  
**I want to** see a summary of each portfolio  
**So that** I can understand my holdings at a glance

**Acceptance Criteria:**
- [ ] Display total market value
- [ ] Show total cost basis
- [ ] Calculate unrealised gain/loss (amount and percentage)
- [ ] Display asset allocation pie chart
- [ ] Show individual holding values
- [ ] Values converted to base currency
- [ ] Last updated timestamp shown

---

### Epic 3: Investment Tracking

#### US-3.1: Add Investment Holding
**As a** user  
**I want to** add investments to my portfolio  
**So that** I can track their performance

**Acceptance Criteria:**
- [ ] Search assets by symbol or name (via Yahoo Finance)
- [ ] Auto-populate asset details from Yahoo Finance
- [ ] Enter quantity and average cost
- [ ] System fetches current price automatically
- [ ] Holdings aggregated if same asset added multiple times

**Test Scenarios:**
```gherkin
Scenario: Add FTSE 100 ETF
  Given I am viewing my ISA portfolio
  When I search for "VUKE.L"
  And I add 100 units at £29.50 average cost
  Then the holding should appear in my portfolio
  And current value should be calculated from live price

Scenario: Add to existing holding
  Given I hold 100 units of VUKE.L at £29.50
  When I add 50 more units at £30.00
  Then my total holding should be 150 units
  And average cost should be recalculated to £29.67
```

#### US-3.2: Record Transaction
**As a** user  
**I want to** record buy/sell transactions  
**So that** I have an accurate history of my trades

**Acceptance Criteria:**
- [ ] Transaction types: BUY, SELL, DIVIDEND, INTEREST, FEE, TRANSFER_IN, TRANSFER_OUT
- [ ] BUY increases holding quantity
- [ ] SELL decreases holding quantity (cannot sell more than held)
- [ ] DIVIDEND records income without affecting quantity
- [ ] Transaction date cannot be in the future
- [ ] Running balance recalculated after each transaction

**Test Scenarios:**
```gherkin
Scenario: Record buy transaction
  When I record a BUY of 50 VUKE.L at £30.00 on 2024-01-15
  Then my holding should increase by 50 units
  And a transaction record should be created

Scenario: Prevent overselling
  Given I hold 100 units of VUKE.L
  When I try to sell 150 units
  Then I should see error "Insufficient holdings"

Scenario: Record dividend
  When I record a DIVIDEND of £125.50 for VUKE.L on 2024-03-15
  Then my holding quantity should remain unchanged
  And the dividend should be recorded in transactions
```

#### US-3.3: Import Transactions from CSV
**As a** user  
**I want to** import transactions from my broker's CSV export  
**So that** I can quickly populate my portfolio history

**Acceptance Criteria:**
- [ ] Support common CSV formats (Trading 212, Hargreaves Lansdown, AJ Bell, Interactive Investor)
- [ ] Map columns to required fields
- [ ] Validate data before import
- [ ] Show preview of transactions to import
- [ ] Skip duplicate transactions
- [ ] Report import results (success/failed/skipped)

---

### Epic 4: Cash & Fixed Asset Tracking

#### US-4.1: Track Cash/Savings Accounts
**As a** user  
**I want to** track my cash and savings accounts  
**So that** I have a complete view of my liquid assets

**Acceptance Criteria:**
- [ ] Account types: CURRENT, SAVINGS, MONEY_MARKET
- [ ] Record account name and institution
- [ ] Track balance and interest rate
- [ ] Support multiple currencies
- [ ] Manual balance updates with timestamp

**Test Scenarios:**
```gherkin
Scenario: Add savings account
  Given I am logged in
  When I add a savings account "Marcus Savings" at "Goldman Sachs"
  And I set balance to £25,000 with 4.5% interest
  Then the account should appear in my portfolio
  And it should be included in my net worth

Scenario: Update account balance
  Given I have a savings account with £25,000
  When I update the balance to £25,500
  Then the balance should be updated
  And the last_updated timestamp should be refreshed
```

#### US-4.2: Track Fixed Assets
**As a** user  
**I want to** track fixed assets like property  
**So that** I have a complete picture of my net worth

**Acceptance Criteria:**
- [ ] Categories: PROPERTY, VEHICLE, COLLECTIBLE, OTHER
- [ ] Record purchase price and date
- [ ] Record current estimated value
- [ ] Add valuation notes
- [ ] Track asset depreciation/appreciation

**Test Scenarios:**
```gherkin
Scenario: Add property
  When I add a fixed asset "Main Residence" category "PROPERTY"
  And I set purchase price £350,000 date "2020-06-15"
  And I set current value £425,000
  Then the asset should appear in my fixed assets
  And show appreciation of £75,000 (21.4%)
```

---

### Epic 5: Dashboard & Analytics

#### US-5.1: View Net Worth Dashboard
**As a** user  
**I want to** see my total net worth on a dashboard  
**So that** I can monitor my overall financial position

**Acceptance Criteria:**
- [ ] Total net worth displayed prominently
- [ ] Breakdown by asset category (Investments, Cash, Property, Other)
- [ ] Breakdown by portfolio
- [ ] Net worth change (day, week, month, year, all-time)
- [ ] Net worth history chart
- [ ] All values in user's base currency

#### US-5.2: View Asset Allocation
**As a** user  
**I want to** see my asset allocation  
**So that** I can ensure proper diversification

**Acceptance Criteria:**
- [ ] Allocation by asset type (Stocks, ETFs, Bonds, Crypto, Cash, Property)
- [ ] Allocation by geography/region
- [ ] Allocation by sector (where data available)
- [ ] Allocation by currency exposure
- [ ] Interactive pie/donut charts

#### US-5.3: View Performance Analytics
**As a** user  
**I want to** see performance metrics  
**So that** I can evaluate my investment decisions

**Acceptance Criteria:**
- [ ] Time-weighted return (TWR)
- [ ] Money-weighted return (MWR/IRR)
- [ ] Performance by portfolio
- [ ] Performance by asset
- [ ] Comparison to benchmarks (optional)
- [ ] Top gainers and losers

---

### Epic 6: Yahoo Finance Integration

#### US-6.1: Fetch Real-Time Prices
**As the** system  
**I want to** fetch current prices from Yahoo Finance  
**So that** portfolio values are up-to-date

**Acceptance Criteria:**
- [ ] Fetch prices for all held assets
- [ ] Cache prices with configurable TTL (default 10 minutes)
- [ ] Handle rate limiting gracefully
- [ ] Support stocks, ETFs, mutual funds, crypto
- [ ] Automatic currency conversion
- [ ] Background refresh job

**Test Scenarios:**
```gherkin
Scenario: Fetch price for UK stock
  When I request price for "VUKE.L"
  Then I should receive current price in GBP
  And the price should be cached for 10 minutes

Scenario: Handle rate limiting
  Given Yahoo Finance returns 429 Too Many Requests
  Then the system should use cached price
  And log a warning
  And retry after backoff period
```

#### US-6.2: Search for Assets
**As a** user  
**I want to** search for assets by name or symbol  
**So that** I can add them to my portfolio

**Acceptance Criteria:**
- [ ] Search by ticker symbol
- [ ] Search by company name
- [ ] Return top 10 matching results
- [ ] Display symbol, name, exchange, type
- [ ] Filter by asset type

---

## Non-Functional Requirements

### Security Requirements

1. **Authentication**
   - JWT tokens with RS256 signing
   - Token expiry: Access token 15 min, Refresh token 7 days
   - Secure HTTP-only cookies for token storage (frontend)
   - CSRF protection

2. **Data Protection**
   - All passwords hashed with bcrypt (cost 12)
   - Sensitive data encrypted at rest (AES-256)
   - TLS 1.3 required for all connections
   - SQL injection prevention via parameterised queries
   - XSS prevention via output encoding

3. **Rate Limiting**
   - API: 100 requests/minute per user
   - Login: 5 attempts/15 minutes per IP
   - Registration: 5 attempts/hour per IP
   - Yahoo Finance: Respect upstream limits

### Performance Requirements

1. **Response Times**
   - API endpoints: p95 < 200ms
   - Dashboard load: < 2 seconds
   - Price refresh: < 5 seconds for 100 assets

2. **Scalability**
   - Support 1000 concurrent users
   - Handle 100,000 transactions per portfolio
   - 5-year price history retention

### Reliability Requirements

1. **Availability**: 99.9% uptime for self-hosted
2. **Data Integrity**: ACID transactions for all financial data
3. **Backup**: Database backup support via pg_dump

---

## Docker Compose Configuration

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: wellf-api
    restart: unless-stopped
    ports:
      - "${API_PORT:-4020}:4020"
    environment:
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}?sslmode=disable
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-15m}
      - JWT_REFRESH_EXPIRES_IN=${JWT_REFRESH_EXPIRES_IN:-7d}
      - YAHOO_CACHE_TTL=${YAHOO_CACHE_TTL:-10m}
      - BASE_CURRENCY=${BASE_CURRENCY:-GBP}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4020/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - wellf-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL:-http://localhost:4020}
    container_name: wellf-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3000}:80"
    depends_on:
      - api
    networks:
      - wellf-network

  db:
    image: postgres:16-alpine
    container_name: wellf-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER:-wellf}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME:-wellf}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-wellf}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - wellf-network

  redis:
    image: redis:7-alpine
    container_name: wellf-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - wellf-network

  # Optional: Database management
  adminer:
    image: adminer
    container_name: wellf-adminer
    restart: unless-stopped
    ports:
      - "${ADMINER_PORT:-8080}:8080"
    depends_on:
      - db
    networks:
      - wellf-network
    profiles:
      - tools

volumes:
  postgres_data:
  redis_data:

networks:
  wellf-network:
    driver: bridge
```

### Environment File Template (.env.example)

```bash
# Database
DB_USER=wellf
DB_PASSWORD=CHANGE_ME_SECURE_PASSWORD
DB_NAME=wellf

# API Configuration
API_PORT=4020
JWT_SECRET=CHANGE_ME_GENERATE_SECURE_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BASE_CURRENCY=GBP
LOG_LEVEL=info

# Yahoo Finance
YAHOO_CACHE_TTL=10m

# Frontend
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:4020

# Optional tools
ADMINER_PORT=8080
```

---

## Project Structure

```
wellf/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline
│       └── release.yml         # Release pipeline
├── api/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go         # Application entry point
│   ├── internal/
│   │   ├── config/             # Configuration loading
│   │   ├── database/           # Database connection & migrations
│   │   ├── handlers/           # HTTP handlers
│   │   ├── middleware/         # Auth, logging, rate limiting
│   │   ├── models/             # Domain models
│   │   ├── repository/         # Data access layer
│   │   ├── services/           # Business logic
│   │   └── yahoo/              # Yahoo Finance client
│   ├── pkg/
│   │   ├── jwt/                # JWT utilities
│   │   ├── validator/          # Input validation
│   │   └── currency/           # Currency conversion
│   ├── migrations/             # SQL migrations
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── api/                # API client
│   │   ├── components/         # React components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── charts/         # Chart components
│   │   │   ├── forms/          # Form components
│   │   │   └── layout/         # Layout components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Page components
│   │   ├── store/              # State management (Zustand/Redux)
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utility functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── docs/
│   ├── api/
│   │   └── openapi.yaml        # OpenAPI specification
│   └── architecture.md
├── scripts/
│   ├── setup.sh                # Development setup
│   └── seed.sh                 # Test data seeding
├── docker-compose.yml
├── docker-compose.dev.yml      # Development overrides
├── .env.example
├── Makefile
├── README.md
└── LICENSE
```

---

## Testing Requirements

### Backend Testing

```go
// Test coverage requirements:
// - Unit tests: 80% coverage minimum
// - Integration tests: All API endpoints
// - E2E tests: Critical user journeys
```

#### Unit Test Categories

1. **Handler Tests**
   - Request validation
   - Response formatting
   - Error handling

2. **Service Tests**
   - Business logic validation
   - Calculation accuracy (gains, averages, performance)
   - Edge cases

3. **Repository Tests**
   - CRUD operations
   - Query correctness
   - Transaction handling

4. **Yahoo Finance Client Tests**
   - Response parsing
   - Error handling
   - Rate limit handling

#### Integration Test Scenarios

```go
// api/internal/handlers/portfolio_test.go
func TestPortfolioHandlers(t *testing.T) {
    // Setup test database and server
    
    t.Run("CreatePortfolio_Success", func(t *testing.T) {
        // Test creating a valid portfolio
    })
    
    t.Run("CreatePortfolio_DuplicateName", func(t *testing.T) {
        // Test duplicate name rejection
    })
    
    t.Run("GetPortfolioSummary_WithHoldings", func(t *testing.T) {
        // Test summary calculation with multiple holdings
    })
    
    t.Run("GetPortfolioSummary_EmptyPortfolio", func(t *testing.T) {
        // Test summary for empty portfolio
    })
}
```

### Frontend Testing

```typescript
// Test coverage requirements:
// - Unit tests: 70% coverage
// - Component tests: All user-facing components
// - E2E tests: Critical flows (Playwright/Cypress)
```

#### Component Test Categories

1. **Form Components**
   - Validation display
   - Submit handling
   - Error states

2. **Data Display Components**
   - Loading states
   - Empty states
   - Error states
   - Data formatting

3. **Chart Components**
   - Data transformation
   - Responsive behaviour
   - Interactivity

### E2E Test Scenarios

```typescript
// e2e/portfolio.spec.ts
describe('Portfolio Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
  });

  it('should create a new ISA portfolio', () => {
    cy.visit('/portfolios');
    cy.get('[data-testid="create-portfolio-btn"]').click();
    cy.get('[data-testid="portfolio-name"]').type('My Vanguard ISA');
    cy.get('[data-testid="portfolio-type"]').select('ISA');
    cy.get('[data-testid="submit-btn"]').click();
    cy.contains('Portfolio created successfully');
    cy.contains('My Vanguard ISA');
  });

  it('should add a holding to portfolio', () => {
    cy.visit('/portfolios/1');
    cy.get('[data-testid="add-holding-btn"]').click();
    cy.get('[data-testid="asset-search"]').type('VUKE');
    cy.get('[data-testid="search-result-VUKE.L"]').click();
    cy.get('[data-testid="quantity"]').type('100');
    cy.get('[data-testid="avg-cost"]').type('29.50');
    cy.get('[data-testid="submit-btn"]').click();
    cy.contains('Holding added successfully');
  });

  it('should display correct portfolio value', () => {
    // Seed portfolio with known holdings
    cy.visit('/portfolios/1');
    cy.get('[data-testid="total-value"]').should('contain', '£');
    cy.get('[data-testid="gain-loss"]').should('exist');
  });
});
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project scaffolding and Docker setup
- [ ] Database schema and migrations
- [ ] User authentication (register, login, JWT)
- [ ] Basic API structure with health endpoints
- [ ] OpenAPI specification

### Phase 2: Core Portfolio (Week 3-4)
- [ ] Portfolio CRUD operations
- [ ] Holdings management
- [ ] Transaction recording
- [ ] Yahoo Finance integration
- [ ] Price caching

### Phase 3: Cash & Fixed Assets (Week 5)
- [ ] Cash account management
- [ ] Fixed asset tracking
- [ ] Net worth calculation

### Phase 4: Frontend MVP (Week 6-7)
- [ ] Authentication UI
- [ ] Dashboard with net worth
- [ ] Portfolio list and detail views
- [ ] Holdings table with live prices
- [ ] Transaction history

### Phase 5: Analytics & Charts (Week 8)
- [ ] Asset allocation charts
- [ ] Performance metrics
- [ ] Net worth history chart
- [ ] Top movers

### Phase 6: Polish & Deploy (Week 9-10)
- [ ] CSV import functionality
- [ ] UI/UX refinements
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Production Docker optimisation

---

## Makefile Commands

```makefile
.PHONY: help dev build test lint migrate seed clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

build: ## Build production images
	docker-compose build

test: ## Run all tests
	cd api && go test -v -cover ./...
	cd frontend && npm test

test-e2e: ## Run E2E tests
	cd frontend && npm run test:e2e

lint: ## Run linters
	cd api && golangci-lint run
	cd frontend && npm run lint

migrate: ## Run database migrations
	docker-compose exec api ./migrate up

migrate-down: ## Rollback last migration
	docker-compose exec api ./migrate down 1

seed: ## Seed test data
	docker-compose exec api ./seed

clean: ## Clean up containers and volumes
	docker-compose down -v --remove-orphans

logs: ## View container logs
	docker-compose logs -f

shell-api: ## Shell into API container
	docker-compose exec api sh

shell-db: ## Shell into database
	docker-compose exec db psql -U wellf
```

---

## Critical Success Criteria

Before considering this project complete, ensure:

1. **Security**
   - [ ] All endpoints require authentication (except health, login, register)
   - [ ] Passwords properly hashed
   - [ ] JWT tokens validated on every request
   - [ ] SQL injection impossible via parameterised queries
   - [ ] XSS prevented in frontend
   - [ ] CORS configured correctly

2. **Data Integrity**
   - [ ] All financial calculations are accurate to 2 decimal places
   - [ ] Transactions maintain ACID properties
   - [ ] Holdings correctly updated from transactions
   - [ ] Currency conversions are accurate

3. **User Experience**
   - [ ] Dashboard loads in under 2 seconds
   - [ ] All forms have proper validation feedback
   - [ ] Loading and error states handled gracefully
   - [ ] Responsive design works on mobile

4. **Deployment**
   - [ ] Single `docker-compose up` starts entire stack
   - [ ] Health checks pass for all services
   - [ ] Environment variables documented
   - [ ] Database migrations run automatically

5. **Testing**
   - [ ] All API endpoints have integration tests
   - [ ] Critical business logic has unit tests
   - [ ] E2E tests cover main user journeys
   - [ ] CI pipeline runs all tests

---

## Additional Notes for Claude Code

1. **Start with the OpenAPI spec** - Define the API contract first in `docs/api/openapi.yaml`

2. **Use the reference repo** - Clone and study https://github.com/venil7/assets for:
   - Yahoo Finance integration patterns
   - JWT authentication flow
   - Docker configuration
   - Database migrations approach

3. **Prioritise security** - This handles financial data; security is non-negotiable

4. **Test calculations thoroughly** - Average cost, gain/loss, and performance metrics must be accurate

5. **Handle Yahoo Finance failures gracefully** - Always have fallback to cached data

6. **Use proper TypeScript** - No `any` types, strict mode enabled

7. **Document as you go** - Update README and API docs with each feature

8. **Commit frequently** - Small, atomic commits with descriptive messages

---

**End of Specification**
