-- Migration: 006_coding.sql
-- Description: Coding module - GitHub integration, code snippets, project templates

-- GitHub configuration (per-user)
CREATE TABLE IF NOT EXISTS github_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_username VARCHAR(100),
    github_token TEXT, -- Personal Access Token (encrypted in application)
    default_visibility VARCHAR(20) DEFAULT 'private', -- public, private
    show_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Code snippets
CREATE TABLE IF NOT EXISTS code_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(50),
    filename VARCHAR(255),
    code TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_favourite BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    source_url VARCHAR(500),
    source_repo VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project templates
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL, -- github_template, gist, local

    -- For GitHub templates
    github_template_repo VARCHAR(255), -- owner/repo for GitHub templates
    github_template_owner VARCHAR(100),

    -- For local/file templates
    files JSONB DEFAULT '[]', -- [{filename, content, language}]

    -- Setup
    setup_commands TEXT[], -- Commands to run after creation
    default_branch VARCHAR(50) DEFAULT 'main',

    -- Template variables
    variables JSONB DEFAULT '[]', -- [{name, description, default}]

    -- Categorization
    category VARCHAR(50), -- web, api, cli, library, other
    tags TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached GitHub repositories (for quick access without API calls)
CREATE TABLE IF NOT EXISTS github_repo_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    description TEXT,
    html_url VARCHAR(500) NOT NULL,
    clone_url VARCHAR(500),
    ssh_url VARCHAR(500),
    language VARCHAR(100),
    stargazers_count INT DEFAULT 0,
    forks_count INT DEFAULT 0,
    open_issues_count INT DEFAULT 0,
    is_private BOOLEAN DEFAULT false,
    is_fork BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    default_branch VARCHAR(100) DEFAULT 'main',
    topics TEXT[] DEFAULT '{}',
    pushed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, github_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_github_configs_user ON github_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_user ON code_snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_language ON code_snippets(user_id, language);
CREATE INDEX IF NOT EXISTS idx_snippets_tags ON code_snippets USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_snippets_favourite ON code_snippets(user_id, is_favourite) WHERE is_favourite = true;
CREATE INDEX IF NOT EXISTS idx_templates_user ON project_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON project_templates(user_id, category);
CREATE INDEX IF NOT EXISTS idx_repo_cache_user ON github_repo_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_cache_language ON github_repo_cache(user_id, language);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_coding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS github_configs_updated_at ON github_configs;
CREATE TRIGGER github_configs_updated_at
    BEFORE UPDATE ON github_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_coding_updated_at();

DROP TRIGGER IF EXISTS code_snippets_updated_at ON code_snippets;
CREATE TRIGGER code_snippets_updated_at
    BEFORE UPDATE ON code_snippets
    FOR EACH ROW
    EXECUTE FUNCTION update_coding_updated_at();

DROP TRIGGER IF EXISTS project_templates_updated_at ON project_templates;
CREATE TRIGGER project_templates_updated_at
    BEFORE UPDATE ON project_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_coding_updated_at();
