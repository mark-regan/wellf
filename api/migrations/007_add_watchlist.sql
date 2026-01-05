-- +migrate Up
ALTER TABLE users
ADD COLUMN IF NOT EXISTS watchlist TEXT DEFAULT '';

-- +migrate Down
ALTER TABLE users
DROP COLUMN IF EXISTS watchlist;
