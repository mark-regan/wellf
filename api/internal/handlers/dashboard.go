package handlers

import (
	"net/http"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type DashboardHandler struct {
	portfolioRepo   *repository.PortfolioRepository
	holdingRepo     *repository.HoldingRepository
	transactionRepo *repository.TransactionRepository
	cashRepo        *repository.CashAccountRepository
	fixedAssetRepo  *repository.FixedAssetRepository
	userRepo        *repository.UserRepository
	yahooService    *services.YahooService
}

func NewDashboardHandler(
	portfolioRepo *repository.PortfolioRepository,
	holdingRepo *repository.HoldingRepository,
	transactionRepo *repository.TransactionRepository,
	cashRepo *repository.CashAccountRepository,
	fixedAssetRepo *repository.FixedAssetRepository,
	userRepo *repository.UserRepository,
	yahooService *services.YahooService,
) *DashboardHandler {
	return &DashboardHandler{
		portfolioRepo:   portfolioRepo,
		holdingRepo:     holdingRepo,
		transactionRepo: transactionRepo,
		cashRepo:        cashRepo,
		fixedAssetRepo:  fixedAssetRepo,
		userRepo:        userRepo,
		yahooService:    yahooService,
	}
}

func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	// Get all portfolios
	portfolios, err := h.portfolioRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolios")
		return
	}

	var investments float64
	var cashFromPortfolios float64
	var portfolioSummaries []models.PortfolioSummary

	for _, p := range portfolios {
		summary, err := h.portfolioRepo.GetSummary(r.Context(), p.ID)
		if err != nil {
			continue
		}
		// CASH and SAVINGS portfolio values go to cash, not investments
		if p.Type == models.PortfolioTypeCash || p.Type == models.PortfolioTypeSavings {
			cashFromPortfolios += summary.TotalValue
		} else {
			investments += summary.TotalValue
		}
		portfolioSummaries = append(portfolioSummaries, *summary)
	}

	// Get cash from cash_accounts (within investment portfolios)
	cashFromAccounts, err := h.cashRepo.GetTotalByUserID(r.Context(), userID)
	if err != nil {
		cashFromAccounts = 0
	}
	cashTotal := cashFromPortfolios + cashFromAccounts

	// Get fixed assets total
	fixedAssetsTotal, err := h.fixedAssetRepo.GetTotalByUserID(r.Context(), userID)
	if err != nil {
		fixedAssetsTotal = 0
	}

	summary := models.NetWorthSummary{
		TotalNetWorth:    investments + cashTotal + fixedAssetsTotal,
		Investments:      investments,
		Cash:             cashTotal,
		FixedAssets:      fixedAssetsTotal,
		Currency:         user.BaseCurrency,
		PortfolioSummary: portfolioSummaries,
	}

	JSON(w, http.StatusOK, summary)
}

func (h *DashboardHandler) Allocation(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	portfolios, err := h.portfolioRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolios")
		return
	}

	// Aggregate by asset type, currency, and portfolio
	byType := make(map[string]float64)
	byCurrency := make(map[string]float64)
	byPortfolio := make(map[string]float64)

	var totalValue float64

	var cashTotal float64

	for _, p := range portfolios {
		// For CASH/SAVINGS portfolios, get balance from transactions
		if p.Type == models.PortfolioTypeCash || p.Type == models.PortfolioTypeSavings {
			summary, err := h.portfolioRepo.GetSummary(r.Context(), p.ID)
			if err == nil && summary.TotalValue > 0 {
				cashTotal += summary.TotalValue
				totalValue += summary.TotalValue
				byPortfolio[p.Name] = summary.TotalValue
				byCurrency[p.Currency] += summary.TotalValue
			}
			continue
		}

		// For investment portfolios, get holdings
		holdings, err := h.holdingRepo.GetByPortfolioID(r.Context(), p.ID)
		if err != nil {
			continue
		}

		var portfolioValue float64
		for _, holding := range holdings {
			if holding.CurrentValue != nil {
				value := *holding.CurrentValue
				totalValue += value
				portfolioValue += value

				if holding.Asset != nil {
					byType[holding.Asset.AssetType] += value
					byCurrency[holding.Asset.Currency] += value
				}
			}
		}
		byPortfolio[p.Name] = portfolioValue
	}

	// Add cash from cash_accounts (within investment portfolios)
	cashFromAccounts, _ := h.cashRepo.GetTotalByUserID(r.Context(), userID)
	if cashFromAccounts > 0 {
		cashTotal += cashFromAccounts
		totalValue += cashFromAccounts
	}

	// Add total cash to byType
	if cashTotal > 0 {
		byType["CASH"] = cashTotal
	}

	// Add fixed assets
	fixedAssets, _ := h.fixedAssetRepo.GetByUserID(r.Context(), userID)
	for _, fa := range fixedAssets {
		byType[fa.Category] += fa.CurrentValue
		byCurrency[fa.Currency] += fa.CurrentValue
		totalValue += fa.CurrentValue
	}

	allocation := models.AssetAllocation{
		ByType:      mapToAllocationItems(byType, totalValue),
		ByCurrency:  mapToAllocationItems(byCurrency, totalValue),
		ByPortfolio: mapToAllocationItems(byPortfolio, totalValue),
	}

	JSON(w, http.StatusOK, allocation)
}

func mapToAllocationItems(m map[string]float64, total float64) []models.AllocationItem {
	items := make([]models.AllocationItem, 0, len(m))
	for name, value := range m {
		pct := 0.0
		if total > 0 {
			pct = (value / total) * 100
		}
		items = append(items, models.AllocationItem{
			Name:       name,
			Value:      value,
			Percentage: pct,
		})
	}
	return items
}

type TopMover struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Price     float64 `json:"price"`
	Change    float64 `json:"change"`
	ChangePct float64 `json:"change_pct"`
}

func (h *DashboardHandler) TopMovers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	portfolios, err := h.portfolioRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolios")
		return
	}

	// Collect all unique holdings
	holdingMap := make(map[uuid.UUID]*models.Holding)
	for _, p := range portfolios {
		holdings, err := h.holdingRepo.GetByPortfolioID(r.Context(), p.ID)
		if err != nil {
			continue
		}
		for _, h := range holdings {
			if _, exists := holdingMap[h.AssetID]; !exists {
				holdingMap[h.AssetID] = h
			}
		}
	}

	var gainers []TopMover
	var losers []TopMover

	for _, holding := range holdingMap {
		if holding.Asset == nil || holding.GainLossPct == nil {
			continue
		}

		mover := TopMover{
			Symbol:    holding.Asset.Symbol,
			Name:      holding.Asset.Name,
			ChangePct: *holding.GainLossPct,
		}
		if holding.Asset.LastPrice != nil {
			mover.Price = *holding.Asset.LastPrice
		}
		if holding.GainLoss != nil {
			mover.Change = *holding.GainLoss
		}

		if *holding.GainLossPct >= 0 {
			gainers = append(gainers, mover)
		} else {
			losers = append(losers, mover)
		}
	}

	// Sort and limit to top 5
	sortTopMovers(gainers, true)
	sortTopMovers(losers, false)

	if len(gainers) > 5 {
		gainers = gainers[:5]
	}
	if len(losers) > 5 {
		losers = losers[:5]
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"gainers": gainers,
		"losers":  losers,
	})
}

func sortTopMovers(movers []TopMover, ascending bool) {
	for i := 0; i < len(movers); i++ {
		for j := i + 1; j < len(movers); j++ {
			if ascending {
				if movers[i].ChangePct < movers[j].ChangePct {
					movers[i], movers[j] = movers[j], movers[i]
				}
			} else {
				if movers[i].ChangePct > movers[j].ChangePct {
					movers[i], movers[j] = movers[j], movers[i]
				}
			}
		}
	}
}

// PerformanceDataPoint represents a single point in the performance chart
type PerformanceDataPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

// PortfolioPerformance contains performance data for a single portfolio
type PortfolioPerformance struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	DataPoints []PerformanceDataPoint `json:"data_points"`
	StartValue float64                `json:"start_value"`
	EndValue   float64                `json:"end_value"`
	Change     float64                `json:"change"`
	ChangePct  float64                `json:"change_pct"`
}

// PerformanceResponse contains the performance data for charting
type PerformanceResponse struct {
	Period     string                 `json:"period"`
	DataPoints []PerformanceDataPoint `json:"data_points"`
	StartValue float64                `json:"start_value"`
	EndValue   float64                `json:"end_value"`
	Change     float64                `json:"change"`
	ChangePct  float64                `json:"change_pct"`
	Portfolios []PortfolioPerformance `json:"portfolios,omitempty"`
}

// Performance returns historical portfolio valuations for charting
func (h *DashboardHandler) Performance(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "daily"
	}

	portfolioIDStr := r.URL.Query().Get("portfolio_id")
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	// Determine date range and interval based on period
	var startDate, endDate time.Time
	var yahooPeriod string
	now := time.Now()

	// Parse custom end date if provided
	if endDateStr != "" {
		parsedEnd, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid end_date format. Use YYYY-MM-DD")
			return
		}
		endDate = parsedEnd
	} else {
		endDate = now
	}

	// Parse custom start date if provided, otherwise calculate from period
	if startDateStr != "" {
		parsedStart, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid start_date format. Use YYYY-MM-DD")
			return
		}
		startDate = parsedStart
	} else {
		switch period {
		case "daily":
			startDate = endDate.AddDate(0, 0, -30)
		case "weekly":
			startDate = endDate.AddDate(0, -6, 0) // 26 weeks = ~6 months
		case "monthly":
			startDate = endDate.AddDate(-2, 0, 0) // 2 years
		case "yearly":
			startDate = endDate.AddDate(-10, 0, 0) // 10 years
		default:
			Error(w, http.StatusBadRequest, "Invalid period. Use: daily, weekly, monthly, yearly")
			return
		}
	}

	// Calculate the Yahoo period based on the date range
	daysDiff := int(endDate.Sub(startDate).Hours() / 24)
	switch {
	case daysDiff <= 30:
		yahooPeriod = "1mo"
	case daysDiff <= 180:
		yahooPeriod = "6mo"
	case daysDiff <= 365:
		yahooPeriod = "1y"
	case daysDiff <= 730:
		yahooPeriod = "2y"
	case daysDiff <= 1825:
		yahooPeriod = "5y"
	default:
		yahooPeriod = "10y"
	}

	// Validate period
	switch period {
	case "daily", "weekly", "monthly", "yearly":
		// valid
	default:
		Error(w, http.StatusBadRequest, "Invalid period. Use: daily, weekly, monthly, yearly")
		return
	}

	// Get portfolios
	portfolios, err := h.portfolioRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch portfolios")
		return
	}

	// Filter to specific portfolio if requested
	if portfolioIDStr != "" {
		portfolioID, err := uuid.Parse(portfolioIDStr)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid portfolio ID")
			return
		}
		var filtered []*models.Portfolio
		for _, p := range portfolios {
			if p.ID == portfolioID {
				filtered = append(filtered, p)
				break
			}
		}
		if len(filtered) == 0 {
			Error(w, http.StatusForbidden, "Access denied")
			return
		}
		portfolios = filtered
	}

	// Collect all holdings grouped by portfolio
	type portfolioHoldings struct {
		portfolio    *models.Portfolio
		holdings     []*models.Holding
		cashBalance  float64
	}
	var allPortfolioHoldings []portfolioHoldings
	var totalCashBalance float64

	for _, p := range portfolios {
		holdings, err := h.holdingRepo.GetByPortfolioID(r.Context(), p.ID)
		if err != nil {
			holdings = nil
		}

		// Get cash balance for this portfolio from cash_accounts
		var cashBalance float64
		cashAccounts, err := h.cashRepo.GetByPortfolioID(r.Context(), p.ID)
		if err == nil {
			for _, ca := range cashAccounts {
				cashBalance += ca.Balance
			}
		}
		totalCashBalance += cashBalance

		// Include portfolio if it has holdings OR cash
		if len(holdings) > 0 || cashBalance > 0 {
			allPortfolioHoldings = append(allPortfolioHoldings, portfolioHoldings{
				portfolio:   p,
				holdings:    holdings,
				cashBalance: cashBalance,
			})
		}
	}

	if len(allPortfolioHoldings) == 0 {
		JSON(w, http.StatusOK, PerformanceResponse{
			Period:     period,
			DataPoints: []PerformanceDataPoint{},
		})
		return
	}

	// Collect all unique symbols across all portfolios
	allSymbols := make(map[string]bool)
	for _, ph := range allPortfolioHoldings {
		for _, holding := range ph.holdings {
			if holding.Asset != nil {
				allSymbols[holding.Asset.Symbol] = true
			}
		}
	}

	// Fetch historical prices for each symbol
	symbolPrices := make(map[string]map[string]float64) // symbol -> date -> price
	for symbol := range allSymbols {
		history, err := h.yahooService.GetHistory(r.Context(), symbol, yahooPeriod)
		if err != nil {
			continue
		}

		priceMap := make(map[string]float64)
		for _, hp := range history {
			// Skip invalid prices (0 or negative)
			if hp.Close <= 0 {
				continue
			}
			dateKey := getDateKey(hp.Date, period)
			// Only keep the last price for each date key (end of period)
			priceMap[dateKey] = hp.Close
		}
		symbolPrices[symbol] = priceMap
	}

	// Collect all dates from price data
	allDates := make(map[string]bool)
	for _, priceMap := range symbolPrices {
		for dateKey := range priceMap {
			allDates[dateKey] = true
		}
	}

	// If we have cash but no price data, generate date keys for the range
	if len(allDates) == 0 && totalCashBalance > 0 {
		current := startDate
		for !current.After(endDate) {
			dateKey := getDateKey(current, period)
			allDates[dateKey] = true
			switch period {
			case "daily":
				current = current.AddDate(0, 0, 1)
			case "weekly":
				current = current.AddDate(0, 0, 7)
			case "monthly":
				current = current.AddDate(0, 1, 0)
			case "yearly":
				current = current.AddDate(1, 0, 0)
			default:
				current = current.AddDate(0, 0, 1)
			}
		}
	}

	// Sort all dates for forward-fill processing
	sortedDates := make([]string, 0, len(allDates))
	for dateKey := range allDates {
		sortedDates = append(sortedDates, dateKey)
	}
	sort.Strings(sortedDates)

	// Calculate performance for each portfolio
	var portfolioPerformances []PortfolioPerformance
	totalDateValues := make(map[string]float64)

	for _, ph := range allPortfolioHoldings {
		// Build symbol quantities for this portfolio
		symbolQuantities := make(map[string]float64)
		for _, holding := range ph.holdings {
			if holding.Asset != nil {
				symbolQuantities[holding.Asset.Symbol] += holding.Quantity
			}
		}

		// Track last known prices for forward-fill (per symbol)
		// Pre-populate with the first available price for each symbol (for backward-fill of early dates)
		lastKnownPrice := make(map[string]float64)
		for symbol := range symbolQuantities {
			if priceMap, ok := symbolPrices[symbol]; ok {
				// Find the earliest price for this symbol
				for _, dateKey := range sortedDates {
					if price, ok := priceMap[dateKey]; ok {
						lastKnownPrice[symbol] = price
						break
					}
				}
			}
		}

		// Calculate value for each date (in sorted order for forward-fill)
		dateValues := make(map[string]float64)
		for _, dateKey := range sortedDates {
			var totalValue float64
			for symbol, quantity := range symbolQuantities {
				if priceMap, ok := symbolPrices[symbol]; ok {
					if price, ok := priceMap[dateKey]; ok {
						// Use actual price and update last known
						totalValue += quantity * price
						lastKnownPrice[symbol] = price
					} else if lastPrice, ok := lastKnownPrice[symbol]; ok {
						// No price for this date, use last known price (forward/backward-fill)
						totalValue += quantity * lastPrice
					}
					// If no price and no last known, contribution is 0 (symbol has no data at all)
				}
			}
			// Add cash balance (constant across all dates since we don't have historical cash data)
			totalValue += ph.cashBalance
			if totalValue > 0 {
				dateValues[dateKey] = totalValue
				totalDateValues[dateKey] += totalValue
			}
		}

		// Convert to sorted data points
		var dataPoints []PerformanceDataPoint
		for dateKey, value := range dateValues {
			dataPoints = append(dataPoints, PerformanceDataPoint{
				Date:  dateKey,
				Value: value,
			})
		}

		// Sort by date
		sort.Slice(dataPoints, func(i, j int) bool {
			return dataPoints[i].Date < dataPoints[j].Date
		})

		// Filter to only include dates within the date range
		startDateKey := getDateKey(startDate, period)
		endDateKey := getDateKey(endDate, period)
		var filteredPoints []PerformanceDataPoint
		for _, dp := range dataPoints {
			if dp.Date >= startDateKey && dp.Date <= endDateKey {
				filteredPoints = append(filteredPoints, dp)
			}
		}
		dataPoints = filteredPoints

		// Calculate change for this portfolio
		var pStartValue, pEndValue, pChange, pChangePct float64
		if len(dataPoints) > 0 {
			pStartValue = dataPoints[0].Value
			pEndValue = dataPoints[len(dataPoints)-1].Value
			pChange = pEndValue - pStartValue
			if pStartValue > 0 {
				pChangePct = (pChange / pStartValue) * 100
			}
		}

		portfolioPerformances = append(portfolioPerformances, PortfolioPerformance{
			ID:         ph.portfolio.ID.String(),
			Name:       ph.portfolio.Name,
			DataPoints: dataPoints,
			StartValue: pStartValue,
			EndValue:   pEndValue,
			Change:     pChange,
			ChangePct:  pChangePct,
		})
	}

	// Calculate total data points
	var totalDataPoints []PerformanceDataPoint
	for dateKey, value := range totalDateValues {
		totalDataPoints = append(totalDataPoints, PerformanceDataPoint{
			Date:  dateKey,
			Value: value,
		})
	}

	// Sort by date
	sort.Slice(totalDataPoints, func(i, j int) bool {
		return totalDataPoints[i].Date < totalDataPoints[j].Date
	})

	// Filter to only include dates within the date range
	startDateKey := getDateKey(startDate, period)
	endDateKey := getDateKey(endDate, period)
	var filteredTotalPoints []PerformanceDataPoint
	for _, dp := range totalDataPoints {
		if dp.Date >= startDateKey && dp.Date <= endDateKey {
			filteredTotalPoints = append(filteredTotalPoints, dp)
		}
	}
	totalDataPoints = filteredTotalPoints

	// Calculate total change
	var startValue, endValue, change, changePct float64
	if len(totalDataPoints) > 0 {
		startValue = totalDataPoints[0].Value
		endValue = totalDataPoints[len(totalDataPoints)-1].Value
		change = endValue - startValue
		if startValue > 0 {
			changePct = (change / startValue) * 100
		}
	}

	response := PerformanceResponse{
		Period:     period,
		DataPoints: totalDataPoints,
		StartValue: startValue,
		EndValue:   endValue,
		Change:     change,
		ChangePct:  changePct,
	}

	// Only include individual portfolios when viewing all (no specific portfolio selected)
	if portfolioIDStr == "" && len(portfolioPerformances) > 1 {
		response.Portfolios = portfolioPerformances
	}

	JSON(w, http.StatusOK, response)
}

// getDateKey returns a date key based on the period
func getDateKey(t time.Time, period string) string {
	switch period {
	case "daily":
		return t.Format("2006-01-02")
	case "weekly":
		// Get the end of the week (Sunday)
		weekday := int(t.Weekday())
		daysUntilSunday := (7 - weekday) % 7
		endOfWeek := t.AddDate(0, 0, daysUntilSunday)
		return endOfWeek.Format("2006-01-02")
	case "monthly":
		// End of month
		year, month, _ := t.Date()
		firstOfNextMonth := time.Date(year, month+1, 1, 0, 0, 0, 0, t.Location())
		endOfMonth := firstOfNextMonth.AddDate(0, 0, -1)
		return endOfMonth.Format("2006-01")
	case "yearly":
		return t.Format("2006")
	default:
		return t.Format("2006-01-02")
	}
}
