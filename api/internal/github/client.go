package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/models"
)

const (
	baseURL    = "https://api.github.com"
	apiVersion = "2022-11-28"
)

// Client is a GitHub API client
type Client struct {
	token      string
	httpClient *http.Client
}

// NewClient creates a new GitHub API client
func NewClient(token string) *Client {
	return &Client{
		token: token,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// doRequest makes an authenticated request to the GitHub API
func (c *Client) doRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	url := baseURL + path
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", apiVersion)

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.httpClient.Do(req)
}

// GitHubUser represents a GitHub user
type GitHubUser struct {
	Login     string `json:"login"`
	ID        int64  `json:"id"`
	AvatarURL string `json:"avatar_url"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Bio       string `json:"bio"`
	PublicRepos int  `json:"public_repos"`
	TotalPrivateRepos int `json:"total_private_repos"`
}

// GetAuthenticatedUser returns the authenticated user
func (c *Client) GetAuthenticatedUser(ctx context.Context) (*GitHubUser, error) {
	resp, err := c.doRequest(ctx, "GET", "/user", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var user GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

// ListRepos returns repositories for the authenticated user
func (c *Client) ListRepos(ctx context.Context, page, perPage int) ([]models.GitHubRepoFromAPI, error) {
	if perPage == 0 {
		perPage = 100
	}
	if page == 0 {
		page = 1
	}

	path := fmt.Sprintf("/user/repos?type=all&sort=pushed&direction=desc&per_page=%d&page=%d", perPage, page)
	resp, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var repos []models.GitHubRepoFromAPI
	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		return nil, err
	}
	return repos, nil
}

// ListAllRepos returns all repositories for the authenticated user (paginated)
func (c *Client) ListAllRepos(ctx context.Context) ([]models.GitHubRepoFromAPI, error) {
	var allRepos []models.GitHubRepoFromAPI
	page := 1
	perPage := 100

	for {
		repos, err := c.ListRepos(ctx, page, perPage)
		if err != nil {
			return nil, err
		}

		allRepos = append(allRepos, repos...)

		if len(repos) < perPage {
			break
		}
		page++
	}
	return allRepos, nil
}

// GetRepo returns a specific repository
func (c *Client) GetRepo(ctx context.Context, owner, repo string) (*models.GitHubRepoFromAPI, error) {
	path := fmt.Sprintf("/repos/%s/%s", owner, repo)
	resp, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var r models.GitHubRepoFromAPI
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return nil, err
	}
	return &r, nil
}

// TestConnection tests the GitHub token
func (c *Client) TestConnection(ctx context.Context) error {
	_, err := c.GetAuthenticatedUser(ctx)
	return err
}

// ConvertRepoToModel converts a GitHub API response to our internal model
func ConvertRepoToModel(userID uuid.UUID, apiRepo *models.GitHubRepoFromAPI) *models.GitHubRepo {
	repo := &models.GitHubRepo{
		UserID:          userID,
		GitHubID:        apiRepo.ID,
		Name:            apiRepo.Name,
		FullName:        apiRepo.FullName,
		HTMLURL:         apiRepo.HTMLURL,
		CloneURL:        apiRepo.CloneURL,
		SSHURL:          apiRepo.SSHURL,
		StargazersCount: apiRepo.StargazersCount,
		ForksCount:      apiRepo.ForksCount,
		OpenIssuesCount: apiRepo.OpenIssuesCount,
		IsPrivate:       apiRepo.Private,
		IsFork:          apiRepo.Fork,
		IsArchived:      apiRepo.Archived,
		IsTemplate:      apiRepo.IsTemplate,
		DefaultBranch:   apiRepo.DefaultBranch,
		Topics:          apiRepo.Topics,
	}

	if apiRepo.Description != nil {
		repo.Description = *apiRepo.Description
	}
	if apiRepo.Language != nil {
		repo.Language = *apiRepo.Language
	}

	// Parse timestamps
	if apiRepo.PushedAt != "" {
		t, _ := time.Parse(time.RFC3339, apiRepo.PushedAt)
		repo.PushedAt = &t
	}
	if apiRepo.CreatedAt != "" {
		t, _ := time.Parse(time.RFC3339, apiRepo.CreatedAt)
		repo.CreatedAt = &t
	}
	if apiRepo.UpdatedAt != "" {
		t, _ := time.Parse(time.RFC3339, apiRepo.UpdatedAt)
		repo.UpdatedAt = &t
	}

	return repo
}

// ConvertReposToModels converts a slice of GitHub API responses to internal models
func ConvertReposToModels(userID uuid.UUID, apiRepos []models.GitHubRepoFromAPI) []models.GitHubRepo {
	repos := make([]models.GitHubRepo, len(apiRepos))
	for i, apiRepo := range apiRepos {
		repos[i] = *ConvertRepoToModel(userID, &apiRepo)
	}
	return repos
}

// =============================================================================
// Commit Activity
// =============================================================================

// CommitActivity represents weekly commit activity
type CommitActivity struct {
	Days  []int `json:"days"`  // Sun-Sat commit counts
	Total int   `json:"total"` // Total commits for the week
	Week  int64 `json:"week"`  // Unix timestamp for start of week
}

// GetCommitActivity returns the last year of commit activity for a repo
func (c *Client) GetCommitActivity(ctx context.Context, owner, repo string) ([]CommitActivity, error) {
	path := fmt.Sprintf("/repos/%s/%s/stats/commit_activity", owner, repo)
	resp, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// GitHub returns 202 if stats are being computed
	if resp.StatusCode == http.StatusAccepted {
		return nil, fmt.Errorf("stats being computed, try again later")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var activity []CommitActivity
	if err := json.NewDecoder(resp.Body).Decode(&activity); err != nil {
		return nil, err
	}
	return activity, nil
}

// ContributorStats represents commit stats for a contributor
type ContributorStats struct {
	Author struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	} `json:"author"`
	Total int `json:"total"`
	Weeks []struct {
		Week      int64 `json:"w"`
		Additions int   `json:"a"`
		Deletions int   `json:"d"`
		Commits   int   `json:"c"`
	} `json:"weeks"`
}

// GetContributorStats returns contributor statistics for a repo
func (c *Client) GetContributorStats(ctx context.Context, owner, repo string) ([]ContributorStats, error) {
	path := fmt.Sprintf("/repos/%s/%s/stats/contributors", owner, repo)
	resp, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusAccepted {
		return nil, fmt.Errorf("stats being computed, try again later")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var stats []ContributorStats
	if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
		return nil, err
	}
	return stats, nil
}

// =============================================================================
// GitHub Actions
// =============================================================================

// Workflow represents a GitHub Actions workflow
type Workflow struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	State     string `json:"state"`
	HTMLURL   string `json:"html_url"`
	BadgeURL  string `json:"badge_url"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// WorkflowsResponse is the response from listing workflows
type WorkflowsResponse struct {
	TotalCount int        `json:"total_count"`
	Workflows  []Workflow `json:"workflows"`
}

// ListWorkflows returns all workflows for a repository
func (c *Client) ListWorkflows(ctx context.Context, owner, repo string) ([]Workflow, error) {
	path := fmt.Sprintf("/repos/%s/%s/actions/workflows", owner, repo)
	resp, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var result WorkflowsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Workflows, nil
}

// WorkflowRun represents a GitHub Actions workflow run
type WorkflowRun struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	HeadBranch   string `json:"head_branch"`
	HeadSHA      string `json:"head_sha"`
	Status       string `json:"status"`       // queued, in_progress, completed
	Conclusion   string `json:"conclusion"`   // success, failure, cancelled, skipped, etc.
	WorkflowID   int64  `json:"workflow_id"`
	HTMLURL      string `json:"html_url"`
	Event        string `json:"event"`        // push, pull_request, etc.
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	RunStartedAt string `json:"run_started_at"`
	Actor        struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	} `json:"actor"`
	TriggeringActor struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	} `json:"triggering_actor"`
	RunNumber  int    `json:"run_number"`
	RunAttempt int    `json:"run_attempt"`
}

// WorkflowRunsResponse is the response from listing workflow runs
type WorkflowRunsResponse struct {
	TotalCount   int           `json:"total_count"`
	WorkflowRuns []WorkflowRun `json:"workflow_runs"`
}

// ListWorkflowRuns returns recent workflow runs for a repository
func (c *Client) ListWorkflowRuns(ctx context.Context, owner, repo string, limit int) ([]WorkflowRun, error) {
	if limit == 0 {
		limit = 10
	}
	path := fmt.Sprintf("/repos/%s/%s/actions/runs?per_page=%d", owner, repo, limit)
	resp, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var result WorkflowRunsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.WorkflowRuns, nil
}

// GetWorkflowRun returns a specific workflow run
func (c *Client) GetWorkflowRun(ctx context.Context, owner, repo string, runID int64) (*WorkflowRun, error) {
	path := fmt.Sprintf("/repos/%s/%s/actions/runs/%d", owner, repo, runID)
	resp, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %d - %s", resp.StatusCode, string(body))
	}

	var run WorkflowRun
	if err := json.NewDecoder(resp.Body).Decode(&run); err != nil {
		return nil, err
	}
	return &run, nil
}
