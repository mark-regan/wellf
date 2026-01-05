# wellf

A personal wealth tracking application for monitoring investments, portfolios, and financial goals.

## Features

- **Portfolio Management**: Track multiple portfolio types including GIA, ISA, SIPP, LISA, JISA, Crypto, Savings, Cash, and Fixed Assets
- **Holdings Tracking**: Monitor all your investments with real-time price updates from Yahoo Finance
- **Current Prices**: View market indices, your holdings, and custom watchlist with interactive charts in a modal popup
- **Watchlist**: Customizable list of tickers to monitor (configurable in Settings)
- **Cash Accounts**: Separate tracking for cash holdings across portfolios
- **Fixed Assets**: Track non-tradeable assets like property and vehicles (auto-created portfolio per user)
- **Performance Charts**: Visualize portfolio performance over time with customizable date ranges
- **FIRE Tracking**: Set and monitor progress towards your Financial Independence / Retire Early goal
- **Multi-Currency Support**: Handle investments in different currencies with automatic conversion
- **Transaction History**: Full history of buys, sells, dividends, and other transactions

## Tech Stack

### Backend
- **Go** - API server
- **PostgreSQL** - Database
- **Redis** - Caching and rate limiting
- **Chi Router** - HTTP routing
- **Yahoo Finance API** - Real-time market data

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tooling
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Charts and visualizations
- **Zustand** - State management
- **React Router** - Navigation

## Prerequisites

- Docker and Docker Compose
- Make (optional, for convenience commands)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wellf
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure:
   - `JWT_SECRET` - Generate a secure random string
   - `DB_PASSWORD` - Set a secure database password
   - Other settings as needed

3. **Start the application**
   ```bash
   make dev
   # Or without make:
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:4020
   - API Health: http://localhost:4020/api/v1/health

## Development Commands

```bash
make help              # Show all available commands
make dev               # Start development environment
make dev-detach        # Start in background
make stop              # Stop all containers
make logs              # View all logs
make logs-api          # View API logs only
make shell-api         # Shell into API container
make shell-db          # Access PostgreSQL CLI
make clean             # Remove containers and volumes
make test              # Run all tests
make lint              # Run linters
```

## Project Structure

```
wellf/
├── api/                    # Go backend
│   ├── cmd/server/         # Main application entry
│   ├── internal/
│   │   ├── handlers/       # HTTP handlers
│   │   ├── middleware/     # HTTP middleware
│   │   ├── models/         # Data models
│   │   ├── repository/     # Database access
│   │   └── services/       # Business logic
│   ├── migrations/         # SQL migrations
│   └── pkg/                # Shared packages
├── frontend/               # React frontend
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand stores
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── docker-compose.yml      # Docker services
├── Makefile               # Development commands
└── .env.example           # Environment template
```

## API Overview

All API endpoints are prefixed with `/api/v1`.

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user
- `PUT /auth/me` - Update profile
- `PUT /auth/password` - Change password

### Portfolios
- `GET /portfolios` - List all portfolios
- `POST /portfolios` - Create portfolio
- `GET /portfolios/{id}` - Get portfolio
- `PUT /portfolios/{id}` - Update portfolio
- `DELETE /portfolios/{id}` - Delete portfolio
- `GET /portfolios/{id}/summary` - Portfolio summary

### Holdings
- `GET /holdings` - All holdings across portfolios
- `GET /portfolios/{id}/holdings` - Portfolio holdings
- `POST /portfolios/{id}/holdings` - Add holding
- `PUT /holdings/{id}` - Update holding
- `DELETE /holdings/{id}` - Remove holding

### Transactions
- `GET /portfolios/{id}/transactions` - List transactions
- `POST /portfolios/{id}/transactions` - Create transaction
- `DELETE /transactions/{id}` - Delete transaction

### Cash Accounts
- `GET /cash-accounts` - All cash accounts
- `GET /portfolios/{id}/cash-accounts` - Portfolio cash accounts
- `POST /portfolios/{id}/cash-accounts` - Create cash account
- `PUT /cash-accounts/{id}` - Update cash account
- `DELETE /cash-accounts/{id}` - Delete cash account

### Dashboard
- `GET /dashboard/summary` - Net worth summary
- `GET /dashboard/allocation` - Asset allocation
- `GET /dashboard/movers` - Top gainers/losers
- `GET /dashboard/performance` - Performance chart data

### Assets
- `GET /assets/search` - Search for assets
- `GET /assets/quotes?symbols=X,Y,Z` - Get quotes for multiple symbols
- `GET /assets/{symbol}` - Asset details
- `GET /assets/{symbol}/history` - Price history
- `POST /assets/refresh` - Refresh prices

### Fixed Assets
- `GET /fixed-assets` - List fixed assets
- `POST /fixed-assets` - Create fixed asset
- `PUT /fixed-assets/{id}` - Update fixed asset
- `DELETE /fixed-assets/{id}` - Delete fixed asset

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `wellf` |
| `DB_PASSWORD` | PostgreSQL password | - |
| `DB_NAME` | Database name | `wellf` |
| `API_PORT` | API server port | `4020` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `BASE_CURRENCY` | Default currency | `GBP` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `YAHOO_CACHE_TTL` | Price cache duration | `10m` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `VITE_API_URL` | API URL for frontend | `http://localhost:4020` |

## Security

- Passwords are hashed using bcrypt with a cost factor of 12
- JWT tokens for authentication with short-lived access tokens
- All user data is isolated by user ID
- Input validation on all endpoints
- CORS configured for frontend origin

## License

MIT
