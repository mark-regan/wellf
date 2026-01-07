-- Wellf Database Schema
-- Consolidated migration (includes all schema changes)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    base_currency CHAR(3) DEFAULT 'GBP',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    locale VARCHAR(10) DEFAULT 'en-GB',
    fire_target DECIMAL(20, 2),
    fire_enabled BOOLEAN DEFAULT false,
    theme VARCHAR(10) DEFAULT 'system',
    phone_number VARCHAR(20),
    date_of_birth DATE,
    notify_email BOOLEAN DEFAULT true,
    notify_price_alerts BOOLEAN DEFAULT false,
    notify_weekly BOOLEAN DEFAULT false,
    notify_monthly BOOLEAN DEFAULT false,
    watchlist TEXT DEFAULT '',
    provider_lists TEXT DEFAULT '',
    is_admin BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Portfolios (ISA, SIPP, General Investment, Crypto, etc.)
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    currency CHAR(3) DEFAULT 'GBP',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Assets (tradeable securities)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    exchange VARCHAR(50),
    currency CHAR(3) NOT NULL,
    data_source VARCHAR(50) DEFAULT 'YAHOO',
    last_price DECIMAL(20, 8),
    last_price_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holdings (current positions)
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id),
    quantity DECIMAL(20, 8) NOT NULL,
    average_cost DECIMAL(20, 8),
    purchased_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, asset_id)
);

-- Transactions (buy, sell, dividend, etc.)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id),
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(20, 8),
    price DECIMAL(20, 8),
    total_amount DECIMAL(20, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash/Bank accounts
CREATE TABLE IF NOT EXISTS cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    institution VARCHAR(100),
    balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) DEFAULT 'GBP',
    interest_rate DECIMAL(5, 4),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed assets (property, vehicles, valuables)
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
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
CREATE TABLE IF NOT EXISTS price_history (
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
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency CHAR(3) NOT NULL,
    to_currency CHAR(3) NOT NULL,
    rate DECIMAL(20, 10) NOT NULL,
    rate_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, rate_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio ON transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_asset_date ON price_history(asset_id, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_metadata ON portfolios USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_user ON fixed_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_portfolio ON cash_accounts(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol);

-- Add columns if they don't exist (for existing databases)
-- These use DO blocks to handle idempotent upgrades

DO $$
BEGIN
    -- Users table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'date_format') THEN
        ALTER TABLE users ADD COLUMN date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locale') THEN
        ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'en-GB';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'fire_target') THEN
        ALTER TABLE users ADD COLUMN fire_target DECIMAL(20, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'fire_enabled') THEN
        ALTER TABLE users ADD COLUMN fire_enabled BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'theme') THEN
        ALTER TABLE users ADD COLUMN theme VARCHAR(10) DEFAULT 'system';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'date_of_birth') THEN
        ALTER TABLE users ADD COLUMN date_of_birth DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notify_email') THEN
        ALTER TABLE users ADD COLUMN notify_email BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notify_price_alerts') THEN
        ALTER TABLE users ADD COLUMN notify_price_alerts BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notify_weekly') THEN
        ALTER TABLE users ADD COLUMN notify_weekly BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notify_monthly') THEN
        ALTER TABLE users ADD COLUMN notify_monthly BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'watchlist') THEN
        ALTER TABLE users ADD COLUMN watchlist TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'provider_lists') THEN
        ALTER TABLE users ADD COLUMN provider_lists TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
        -- Make all existing users admins
        UPDATE users SET is_admin = true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_locked') THEN
        ALTER TABLE users ADD COLUMN is_locked BOOLEAN DEFAULT false;
    END IF;

    -- Holdings table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holdings' AND column_name = 'purchased_at') THEN
        ALTER TABLE holdings ADD COLUMN purchased_at TIMESTAMPTZ;
    END IF;

    -- Portfolios table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'metadata') THEN
        ALTER TABLE portfolios ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;
