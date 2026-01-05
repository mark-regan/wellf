package yahoo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"sync"
	"time"
)

const (
	searchURL = "https://query2.finance.yahoo.com/v1/finance/search"
	chartURL  = "https://query1.finance.yahoo.com/v8/finance/chart"
	quoteURL  = "https://query1.finance.yahoo.com/v7/finance/quote"
	crumbURL  = "https://query1.finance.yahoo.com/v1/test/getcrumb"
	consentURL = "https://guce.yahoo.com/consent"
)

type Client struct {
	httpClient *http.Client
	crumb      string
	crumbMu    sync.RWMutex
	userAgent  string
}

func NewClient() *Client {
	jar, _ := cookiejar.New(nil)
	return &Client{
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
			Jar:     jar,
		},
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	}
}

// setHeaders sets browser-like headers on a request
func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Connection", "keep-alive")
}

// getCrumb fetches the Yahoo Finance crumb needed for authenticated requests
func (c *Client) getCrumb(ctx context.Context) (string, error) {
	c.crumbMu.RLock()
	if c.crumb != "" {
		crumb := c.crumb
		c.crumbMu.RUnlock()
		return crumb, nil
	}
	c.crumbMu.RUnlock()

	c.crumbMu.Lock()
	defer c.crumbMu.Unlock()

	// Double-check after acquiring write lock
	if c.crumb != "" {
		return c.crumb, nil
	}

	// First, visit finance.yahoo.com to get cookies
	financeReq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://finance.yahoo.com", nil)
	if err != nil {
		return "", err
	}
	financeReq.Header.Set("User-Agent", c.userAgent)
	financeReq.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := c.httpClient.Do(financeReq)
	if err != nil {
		return "", err
	}
	resp.Body.Close()

	// Now get the crumb
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, crumbURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Accept", "*/*")

	resp, err = c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to get crumb: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	c.crumb = string(body)
	return c.crumb, nil
}

// invalidateCrumb clears the cached crumb to force a refresh
func (c *Client) invalidateCrumb() {
	c.crumbMu.Lock()
	c.crumb = ""
	c.crumbMu.Unlock()
}

// SearchResult represents a Yahoo Finance search result
type SearchResult struct {
	Quotes []Quote `json:"quotes"`
}

type Quote struct {
	Symbol    string `json:"symbol"`
	ShortName string `json:"shortname"`
	LongName  string `json:"longname"`
	QuoteType string `json:"quoteType"`
	Exchange  string `json:"exchange"`
}

// Search searches for assets by term
func (c *Client) Search(ctx context.Context, term string) (*SearchResult, error) {
	reqURL := fmt.Sprintf("%s?q=%s", searchURL, url.QueryEscape(term))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result SearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// ChartResponse represents Yahoo Finance chart data
type ChartResponse struct {
	Chart struct {
		Result []ChartResult `json:"result"`
		Error  *ChartError   `json:"error"`
	} `json:"chart"`
}

type ChartResult struct {
	Meta       ChartMeta       `json:"meta"`
	Timestamp  []int64         `json:"timestamp"`
	Indicators ChartIndicators `json:"indicators"`
}

type ChartMeta struct {
	Currency           string  `json:"currency"`
	Symbol             string  `json:"symbol"`
	ShortName          string  `json:"shortName"`
	LongName           string  `json:"longName"`
	ExchangeName       string  `json:"exchangeName"`
	InstrumentType     string  `json:"instrumentType"`
	RegularMarketPrice float64 `json:"regularMarketPrice"`
	RegularMarketTime  int64   `json:"regularMarketTime"`
	PreviousClose      float64 `json:"previousClose"`
	ChartPreviousClose float64 `json:"chartPreviousClose"`
}

type ChartIndicators struct {
	Quote []ChartQuote `json:"quote"`
}

type ChartQuote struct {
	Open   []float64 `json:"open"`
	High   []float64 `json:"high"`
	Low    []float64 `json:"low"`
	Close  []float64 `json:"close"`
	Volume []int64   `json:"volume"`
}

type ChartError struct {
	Code        string `json:"code"`
	Description string `json:"description"`
}

// GetChart fetches chart data for a symbol
func (c *Client) GetChart(ctx context.Context, symbol string, period string, interval string) (*ChartResponse, error) {
	if period == "" {
		period = "1d"
	}
	if interval == "" {
		interval = "1d"
	}

	crumb, err := c.getCrumb(ctx)
	if err != nil {
		// Try without crumb - chart endpoint may work without it
		crumb = ""
	}

	reqURL := fmt.Sprintf("%s/%s?range=%s&interval=%s", chartURL, url.PathEscape(symbol), period, interval)
	if crumb != "" {
		reqURL += "&crumb=" + url.QueryEscape(crumb)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("rate limited by Yahoo Finance")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var result ChartResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Chart.Error != nil {
		return nil, fmt.Errorf("yahoo finance error: %s", result.Chart.Error.Description)
	}

	return &result, nil
}

// GetQuote fetches the current quote for a symbol
// Falls back to chart endpoint if quote endpoint fails
func (c *Client) GetQuote(ctx context.Context, symbol string) (*QuoteResponse, error) {
	// Use chart endpoint directly as it's more reliable without auth
	chart, err := c.GetChart(ctx, symbol, "1d", "1d")
	if err != nil {
		return nil, err
	}

	if len(chart.Chart.Result) == 0 {
		return nil, fmt.Errorf("no data for symbol: %s", symbol)
	}

	meta := chart.Chart.Result[0].Meta

	// Use name from meta, fallback to symbol
	shortName := meta.ShortName
	if shortName == "" {
		shortName = meta.Symbol
	}
	longName := meta.LongName
	if longName == "" {
		longName = shortName
	}

	// Use previousClose or chartPreviousClose for change calculation
	previousClose := meta.PreviousClose
	if previousClose == 0 {
		previousClose = meta.ChartPreviousClose
	}

	// Build a QuoteResponse from chart data
	result := &QuoteResponse{}
	result.QuoteResponse.Result = []QuoteResult{{
		Symbol:                     meta.Symbol,
		ShortName:                  shortName,
		LongName:                   longName,
		Currency:                   meta.Currency,
		Exchange:                   meta.ExchangeName,
		QuoteType:                  meta.InstrumentType,
		RegularMarketPrice:         meta.RegularMarketPrice,
		RegularMarketTime:          meta.RegularMarketTime,
		RegularMarketPreviousClose: previousClose,
	}}

	// Calculate change
	if previousClose > 0 {
		change := meta.RegularMarketPrice - previousClose
		changePct := (change / previousClose) * 100
		result.QuoteResponse.Result[0].RegularMarketChange = change
		result.QuoteResponse.Result[0].RegularMarketChangePercent = changePct
	}

	return result, nil
}

type QuoteResponse struct {
	QuoteResponse struct {
		Result []QuoteResult `json:"result"`
		Error  *QuoteError   `json:"error"`
	} `json:"quoteResponse"`
}

type QuoteResult struct {
	Symbol                     string  `json:"symbol"`
	ShortName                  string  `json:"shortName"`
	LongName                   string  `json:"longName"`
	Currency                   string  `json:"currency"`
	Exchange                   string  `json:"exchange"`
	QuoteType                  string  `json:"quoteType"`
	RegularMarketPrice         float64 `json:"regularMarketPrice"`
	RegularMarketTime          int64   `json:"regularMarketTime"`
	RegularMarketChange        float64 `json:"regularMarketChange"`
	RegularMarketChangePercent float64 `json:"regularMarketChangePercent"`
	RegularMarketPreviousClose float64 `json:"regularMarketPreviousClose"`
	FiftyTwoWeekHigh           float64 `json:"fiftyTwoWeekHigh"`
	FiftyTwoWeekLow            float64 `json:"fiftyTwoWeekLow"`
	MarketCap                  int64   `json:"marketCap"`
}

type QuoteError struct {
	Code        string `json:"code"`
	Description string `json:"description"`
}

// GetQuotes fetches quotes for multiple symbols
// Uses chart endpoint for reliability
func (c *Client) GetQuotes(ctx context.Context, symbols []string) ([]QuoteResult, error) {
	if len(symbols) == 0 {
		return nil, nil
	}

	results := make([]QuoteResult, 0, len(symbols))
	for _, symbol := range symbols {
		quote, err := c.GetQuote(ctx, symbol)
		if err != nil {
			// Log but continue with other symbols
			continue
		}
		if len(quote.QuoteResponse.Result) > 0 {
			results = append(results, quote.QuoteResponse.Result[0])
		}
	}

	return results, nil
}

// GetHistoricalPrice fetches the closing price for a specific date
func (c *Client) GetHistoricalPrice(ctx context.Context, symbol string, date time.Time) (float64, error) {
	// Set time to start of day and get a 5-day range to ensure we capture the date
	// (in case of weekends/holidays)
	startDate := date.AddDate(0, 0, -5)
	endDate := date.AddDate(0, 0, 1)

	period1 := startDate.Unix()
	period2 := endDate.Unix()

	crumb, _ := c.getCrumb(ctx)

	reqURL := fmt.Sprintf("%s/%s?period1=%d&period2=%d&interval=1d",
		chartURL, url.PathEscape(symbol), period1, period2)
	if crumb != "" {
		reqURL += "&crumb=" + url.QueryEscape(crumb)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var result ChartResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Chart.Error != nil {
		return 0, fmt.Errorf("yahoo finance error: %s", result.Chart.Error.Description)
	}

	if len(result.Chart.Result) == 0 {
		return 0, fmt.Errorf("no data for symbol: %s", symbol)
	}

	chartResult := result.Chart.Result[0]
	if len(chartResult.Timestamp) == 0 || len(chartResult.Indicators.Quote) == 0 {
		return 0, fmt.Errorf("no price data available for %s", symbol)
	}

	// Find the closest date to the requested date
	targetDate := date.Truncate(24 * time.Hour)
	var closestPrice float64
	var closestDiff int64 = 1<<63 - 1

	quotes := chartResult.Indicators.Quote[0]
	for i, ts := range chartResult.Timestamp {
		tsDate := time.Unix(ts, 0).Truncate(24 * time.Hour)
		diff := tsDate.Sub(targetDate)
		if diff < 0 {
			diff = -diff
		}

		if int64(diff) < closestDiff && i < len(quotes.Close) && quotes.Close[i] != 0 {
			closestDiff = int64(diff)
			closestPrice = quotes.Close[i]

			// Exact match found
			if diff == 0 {
				break
			}
		}
	}

	if closestPrice == 0 {
		return 0, fmt.Errorf("no price data found for date: %s", date.Format("2006-01-02"))
	}

	return closestPrice, nil
}

// extractCrumbFromHTML extracts crumb from Yahoo Finance HTML (fallback method)
func extractCrumbFromHTML(html string) string {
	re := regexp.MustCompile(`"crumb":"([^"]+)"`)
	matches := re.FindStringSubmatch(html)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}
