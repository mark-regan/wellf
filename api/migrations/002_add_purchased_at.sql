-- Add purchased_at column to holdings table
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP WITH TIME ZONE;
