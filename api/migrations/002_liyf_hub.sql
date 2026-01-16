-- LiyfHub Database Schema
-- Migration for activity log and hub user preferences

-- Activity log for cross-domain activity feed
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(50) NOT NULL, -- finance, cooking, books, plants, code
    action VARCHAR(50) NOT NULL, -- created, updated, deleted, completed
    entity_type VARCHAR(50) NOT NULL, -- recipe, book, plant, repo, portfolio, etc.
    entity_id UUID,
    entity_name VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_domain ON activity_log(domain);

-- User preferences for hub
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hub_domain_order') THEN
        ALTER TABLE users ADD COLUMN hub_domain_order TEXT[] DEFAULT ARRAY['finance', 'cooking', 'books', 'plants', 'code'];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hub_show_activity') THEN
        ALTER TABLE users ADD COLUMN hub_show_activity BOOLEAN DEFAULT true;
    END IF;
END $$;
