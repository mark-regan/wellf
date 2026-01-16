package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

// GitHubConfigRepository handles GitHub configuration operations
type GitHubConfigRepository struct {
	pool *pgxpool.Pool
}

// NewGitHubConfigRepository creates a new GitHub config repository
func NewGitHubConfigRepository(pool *pgxpool.Pool) *GitHubConfigRepository {
	return &GitHubConfigRepository{pool: pool}
}

// Get retrieves the GitHub config for a user
func (r *GitHubConfigRepository) Get(ctx context.Context, userID uuid.UUID) (*models.GitHubConfig, error) {
	query := `
		SELECT id, user_id, github_username, github_token, default_visibility, show_archived, created_at, updated_at
		FROM github_configs
		WHERE user_id = $1
	`
	var config models.GitHubConfig
	var token *string
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&config.ID, &config.UserID, &config.GitHubUsername, &token,
		&config.DefaultVisibility, &config.ShowArchived, &config.CreatedAt, &config.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if token != nil {
		config.GitHubToken = *token
		config.HasToken = true
	}
	return &config, nil
}

// Upsert creates or updates the GitHub config for a user
func (r *GitHubConfigRepository) Upsert(ctx context.Context, config *models.GitHubConfig) error {
	query := `
		INSERT INTO github_configs (user_id, github_username, github_token, default_visibility, show_archived)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			github_username = EXCLUDED.github_username,
			github_token = COALESCE(NULLIF(EXCLUDED.github_token, ''), github_configs.github_token),
			default_visibility = EXCLUDED.default_visibility,
			show_archived = EXCLUDED.show_archived,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		config.UserID, config.GitHubUsername, nullIfEmpty(config.GitHubToken),
		config.DefaultVisibility, config.ShowArchived,
	).Scan(&config.ID, &config.CreatedAt, &config.UpdatedAt)
}

// Delete removes the GitHub config for a user
func (r *GitHubConfigRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM github_configs WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// =============================================================================
// Code Snippets Repository
// =============================================================================

// SnippetRepository handles code snippet operations
type SnippetRepository struct {
	pool *pgxpool.Pool
}

// NewSnippetRepository creates a new snippet repository
func NewSnippetRepository(pool *pgxpool.Pool) *SnippetRepository {
	return &SnippetRepository{pool: pool}
}

// List returns all snippets for a user
func (r *SnippetRepository) List(ctx context.Context, userID uuid.UUID, language string, favouritesOnly bool) ([]models.CodeSnippet, error) {
	query := `
		SELECT id, user_id, title, description, language, filename, code, tags,
		       is_favourite, is_public, source_url, source_repo, created_at, updated_at
		FROM code_snippets
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argNum := 2

	if language != "" {
		query += ` AND language = $` + string(rune('0'+argNum))
		args = append(args, language)
		argNum++
	}

	if favouritesOnly {
		query += ` AND is_favourite = true`
	}

	query += ` ORDER BY updated_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snippets []models.CodeSnippet
	for rows.Next() {
		var s models.CodeSnippet
		err := rows.Scan(
			&s.ID, &s.UserID, &s.Title, &s.Description, &s.Language, &s.Filename, &s.Code,
			&s.Tags, &s.IsFavourite, &s.IsPublic, &s.SourceURL, &s.SourceRepo,
			&s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		snippets = append(snippets, s)
	}
	return snippets, nil
}

// GetByID returns a snippet by ID
func (r *SnippetRepository) GetByID(ctx context.Context, userID, snippetID uuid.UUID) (*models.CodeSnippet, error) {
	query := `
		SELECT id, user_id, title, description, language, filename, code, tags,
		       is_favourite, is_public, source_url, source_repo, created_at, updated_at
		FROM code_snippets
		WHERE id = $1 AND user_id = $2
	`
	var s models.CodeSnippet
	err := r.pool.QueryRow(ctx, query, snippetID, userID).Scan(
		&s.ID, &s.UserID, &s.Title, &s.Description, &s.Language, &s.Filename, &s.Code,
		&s.Tags, &s.IsFavourite, &s.IsPublic, &s.SourceURL, &s.SourceRepo,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// Create creates a new snippet
func (r *SnippetRepository) Create(ctx context.Context, snippet *models.CodeSnippet) error {
	query := `
		INSERT INTO code_snippets (user_id, title, description, language, filename, code, tags,
		                           is_favourite, is_public, source_url, source_repo)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		snippet.UserID, snippet.Title, snippet.Description, snippet.Language, snippet.Filename,
		snippet.Code, snippet.Tags, snippet.IsFavourite, snippet.IsPublic,
		snippet.SourceURL, snippet.SourceRepo,
	).Scan(&snippet.ID, &snippet.CreatedAt, &snippet.UpdatedAt)
}

// Update updates a snippet
func (r *SnippetRepository) Update(ctx context.Context, snippet *models.CodeSnippet) error {
	query := `
		UPDATE code_snippets SET
			title = $3, description = $4, language = $5, filename = $6, code = $7,
			tags = $8, is_favourite = $9, is_public = $10, source_url = $11, source_repo = $12
		WHERE id = $1 AND user_id = $2
		RETURNING updated_at
	`
	return r.pool.QueryRow(ctx, query,
		snippet.ID, snippet.UserID, snippet.Title, snippet.Description, snippet.Language,
		snippet.Filename, snippet.Code, snippet.Tags, snippet.IsFavourite, snippet.IsPublic,
		snippet.SourceURL, snippet.SourceRepo,
	).Scan(&snippet.UpdatedAt)
}

// Delete removes a snippet
func (r *SnippetRepository) Delete(ctx context.Context, userID, snippetID uuid.UUID) error {
	query := `DELETE FROM code_snippets WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, snippetID, userID)
	return err
}

// Count returns the number of snippets for a user
func (r *SnippetRepository) Count(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM code_snippets WHERE user_id = $1`
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

// GetRecent returns recent snippets
func (r *SnippetRepository) GetRecent(ctx context.Context, userID uuid.UUID, limit int) ([]models.CodeSnippet, error) {
	query := `
		SELECT id, user_id, title, description, language, filename, code, tags,
		       is_favourite, is_public, source_url, source_repo, created_at, updated_at
		FROM code_snippets
		WHERE user_id = $1
		ORDER BY updated_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snippets []models.CodeSnippet
	for rows.Next() {
		var s models.CodeSnippet
		err := rows.Scan(
			&s.ID, &s.UserID, &s.Title, &s.Description, &s.Language, &s.Filename, &s.Code,
			&s.Tags, &s.IsFavourite, &s.IsPublic, &s.SourceURL, &s.SourceRepo,
			&s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		snippets = append(snippets, s)
	}
	return snippets, nil
}

// =============================================================================
// Project Templates Repository
// =============================================================================

// TemplateRepository handles project template operations
type TemplateRepository struct {
	pool *pgxpool.Pool
}

// NewTemplateRepository creates a new template repository
func NewTemplateRepository(pool *pgxpool.Pool) *TemplateRepository {
	return &TemplateRepository{pool: pool}
}

// List returns all templates for a user
func (r *TemplateRepository) List(ctx context.Context, userID uuid.UUID, category string) ([]models.ProjectTemplate, error) {
	query := `
		SELECT id, user_id, name, description, template_type, github_template_repo, github_template_owner,
		       files, setup_commands, default_branch, variables, category, tags, created_at, updated_at
		FROM project_templates
		WHERE user_id = $1
	`
	args := []interface{}{userID}

	if category != "" {
		query += ` AND category = $2`
		args = append(args, category)
	}

	query += ` ORDER BY name`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.ProjectTemplate
	for rows.Next() {
		t, err := r.scanTemplate(rows)
		if err != nil {
			return nil, err
		}
		templates = append(templates, *t)
	}
	return templates, nil
}

// GetByID returns a template by ID
func (r *TemplateRepository) GetByID(ctx context.Context, userID, templateID uuid.UUID) (*models.ProjectTemplate, error) {
	query := `
		SELECT id, user_id, name, description, template_type, github_template_repo, github_template_owner,
		       files, setup_commands, default_branch, variables, category, tags, created_at, updated_at
		FROM project_templates
		WHERE id = $1 AND user_id = $2
	`
	row := r.pool.QueryRow(ctx, query, templateID, userID)
	return r.scanTemplateRow(row)
}

// Create creates a new template
func (r *TemplateRepository) Create(ctx context.Context, template *models.ProjectTemplate) error {
	filesJSON, _ := json.Marshal(template.Files)
	varsJSON, _ := json.Marshal(template.Variables)

	query := `
		INSERT INTO project_templates (user_id, name, description, template_type, github_template_repo,
		                               github_template_owner, files, setup_commands, default_branch,
		                               variables, category, tags)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		template.UserID, template.Name, template.Description, template.TemplateType,
		template.GitHubTemplateRepo, template.GitHubTemplateOwner, filesJSON,
		template.SetupCommands, template.DefaultBranch, varsJSON, template.Category, template.Tags,
	).Scan(&template.ID, &template.CreatedAt, &template.UpdatedAt)
}

// Update updates a template
func (r *TemplateRepository) Update(ctx context.Context, template *models.ProjectTemplate) error {
	filesJSON, _ := json.Marshal(template.Files)
	varsJSON, _ := json.Marshal(template.Variables)

	query := `
		UPDATE project_templates SET
			name = $3, description = $4, template_type = $5, github_template_repo = $6,
			github_template_owner = $7, files = $8, setup_commands = $9, default_branch = $10,
			variables = $11, category = $12, tags = $13
		WHERE id = $1 AND user_id = $2
		RETURNING updated_at
	`
	return r.pool.QueryRow(ctx, query,
		template.ID, template.UserID, template.Name, template.Description, template.TemplateType,
		template.GitHubTemplateRepo, template.GitHubTemplateOwner, filesJSON,
		template.SetupCommands, template.DefaultBranch, varsJSON, template.Category, template.Tags,
	).Scan(&template.UpdatedAt)
}

// Delete removes a template
func (r *TemplateRepository) Delete(ctx context.Context, userID, templateID uuid.UUID) error {
	query := `DELETE FROM project_templates WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, templateID, userID)
	return err
}

// Count returns the number of templates for a user
func (r *TemplateRepository) Count(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM project_templates WHERE user_id = $1`
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *TemplateRepository) scanTemplate(rows pgx.Rows) (*models.ProjectTemplate, error) {
	var t models.ProjectTemplate
	var filesJSON, varsJSON []byte

	err := rows.Scan(
		&t.ID, &t.UserID, &t.Name, &t.Description, &t.TemplateType,
		&t.GitHubTemplateRepo, &t.GitHubTemplateOwner, &filesJSON,
		&t.SetupCommands, &t.DefaultBranch, &varsJSON, &t.Category, &t.Tags,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(filesJSON) > 0 {
		json.Unmarshal(filesJSON, &t.Files)
	}
	if len(varsJSON) > 0 {
		json.Unmarshal(varsJSON, &t.Variables)
	}
	return &t, nil
}

func (r *TemplateRepository) scanTemplateRow(row pgx.Row) (*models.ProjectTemplate, error) {
	var t models.ProjectTemplate
	var filesJSON, varsJSON []byte

	err := row.Scan(
		&t.ID, &t.UserID, &t.Name, &t.Description, &t.TemplateType,
		&t.GitHubTemplateRepo, &t.GitHubTemplateOwner, &filesJSON,
		&t.SetupCommands, &t.DefaultBranch, &varsJSON, &t.Category, &t.Tags,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(filesJSON) > 0 {
		json.Unmarshal(filesJSON, &t.Files)
	}
	if len(varsJSON) > 0 {
		json.Unmarshal(varsJSON, &t.Variables)
	}
	return &t, nil
}

// =============================================================================
// GitHub Repo Cache Repository
// =============================================================================

// GitHubRepoCacheRepository handles GitHub repository cache operations
type GitHubRepoCacheRepository struct {
	pool *pgxpool.Pool
}

// NewGitHubRepoCacheRepository creates a new GitHub repo cache repository
func NewGitHubRepoCacheRepository(pool *pgxpool.Pool) *GitHubRepoCacheRepository {
	return &GitHubRepoCacheRepository{pool: pool}
}

// List returns cached repos for a user
func (r *GitHubRepoCacheRepository) List(ctx context.Context, userID uuid.UUID, includeArchived bool) ([]models.GitHubRepo, error) {
	query := `
		SELECT id, user_id, github_id, name, full_name, description, html_url, clone_url, ssh_url,
		       language, stargazers_count, forks_count, open_issues_count, is_private, is_fork,
		       is_archived, is_template, default_branch, topics, pushed_at, created_at, updated_at, cached_at
		FROM github_repo_cache
		WHERE user_id = $1
	`
	if !includeArchived {
		query += ` AND is_archived = false`
	}
	query += ` ORDER BY pushed_at DESC NULLS LAST`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var repos []models.GitHubRepo
	for rows.Next() {
		var repo models.GitHubRepo
		err := rows.Scan(
			&repo.ID, &repo.UserID, &repo.GitHubID, &repo.Name, &repo.FullName, &repo.Description,
			&repo.HTMLURL, &repo.CloneURL, &repo.SSHURL, &repo.Language, &repo.StargazersCount,
			&repo.ForksCount, &repo.OpenIssuesCount, &repo.IsPrivate, &repo.IsFork, &repo.IsArchived,
			&repo.IsTemplate, &repo.DefaultBranch, &repo.Topics, &repo.PushedAt, &repo.CreatedAt,
			&repo.UpdatedAt, &repo.CachedAt,
		)
		if err != nil {
			return nil, err
		}
		repos = append(repos, repo)
	}
	return repos, nil
}

// Upsert creates or updates a cached repo
func (r *GitHubRepoCacheRepository) Upsert(ctx context.Context, repo *models.GitHubRepo) error {
	query := `
		INSERT INTO github_repo_cache (user_id, github_id, name, full_name, description, html_url,
		                               clone_url, ssh_url, language, stargazers_count, forks_count,
		                               open_issues_count, is_private, is_fork, is_archived, is_template,
		                               default_branch, topics, pushed_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		ON CONFLICT (user_id, github_id) DO UPDATE SET
			name = EXCLUDED.name, full_name = EXCLUDED.full_name, description = EXCLUDED.description,
			html_url = EXCLUDED.html_url, clone_url = EXCLUDED.clone_url, ssh_url = EXCLUDED.ssh_url,
			language = EXCLUDED.language, stargazers_count = EXCLUDED.stargazers_count,
			forks_count = EXCLUDED.forks_count, open_issues_count = EXCLUDED.open_issues_count,
			is_private = EXCLUDED.is_private, is_fork = EXCLUDED.is_fork, is_archived = EXCLUDED.is_archived,
			is_template = EXCLUDED.is_template, default_branch = EXCLUDED.default_branch, topics = EXCLUDED.topics,
			pushed_at = EXCLUDED.pushed_at, updated_at = EXCLUDED.updated_at, cached_at = NOW()
		RETURNING id, cached_at
	`
	return r.pool.QueryRow(ctx, query,
		repo.UserID, repo.GitHubID, repo.Name, repo.FullName, repo.Description, repo.HTMLURL,
		repo.CloneURL, repo.SSHURL, repo.Language, repo.StargazersCount, repo.ForksCount,
		repo.OpenIssuesCount, repo.IsPrivate, repo.IsFork, repo.IsArchived, repo.IsTemplate,
		repo.DefaultBranch, repo.Topics, repo.PushedAt, repo.CreatedAt, repo.UpdatedAt,
	).Scan(&repo.ID, &repo.CachedAt)
}

// BulkUpsert creates or updates multiple cached repos
func (r *GitHubRepoCacheRepository) BulkUpsert(ctx context.Context, repos []models.GitHubRepo) error {
	for _, repo := range repos {
		if err := r.Upsert(ctx, &repo); err != nil {
			return err
		}
	}
	return nil
}

// DeleteAll removes all cached repos for a user
func (r *GitHubRepoCacheRepository) DeleteAll(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM github_repo_cache WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// Count returns the number of cached repos
func (r *GitHubRepoCacheRepository) Count(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM github_repo_cache WHERE user_id = $1`
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

// GetByLanguage returns language statistics
func (r *GitHubRepoCacheRepository) GetByLanguage(ctx context.Context, userID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT language, COUNT(*)
		FROM github_repo_cache
		WHERE user_id = $1 AND language IS NOT NULL AND language != ''
		GROUP BY language
		ORDER BY COUNT(*) DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var lang string
		var count int
		if err := rows.Scan(&lang, &count); err != nil {
			return nil, err
		}
		result[lang] = count
	}
	return result, nil
}

// GetRecent returns recently pushed repos
func (r *GitHubRepoCacheRepository) GetRecent(ctx context.Context, userID uuid.UUID, limit int) ([]models.GitHubRepo, error) {
	query := `
		SELECT id, user_id, github_id, name, full_name, description, html_url, clone_url, ssh_url,
		       language, stargazers_count, forks_count, open_issues_count, is_private, is_fork,
		       is_archived, is_template, default_branch, topics, pushed_at, created_at, updated_at, cached_at
		FROM github_repo_cache
		WHERE user_id = $1 AND is_archived = false
		ORDER BY pushed_at DESC NULLS LAST
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var repos []models.GitHubRepo
	for rows.Next() {
		var repo models.GitHubRepo
		err := rows.Scan(
			&repo.ID, &repo.UserID, &repo.GitHubID, &repo.Name, &repo.FullName, &repo.Description,
			&repo.HTMLURL, &repo.CloneURL, &repo.SSHURL, &repo.Language, &repo.StargazersCount,
			&repo.ForksCount, &repo.OpenIssuesCount, &repo.IsPrivate, &repo.IsFork, &repo.IsArchived,
			&repo.IsTemplate, &repo.DefaultBranch, &repo.Topics, &repo.PushedAt, &repo.CreatedAt,
			&repo.UpdatedAt, &repo.CachedAt,
		)
		if err != nil {
			return nil, err
		}
		repos = append(repos, repo)
	}
	return repos, nil
}

// GetCacheAge returns how old the cache is
func (r *GitHubRepoCacheRepository) GetCacheAge(ctx context.Context, userID uuid.UUID) (*time.Time, error) {
	query := `SELECT MIN(cached_at) FROM github_repo_cache WHERE user_id = $1`
	var cacheTime *time.Time
	err := r.pool.QueryRow(ctx, query, userID).Scan(&cacheTime)
	return cacheTime, err
}

// Helper function
func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
