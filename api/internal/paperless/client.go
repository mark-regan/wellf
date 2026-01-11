package paperless

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Client is a client for the Paperless-ngx REST API
type Client struct {
	baseURL    string
	apiToken   string
	httpClient *http.Client
}

// NewClient creates a new Paperless API client
func NewClient(baseURL, apiToken string) *Client {
	// Ensure baseURL doesn't have trailing slash
	baseURL = strings.TrimSuffix(baseURL, "/")

	return &Client{
		baseURL:  baseURL,
		apiToken: apiToken,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// setHeaders sets the required headers for Paperless API requests
func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("Authorization", "Token "+c.apiToken)
	req.Header.Set("Accept", "application/json; version=5")
	req.Header.Set("Content-Type", "application/json")
}

// doRequest executes an HTTP request and returns the response body
func (c *Client) doRequest(ctx context.Context, method, path string, body io.Reader) ([]byte, error) {
	reqURL := c.baseURL + path

	req, err := http.NewRequestWithContext(ctx, method, reqURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// TestConnection verifies that the credentials work
func (c *Client) TestConnection(ctx context.Context) error {
	// Try to fetch the first page of documents with a limit of 1
	_, err := c.doRequest(ctx, http.MethodGet, "/api/documents/?page_size=1", nil)
	if err != nil {
		return fmt.Errorf("connection test failed: %w", err)
	}
	return nil
}

// Document represents a Paperless document
type Document struct {
	ID                   int       `json:"id"`
	Correspondent        *int      `json:"correspondent"`
	DocumentType         *int      `json:"document_type"`
	Title                string    `json:"title"`
	Content              string    `json:"content,omitempty"`
	Tags                 []int     `json:"tags"`
	Created              string    `json:"created"`
	CreatedDate          string    `json:"created_date"`
	Modified             string    `json:"modified"`
	Added                string    `json:"added"`
	ArchiveSerialNumber  *int      `json:"archive_serial_number"`
	OriginalFileName     string    `json:"original_file_name"`
	ArchivedFileName     string    `json:"archived_file_name"`
	Owner                *int      `json:"owner"`
	Notes                []Note    `json:"notes,omitempty"`
	// Expanded fields (when using correspondent__name, etc.)
	CorrespondentName  string `json:"correspondent__name,omitempty"`
	DocumentTypeName   string `json:"document_type__name,omitempty"`
}

// Note represents a note on a Paperless document
type Note struct {
	ID      int    `json:"id"`
	Note    string `json:"note"`
	Created string `json:"created"`
}

// DocumentList represents a paginated list of documents from Paperless
type DocumentList struct {
	Count    int        `json:"count"`
	Next     *string    `json:"next"`
	Previous *string    `json:"previous"`
	Results  []Document `json:"results"`
}

// SearchDocuments searches for documents in Paperless
func (c *Client) SearchDocuments(ctx context.Context, query string, page int) (*DocumentList, error) {
	if page < 1 {
		page = 1
	}

	params := url.Values{}
	if query != "" {
		params.Set("query", query)
	}
	params.Set("page", strconv.Itoa(page))
	params.Set("page_size", "20")

	path := "/api/documents/?" + params.Encode()

	body, err := c.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result DocumentList
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetDocument fetches a single document by ID
func (c *Client) GetDocument(ctx context.Context, id int) (*Document, error) {
	path := fmt.Sprintf("/api/documents/%d/", id)

	body, err := c.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var doc Document
	if err := json.Unmarshal(body, &doc); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &doc, nil
}

// Correspondent represents a Paperless correspondent
type Correspondent struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	DocumentCount int    `json:"document_count"`
}

// CorrespondentList represents a paginated list of correspondents
type CorrespondentList struct {
	Count    int             `json:"count"`
	Next     *string         `json:"next"`
	Previous *string         `json:"previous"`
	Results  []Correspondent `json:"results"`
}

// GetCorrespondents fetches all correspondents
func (c *Client) GetCorrespondents(ctx context.Context) ([]Correspondent, error) {
	var allCorrespondents []Correspondent
	page := 1

	for {
		path := fmt.Sprintf("/api/correspondents/?page=%d&page_size=100", page)

		body, err := c.doRequest(ctx, http.MethodGet, path, nil)
		if err != nil {
			return nil, err
		}

		var result CorrespondentList
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		allCorrespondents = append(allCorrespondents, result.Results...)

		if result.Next == nil {
			break
		}
		page++
	}

	return allCorrespondents, nil
}

// DocumentType represents a Paperless document type
type DocumentType struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	DocumentCount int    `json:"document_count"`
}

// DocumentTypeList represents a paginated list of document types
type DocumentTypeList struct {
	Count    int            `json:"count"`
	Next     *string        `json:"next"`
	Previous *string        `json:"previous"`
	Results  []DocumentType `json:"results"`
}

// GetDocumentTypes fetches all document types
func (c *Client) GetDocumentTypes(ctx context.Context) ([]DocumentType, error) {
	var allTypes []DocumentType
	page := 1

	for {
		path := fmt.Sprintf("/api/document_types/?page=%d&page_size=100", page)

		body, err := c.doRequest(ctx, http.MethodGet, path, nil)
		if err != nil {
			return nil, err
		}

		var result DocumentTypeList
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		allTypes = append(allTypes, result.Results...)

		if result.Next == nil {
			break
		}
		page++
	}

	return allTypes, nil
}

// Tag represents a Paperless tag
type Tag struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Color         string `json:"color"`
	DocumentCount int    `json:"document_count"`
}

// TagList represents a paginated list of tags
type TagList struct {
	Count    int     `json:"count"`
	Next     *string `json:"next"`
	Previous *string `json:"previous"`
	Results  []Tag   `json:"results"`
}

// GetTags fetches all tags
func (c *Client) GetTags(ctx context.Context) ([]Tag, error) {
	var allTags []Tag
	page := 1

	for {
		path := fmt.Sprintf("/api/tags/?page=%d&page_size=100", page)

		body, err := c.doRequest(ctx, http.MethodGet, path, nil)
		if err != nil {
			return nil, err
		}

		var result TagList
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		allTags = append(allTags, result.Results...)

		if result.Next == nil {
			break
		}
		page++
	}

	return allTags, nil
}

// GetThumbnailURL returns the URL for a document's thumbnail
func (c *Client) GetThumbnailURL(documentID int) string {
	return fmt.Sprintf("%s/api/documents/%d/thumb/", c.baseURL, documentID)
}

// GetPreviewURL returns the URL for a document's preview
func (c *Client) GetPreviewURL(documentID int) string {
	return fmt.Sprintf("%s/api/documents/%d/preview/", c.baseURL, documentID)
}

// GetDownloadURL returns the URL for downloading a document
func (c *Client) GetDownloadURL(documentID int) string {
	return fmt.Sprintf("%s/api/documents/%d/download/", c.baseURL, documentID)
}

// ProxyThumbnail fetches a document thumbnail and returns the image data
func (c *Client) ProxyThumbnail(ctx context.Context, documentID int) ([]byte, string, error) {
	path := fmt.Sprintf("/api/documents/%d/thumb/", documentID)

	reqURL := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Token "+c.apiToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("failed to fetch thumbnail: status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/webp" // Paperless default
	}

	return data, contentType, nil
}

// ProxyPreview fetches a document preview and returns the data
func (c *Client) ProxyPreview(ctx context.Context, documentID int) ([]byte, string, error) {
	path := fmt.Sprintf("/api/documents/%d/preview/", documentID)

	reqURL := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Token "+c.apiToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("failed to fetch preview: status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/pdf"
	}

	return data, contentType, nil
}

// ProxyDownload fetches a document for download
func (c *Client) ProxyDownload(ctx context.Context, documentID int) ([]byte, string, string, error) {
	path := fmt.Sprintf("/api/documents/%d/download/", documentID)

	reqURL := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Token "+c.apiToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, "", "", fmt.Errorf("failed to fetch document: status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to read response: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Extract filename from Content-Disposition header
	filename := ""
	contentDisposition := resp.Header.Get("Content-Disposition")
	if contentDisposition != "" {
		// Parse filename from header like: attachment; filename="document.pdf"
		if strings.Contains(contentDisposition, "filename=") {
			parts := strings.Split(contentDisposition, "filename=")
			if len(parts) > 1 {
				filename = strings.Trim(parts[1], "\"")
			}
		}
	}

	return data, contentType, filename, nil
}

// GetBaseURL returns the base URL of the Paperless server
func (c *Client) GetBaseURL() string {
	return c.baseURL
}
