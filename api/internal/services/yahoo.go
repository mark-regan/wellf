package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/mark-regan/wellf/internal/database"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/yahoo"
)

type YahooService struct {
	client    *yahoo.Client
	assetRepo *repository.AssetRepository
	redis     *database.RedisClient
	cacheTTL  time.Duration
	logger    *slog.Logger
}

func NewYahooService(
	client *yahoo.Client,
	assetRepo *repository.AssetRepository,
	redis *database.RedisClient,
	cacheTTL time.Duration,
	logger *slog.Logger,
) *YahooService {
	return &YahooService{
		client:    client,
		assetRepo: assetRepo,
		redis:     redis,
		cacheTTL:  cacheTTL,
		logger:    logger,
	}
}

type AssetSearchResult struct {
	Symbol    string `json:"symbol"`
	Name      string `json:"name"`
	Exchange  string `json:"exchange"`
	QuoteType string `json:"quote_type"`
}

func (s *YahooService) Search(ctx context.Context, term string) ([]AssetSearchResult, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("yahoo:search:%s", term)
	cached, err := s.redis.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var results []AssetSearchResult
		if err := json.Unmarshal([]byte(cached), &results); err == nil {
			return results, nil
		}
	}

	// Fetch from Yahoo Finance
	result, err := s.client.Search(ctx, term)
	if err != nil {
		s.logger.Error("yahoo search failed", "error", err, "term", term)
		return nil, err
	}

	results := make([]AssetSearchResult, 0, len(result.Quotes))
	for _, q := range result.Quotes {
		name := q.LongName
		if name == "" {
			name = q.ShortName
		}
		results = append(results, AssetSearchResult{
			Symbol:    q.Symbol,
			Name:      name,
			Exchange:  q.Exchange,
			QuoteType: q.QuoteType,
		})
	}

	// Cache results
	if data, err := json.Marshal(results); err == nil {
		_ = s.redis.Set(ctx, cacheKey, string(data), 5*time.Minute)
	}

	return results, nil
}

type AssetDetails struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Exchange  string  `json:"exchange"`
	Currency  string  `json:"currency"`
	QuoteType string  `json:"quote_type"`
	Price     float64 `json:"price"`
	Change    float64 `json:"change"`
	ChangePct float64 `json:"change_pct"`
}

func (s *YahooService) GetAssetDetails(ctx context.Context, symbol string) (*AssetDetails, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("yahoo:quote:%s", symbol)
	cached, err := s.redis.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var details AssetDetails
		if err := json.Unmarshal([]byte(cached), &details); err == nil {
			return &details, nil
		}
	}

	// Fetch from Yahoo Finance
	quote, err := s.client.GetQuote(ctx, symbol)
	if err != nil {
		s.logger.Error("yahoo quote failed", "error", err, "symbol", symbol)
		return nil, err
	}

	if len(quote.QuoteResponse.Result) == 0 {
		return nil, fmt.Errorf("no quote data for symbol: %s", symbol)
	}

	q := quote.QuoteResponse.Result[0]
	name := q.LongName
	if name == "" {
		name = q.ShortName
	}

	details := &AssetDetails{
		Symbol:    q.Symbol,
		Name:      name,
		Exchange:  q.Exchange,
		Currency:  q.Currency,
		QuoteType: q.QuoteType,
		Price:     q.RegularMarketPrice,
		Change:    q.RegularMarketChange,
		ChangePct: q.RegularMarketChangePercent,
	}

	// Cache result
	if data, err := json.Marshal(details); err == nil {
		_ = s.redis.Set(ctx, cacheKey, string(data), s.cacheTTL)
	}

	// Update asset in database if it exists
	_ = s.assetRepo.UpdatePrice(ctx, symbol, q.RegularMarketPrice)

	return details, nil
}

func (s *YahooService) GetPrice(ctx context.Context, symbol string) (float64, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("yahoo:price:%s", symbol)
	cached, err := s.redis.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var price float64
		if err := json.Unmarshal([]byte(cached), &price); err == nil {
			return price, nil
		}
	}

	// Fetch from Yahoo Finance
	details, err := s.GetAssetDetails(ctx, symbol)
	if err != nil {
		// Try to get from database as fallback
		asset, dbErr := s.assetRepo.GetBySymbol(ctx, symbol)
		if dbErr == nil && asset.LastPrice != nil {
			return *asset.LastPrice, nil
		}
		return 0, err
	}

	// Cache price
	if data, err := json.Marshal(details.Price); err == nil {
		_ = s.redis.Set(ctx, cacheKey, string(data), s.cacheTTL)
	}

	return details.Price, nil
}

func (s *YahooService) RefreshPrices(ctx context.Context, symbols []string) error {
	if len(symbols) == 0 {
		return nil
	}

	quotes, err := s.client.GetQuotes(ctx, symbols)
	if err != nil {
		s.logger.Error("yahoo quotes refresh failed", "error", err)
		return err
	}

	prices := make(map[string]float64)
	for _, q := range quotes {
		prices[q.Symbol] = q.RegularMarketPrice

		// Cache individual price
		cacheKey := fmt.Sprintf("yahoo:price:%s", q.Symbol)
		if data, err := json.Marshal(q.RegularMarketPrice); err == nil {
			_ = s.redis.Set(ctx, cacheKey, string(data), s.cacheTTL)
		}
	}

	// Update all prices in database
	return s.assetRepo.UpdatePrices(ctx, prices)
}

type PriceHistory struct {
	Date   time.Time `json:"date"`
	Open   float64   `json:"open"`
	High   float64   `json:"high"`
	Low    float64   `json:"low"`
	Close  float64   `json:"close"`
	Volume int64     `json:"volume"`
}

func (s *YahooService) GetHistory(ctx context.Context, symbol string, period string) ([]PriceHistory, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("yahoo:history:%s:%s", symbol, period)
	cached, err := s.redis.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var history []PriceHistory
		if err := json.Unmarshal([]byte(cached), &history); err == nil {
			return history, nil
		}
	}

	interval := "1d"
	switch period {
	case "1d":
		interval = "5m"
	case "5d":
		interval = "15m"
	case "1mo":
		interval = "1h"
	case "3mo", "6mo", "1y":
		interval = "1d"
	case "5y", "max":
		interval = "1wk"
	}

	chart, err := s.client.GetChart(ctx, symbol, period, interval)
	if err != nil {
		return nil, err
	}

	if len(chart.Chart.Result) == 0 {
		return nil, fmt.Errorf("no chart data for symbol: %s", symbol)
	}

	result := chart.Chart.Result[0]
	if len(result.Indicators.Quote) == 0 {
		return nil, fmt.Errorf("no quote data in chart for symbol: %s", symbol)
	}

	quote := result.Indicators.Quote[0]
	history := make([]PriceHistory, 0, len(result.Timestamp))

	for i, ts := range result.Timestamp {
		if i >= len(quote.Close) {
			break
		}

		h := PriceHistory{
			Date:  time.Unix(ts, 0),
			Close: quote.Close[i],
		}

		if i < len(quote.Open) {
			h.Open = quote.Open[i]
		}
		if i < len(quote.High) {
			h.High = quote.High[i]
		}
		if i < len(quote.Low) {
			h.Low = quote.Low[i]
		}
		if i < len(quote.Volume) {
			h.Volume = quote.Volume[i]
		}

		history = append(history, h)
	}

	// Cache result
	if data, err := json.Marshal(history); err == nil {
		ttl := s.cacheTTL
		if period == "1d" {
			ttl = 1 * time.Minute
		}
		_ = s.redis.Set(ctx, cacheKey, string(data), ttl)
	}

	return history, nil
}

func (s *YahooService) GetOrCreateAsset(ctx context.Context, symbol string) (*models.Asset, error) {
	// Check if asset exists
	existing, err := s.assetRepo.GetBySymbol(ctx, symbol)
	if err == nil {
		return existing, nil
	}

	// Fetch details from Yahoo Finance
	details, err := s.GetAssetDetails(ctx, symbol)
	if err != nil {
		return nil, err
	}

	assetType := mapQuoteTypeToAssetType(details.QuoteType)

	asset := &models.Asset{
		Symbol:     details.Symbol,
		Name:       details.Name,
		AssetType:  assetType,
		Exchange:   details.Exchange,
		Currency:   details.Currency,
		DataSource: "YAHOO",
		LastPrice:  &details.Price,
	}

	createdAsset, err := s.assetRepo.GetOrCreate(ctx, asset)
	if err != nil {
		return nil, err
	}

	return createdAsset, nil
}

// GetHistoricalPrice fetches the closing price for a specific date
func (s *YahooService) GetHistoricalPrice(ctx context.Context, symbol string, date time.Time) (float64, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("yahoo:historical:%s:%s", symbol, date.Format("2006-01-02"))
	cached, err := s.redis.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var price float64
		if err := json.Unmarshal([]byte(cached), &price); err == nil {
			return price, nil
		}
	}

	// Fetch from Yahoo Finance
	price, err := s.client.GetHistoricalPrice(ctx, symbol, date)
	if err != nil {
		s.logger.Error("yahoo historical price failed", "error", err, "symbol", symbol, "date", date)
		return 0, err
	}

	// Cache result for 24 hours (historical data doesn't change)
	if data, err := json.Marshal(price); err == nil {
		_ = s.redis.Set(ctx, cacheKey, string(data), 24*time.Hour)
	}

	return price, nil
}

func mapQuoteTypeToAssetType(quoteType string) string {
	switch quoteType {
	case "EQUITY":
		return models.AssetTypeStock
	case "ETF":
		return models.AssetTypeETF
	case "MUTUALFUND":
		return models.AssetTypeFund
	case "CRYPTOCURRENCY":
		return models.AssetTypeCrypto
	default:
		return models.AssetTypeStock
	}
}
