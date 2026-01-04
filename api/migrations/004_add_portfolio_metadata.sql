-- Add metadata JSONB column to portfolios for type-specific information
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for common metadata queries
CREATE INDEX IF NOT EXISTS idx_portfolios_metadata ON portfolios USING GIN (metadata);

-- Update contribution limits based on current tax year (2024/25)
-- ISA: £20,000
-- LISA: £4,000 (counts toward ISA limit)
-- JISA: £9,000
-- SIPP: No fixed limit (but tax relief limited)

COMMENT ON COLUMN portfolios.metadata IS 'Type-specific portfolio metadata stored as JSONB';
