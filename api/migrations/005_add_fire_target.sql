-- Add FIRE target amount to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fire_target DECIMAL(20, 2);
