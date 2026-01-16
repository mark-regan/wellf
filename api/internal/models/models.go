package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a registered user
type User struct {
	ID           uuid.UUID  `json:"id"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"`
	DisplayName  string     `json:"display_name,omitempty"`
	BaseCurrency string     `json:"base_currency"`
	DateFormat   string     `json:"date_format"`
	Locale       string     `json:"locale"`
	FireTarget   *float64   `json:"fire_target,omitempty"`
	FireEnabled  bool       `json:"fire_enabled"`
	// New preference fields
	Theme             string     `json:"theme"`
	PhoneNumber       string     `json:"phone_number,omitempty"`
	DateOfBirth       *time.Time `json:"date_of_birth,omitempty"`
	NotifyEmail       bool       `json:"notify_email"`
	NotifyPriceAlerts bool       `json:"notify_price_alerts"`
	NotifyWeekly      bool       `json:"notify_weekly"`
	NotifyMonthly     bool       `json:"notify_monthly"`
	Watchlist         string     `json:"watchlist,omitempty"`
	ProviderLists     string     `json:"provider_lists,omitempty"`
	// Admin fields
	IsAdmin  bool `json:"is_admin"`
	IsLocked bool `json:"is_locked"`
	// Timestamps
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

// Portfolio types
const (
	PortfolioTypeGIA         = "GIA"
	PortfolioTypeISA         = "ISA"
	PortfolioTypeSIPP        = "SIPP"
	PortfolioTypeLISA        = "LISA"
	PortfolioTypeJISA        = "JISA"
	PortfolioTypeCrypto      = "CRYPTO"
	PortfolioTypeSavings     = "SAVINGS"
	PortfolioTypeCash        = "CASH"
	PortfolioTypeFixedAssets = "FIXED_ASSETS"
)

// ISA sub-types
const (
	ISATypeStocksAndShares = "STOCKS_AND_SHARES"
	ISATypeCash            = "CASH"
)

// Savings account types
const (
	SavingsTypeEasyAccess = "EASY_ACCESS"
	SavingsTypeNotice     = "NOTICE"
	SavingsTypeFixedTerm  = "FIXED_TERM"
	SavingsTypeRegular    = "REGULAR_SAVER"
)

// Crypto wallet types
const (
	CryptoWalletExchange = "EXCHANGE"
	CryptoWalletHardware = "HARDWARE"
	CryptoWalletSoftware = "SOFTWARE"
)

// SIPP tax relief types
const (
	SIPPReliefAtSource = "RELIEF_AT_SOURCE"
	SIPPNetPay         = "NET_PAY"
)

// LISA purpose types
const (
	LISAPurposeFirstHome  = "FIRST_HOME"
	LISAPurposeRetirement = "RETIREMENT"
)

// Portfolio represents an investment portfolio
type Portfolio struct {
	ID          uuid.UUID          `json:"id"`
	UserID      uuid.UUID          `json:"user_id"`
	Name        string             `json:"name"`
	Type        string             `json:"type"`
	Currency    string             `json:"currency"`
	Description string             `json:"description,omitempty"`
	IsActive    bool               `json:"is_active"`
	Metadata    *PortfolioMetadata `json:"metadata,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// PortfolioMetadata contains type-specific portfolio information
type PortfolioMetadata struct {
	// Common fields
	Provider         string  `json:"provider,omitempty"`
	AccountReference string  `json:"account_reference,omitempty"`
	InterestRate     float64 `json:"interest_rate,omitempty"`

	// ISA/JISA specific
	ISAType     string `json:"isa_type,omitempty"` // STOCKS_AND_SHARES or CASH
	TaxYear     string `json:"tax_year,omitempty"` // e.g., "2024/25"
	ChildName   string `json:"child_name,omitempty"`
	ChildDOB    string `json:"child_dob,omitempty"`
	ContactName string `json:"contact_name,omitempty"`

	// SIPP specific
	TaxReliefType       string  `json:"tax_relief_type,omitempty"` // RELIEF_AT_SOURCE or NET_PAY
	CrystallisedAmount  float64 `json:"crystallised_amount,omitempty"`
	TargetRetirementAge int     `json:"target_retirement_age,omitempty"`

	// LISA specific
	LISAPurpose string `json:"lisa_purpose,omitempty"` // FIRST_HOME or RETIREMENT

	// Savings specific
	SavingsType  string `json:"savings_type,omitempty"` // EASY_ACCESS, NOTICE, FIXED_TERM, REGULAR_SAVER
	NoticePeriod int    `json:"notice_period,omitempty"` // days
	MaturityDate string `json:"maturity_date,omitempty"`
	FSCSProtected bool   `json:"fscs_protected,omitempty"`

	// Crypto specific
	WalletType string `json:"wallet_type,omitempty"` // EXCHANGE, HARDWARE, SOFTWARE
	WalletName string `json:"wallet_name,omitempty"`

	// Cash specific (bank accounts)
	BankName    string `json:"bank_name,omitempty"`
	AccountType string `json:"account_type,omitempty"` // CURRENT, SAVINGS

	// Contribution tracking
	ContributionsThisYear float64 `json:"contributions_this_year,omitempty"`
	ContributionLimit     float64 `json:"contribution_limit,omitempty"`
}

// Asset types
const (
	AssetTypeStock  = "STOCK"
	AssetTypeETF    = "ETF"
	AssetTypeFund   = "FUND"
	AssetTypeCrypto = "CRYPTO"
	AssetTypeBond   = "BOND"
)

// Asset represents a tradeable security
type Asset struct {
	ID                 uuid.UUID  `json:"id"`
	Symbol             string     `json:"symbol"`
	Name               string     `json:"name"`
	AssetType          string     `json:"asset_type"`
	Exchange           string     `json:"exchange,omitempty"`
	Currency           string     `json:"currency"`
	DataSource         string     `json:"data_source"`
	LastPrice          *float64   `json:"last_price,omitempty"`
	LastPriceUpdatedAt *time.Time `json:"last_price_updated_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

// Holding represents a current position in a portfolio
type Holding struct {
	ID          uuid.UUID  `json:"id"`
	PortfolioID uuid.UUID  `json:"portfolio_id"`
	AssetID     uuid.UUID  `json:"asset_id"`
	Quantity    float64    `json:"quantity"`
	AverageCost float64    `json:"average_cost"`
	PurchasedAt *time.Time `json:"purchased_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Joined fields
	Asset        *Asset   `json:"asset,omitempty"`
	CurrentValue *float64 `json:"current_value,omitempty"`
	GainLoss     *float64 `json:"gain_loss,omitempty"`
	GainLossPct  *float64 `json:"gain_loss_pct,omitempty"`
}

// HoldingWithPortfolio includes portfolio details for aggregated views
type HoldingWithPortfolio struct {
	ID          uuid.UUID  `json:"id"`
	PortfolioID uuid.UUID  `json:"portfolio_id"`
	AssetID     uuid.UUID  `json:"asset_id"`
	Quantity    float64    `json:"quantity"`
	AverageCost float64    `json:"average_cost"`
	PurchasedAt *time.Time `json:"purchased_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Joined fields
	Asset         *Asset   `json:"asset,omitempty"`
	CurrentValue  *float64 `json:"current_value,omitempty"`
	GainLoss      *float64 `json:"gain_loss,omitempty"`
	GainLossPct   *float64 `json:"gain_loss_pct,omitempty"`
	PortfolioName string   `json:"portfolio_name"`
	PortfolioType string   `json:"portfolio_type"`
}

// Transaction types
const (
	TransactionTypeBuy         = "BUY"
	TransactionTypeSell        = "SELL"
	TransactionTypeDividend    = "DIVIDEND"
	TransactionTypeInterest    = "INTEREST"
	TransactionTypeFee         = "FEE"
	TransactionTypeTransferIn  = "TRANSFER_IN"
	TransactionTypeTransferOut = "TRANSFER_OUT"
	TransactionTypeDeposit     = "DEPOSIT"
	TransactionTypeWithdrawal  = "WITHDRAWAL"
)

// Transaction represents a buy, sell, or other transaction
type Transaction struct {
	ID              uuid.UUID  `json:"id"`
	PortfolioID     uuid.UUID  `json:"portfolio_id"`
	AssetID         *uuid.UUID `json:"asset_id,omitempty"`
	TransactionType string     `json:"transaction_type"`
	Quantity        *float64   `json:"quantity,omitempty"`
	Price           *float64   `json:"price,omitempty"`
	TotalAmount     float64    `json:"total_amount"`
	Currency        string     `json:"currency"`
	TransactionDate time.Time  `json:"transaction_date"`
	Notes           string     `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`

	// Joined fields
	Asset *Asset `json:"asset,omitempty"`
}

// Cash account types
const (
	CashAccountTypeCurrent     = "CURRENT"
	CashAccountTypeSavings     = "SAVINGS"
	CashAccountTypeMoneyMarket = "MONEY_MARKET"
)

// CashAccount represents a cash or savings account
type CashAccount struct {
	ID           uuid.UUID  `json:"id"`
	PortfolioID  uuid.UUID  `json:"portfolio_id"`
	AccountName  string     `json:"account_name"`
	AccountType  string     `json:"account_type"`
	Institution  string     `json:"institution,omitempty"`
	Balance      float64    `json:"balance"`
	Currency     string     `json:"currency"`
	InterestRate *float64   `json:"interest_rate,omitempty"`
	LastUpdated  time.Time  `json:"last_updated"`
	CreatedAt    time.Time  `json:"created_at"`
}

// Fixed asset categories
const (
	FixedAssetCategoryProperty    = "PROPERTY"
	FixedAssetCategoryVehicle     = "VEHICLE"
	FixedAssetCategoryCollectible = "COLLECTIBLE"
	FixedAssetCategoryOther       = "OTHER"
)

// FixedAsset represents a non-tradeable asset like property
type FixedAsset struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	Name           string     `json:"name"`
	Category       string     `json:"category"`
	Description    string     `json:"description,omitempty"`
	PurchaseDate   *time.Time `json:"purchase_date,omitempty"`
	PurchasePrice  *float64   `json:"purchase_price,omitempty"`
	CurrentValue   float64    `json:"current_value"`
	Currency       string     `json:"currency"`
	ValuationDate  *time.Time `json:"valuation_date,omitempty"`
	ValuationNotes string     `json:"valuation_notes,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	// Computed fields
	Appreciation    *float64 `json:"appreciation,omitempty"`
	AppreciationPct *float64 `json:"appreciation_pct,omitempty"`
}

// PriceHistory stores historical prices for an asset
type PriceHistory struct {
	ID         uuid.UUID `json:"id"`
	AssetID    uuid.UUID `json:"asset_id"`
	PriceDate  time.Time `json:"price_date"`
	OpenPrice  *float64  `json:"open_price,omitempty"`
	HighPrice  *float64  `json:"high_price,omitempty"`
	LowPrice   *float64  `json:"low_price,omitempty"`
	ClosePrice float64   `json:"close_price"`
	Volume     *int64    `json:"volume,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// ExchangeRate stores currency exchange rates
type ExchangeRate struct {
	ID           uuid.UUID `json:"id"`
	FromCurrency string    `json:"from_currency"`
	ToCurrency   string    `json:"to_currency"`
	Rate         float64   `json:"rate"`
	RateDate     time.Time `json:"rate_date"`
	CreatedAt    time.Time `json:"created_at"`
}

// Dashboard summary types
type NetWorthSummary struct {
	TotalNetWorth    float64            `json:"total_net_worth"`
	Investments      float64            `json:"investments"`
	Cash             float64            `json:"cash"`
	FixedAssets      float64            `json:"fixed_assets"`
	Currency         string             `json:"currency"`
	ChangeDay        float64            `json:"change_day"`
	ChangeWeek       float64            `json:"change_week"`
	ChangeMonth      float64            `json:"change_month"`
	ChangeYear       float64            `json:"change_year"`
	PortfolioSummary []PortfolioSummary `json:"portfolio_summary"`
}

type PortfolioSummary struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Type           string    `json:"type"`
	TotalValue     float64   `json:"total_value"`
	TotalCost      float64   `json:"total_cost"`
	UnrealisedGain float64   `json:"unrealised_gain"`
	UnrealisedPct  float64   `json:"unrealised_pct"`
	HoldingsCount  int       `json:"holdings_count"`
}

type AllocationItem struct {
	Name       string  `json:"name"`
	Value      float64 `json:"value"`
	Percentage float64 `json:"percentage"`
}

type AssetAllocation struct {
	ByType      []AllocationItem `json:"by_type"`
	ByCurrency  []AllocationItem `json:"by_currency"`
	ByPortfolio []AllocationItem `json:"by_portfolio"`
}

// Hub domain constants
const (
	DomainFinance   = "finance"
	DomainCooking   = "cooking"
	DomainBooks     = "books"
	DomainPlants    = "plants"
	DomainCode      = "code"
	DomainHousehold = "household"
)

// Activity action constants
const (
	ActionCreated   = "created"
	ActionUpdated   = "updated"
	ActionDeleted   = "deleted"
	ActionCompleted = "completed"
)

// ActivityLog represents a cross-domain activity entry
type ActivityLog struct {
	ID          uuid.UUID              `json:"id"`
	UserID      uuid.UUID              `json:"user_id"`
	Domain      string                 `json:"domain"`
	Action      string                 `json:"action"`
	EntityType  string                 `json:"entity_type"`
	EntityID    *uuid.UUID             `json:"entity_id,omitempty"`
	EntityName  string                 `json:"entity_name,omitempty"`
	Description string                 `json:"description,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}

// DomainSummary contains summary data for a single domain on the hub
type DomainSummary struct {
	Domain      string  `json:"domain"`
	Title       string  `json:"title"`
	Icon        string  `json:"icon"`
	Value       string  `json:"value"`
	Subtitle    string  `json:"subtitle"`
	Link        string  `json:"link"`
	IsAvailable bool    `json:"is_available"`
	Metric      float64 `json:"metric,omitempty"`
}

// HubSummary contains the full hub summary response
type HubSummary struct {
	DisplayName string          `json:"display_name"`
	Domains     []DomainSummary `json:"domains"`
}

// UpcomingReminder represents an upcoming event or reminder
type UpcomingReminder struct {
	ID          uuid.UUID  `json:"id"`
	Domain      string     `json:"domain"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	DueDate     time.Time  `json:"due_date"`
	EntityType  string     `json:"entity_type,omitempty"`
	EntityID    *uuid.UUID `json:"entity_id,omitempty"`
}

// =============================================================================
// Cooking Module Models
// =============================================================================

// Recipe course types
const (
	CourseStarter = "starter"
	CourseMain    = "main"
	CourseDessert = "dessert"
	CourseSide    = "side"
	CourseSnack   = "snack"
	CourseDrink   = "drink"
)

// Meal types for meal planning
const (
	MealTypeBreakfast = "breakfast"
	MealTypeLunch     = "lunch"
	MealTypeDinner    = "dinner"
	MealTypeSnack     = "snack"
)

// Shopping list categories
const (
	ShoppingCategoryProduce = "produce"
	ShoppingCategoryDairy   = "dairy"
	ShoppingCategoryMeat    = "meat"
	ShoppingCategoryBakery  = "bakery"
	ShoppingCategoryFrozen  = "frozen"
	ShoppingCategoryPantry  = "pantry"
	ShoppingCategoryOther   = "other"
)

// Ingredient represents a single ingredient in a recipe
type Ingredient struct {
	Amount string `json:"amount,omitempty"`
	Unit   string `json:"unit,omitempty"`
	Name   string `json:"name"`
	Group  string `json:"group,omitempty"`
	Notes  string `json:"notes,omitempty"`
}

// Instruction represents a single step in recipe instructions
type Instruction struct {
	Step     int    `json:"step"`
	Text     string `json:"text"`
	ImageURL string `json:"image_url,omitempty"`
}

// Nutrition contains nutritional information for a recipe
type Nutrition struct {
	Calories      string `json:"calories,omitempty"`
	Protein       string `json:"protein,omitempty"`
	Carbohydrates string `json:"carbohydrates,omitempty"`
	Fat           string `json:"fat,omitempty"`
	Fiber         string `json:"fiber,omitempty"`
	Sugar         string `json:"sugar,omitempty"`
	Sodium        string `json:"sodium,omitempty"`
}

// Recipe represents a cooking recipe
type Recipe struct {
	ID               uuid.UUID     `json:"id"`
	UserID           uuid.UUID     `json:"user_id"`
	Title            string        `json:"title"`
	Description      string        `json:"description,omitempty"`
	SourceURL        string        `json:"source_url,omitempty"`
	SourceName       string        `json:"source_name,omitempty"`
	ImageURL         string        `json:"image_url,omitempty"`
	PrepTimeMinutes  *int          `json:"prep_time_minutes,omitempty"`
	CookTimeMinutes  *int          `json:"cook_time_minutes,omitempty"`
	TotalTimeMinutes *int          `json:"total_time_minutes,omitempty"`
	Servings         *int          `json:"servings,omitempty"`
	ServingsUnit     string        `json:"servings_unit,omitempty"`
	Ingredients      []Ingredient  `json:"ingredients"`
	Instructions     []Instruction `json:"instructions"`
	Cuisine          string        `json:"cuisine,omitempty"`
	Course           string        `json:"course,omitempty"`
	DietTags         []string      `json:"diet_tags,omitempty"`
	CustomTags       []string      `json:"custom_tags,omitempty"`
	Rating           *int          `json:"rating,omitempty"`
	Notes            string        `json:"notes,omitempty"`
	IsFavourite      bool          `json:"is_favourite"`
	TimesCooked      int           `json:"times_cooked"`
	LastCookedAt     *time.Time    `json:"last_cooked_at,omitempty"`
	Nutrition        *Nutrition    `json:"nutrition,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
}

// RecipeCollection represents a collection/folder of recipes
type RecipeCollection struct {
	ID            uuid.UUID `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description,omitempty"`
	CoverImageURL string    `json:"cover_image_url,omitempty"`
	IsDefault     bool      `json:"is_default"`
	RecipeCount   int       `json:"recipe_count,omitempty"` // Computed field
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// RecipeCollectionItem represents the many-to-many relationship
type RecipeCollectionItem struct {
	ID           uuid.UUID `json:"id"`
	CollectionID uuid.UUID `json:"collection_id"`
	RecipeID     uuid.UUID `json:"recipe_id"`
	SortOrder    int       `json:"sort_order"`
	AddedAt      time.Time `json:"added_at"`
}

// MealPlan represents a planned meal for a specific date
type MealPlan struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	PlanDate   time.Time  `json:"plan_date"`
	MealType   string     `json:"meal_type"`
	RecipeID   *uuid.UUID `json:"recipe_id,omitempty"`
	CustomMeal string     `json:"custom_meal,omitempty"`
	Servings   int        `json:"servings"`
	Notes      string     `json:"notes,omitempty"`
	IsCooked   bool       `json:"is_cooked"`
	CreatedAt  time.Time  `json:"created_at"`

	// Joined field
	Recipe *Recipe `json:"recipe,omitempty"`
}

// ShoppingListItem represents an item on the shopping list
type ShoppingListItem struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	IngredientName string     `json:"ingredient_name"`
	Amount         string     `json:"amount,omitempty"`
	Unit           string     `json:"unit,omitempty"`
	Category       string     `json:"category,omitempty"`
	RecipeID       *uuid.UUID `json:"recipe_id,omitempty"`
	MealPlanID     *uuid.UUID `json:"meal_plan_id,omitempty"`
	IsChecked      bool       `json:"is_checked"`
	SortOrder      int        `json:"sort_order"`
	CreatedAt      time.Time  `json:"created_at"`

	// Joined field
	RecipeName string `json:"recipe_name,omitempty"`
}

// CookingSummary represents the summary for the cooking domain on the hub
type CookingSummary struct {
	TotalRecipes     int        `json:"total_recipes"`
	FavouriteRecipes int        `json:"favourite_recipes"`
	RecipesThisWeek  int        `json:"recipes_this_week"`
	LastCooked       *Recipe    `json:"last_cooked,omitempty"`
	MealPlansToday   []MealPlan `json:"meal_plans_today,omitempty"`
}

// RecipeMatch represents a recipe with ingredient matching information
type RecipeMatch struct {
	Recipe           *Recipe `json:"recipe"`
	MatchingCount    int     `json:"matching_count"`
	TotalIngredients int     `json:"total_ingredients"`
}

// SearchByIngredientsRequest is the request body for ingredient-based search
type SearchByIngredientsRequest struct {
	Ingredients []string `json:"ingredients" validate:"required,min=1"`
	Limit       int      `json:"limit,omitempty"`
}

// CreateRecipeRequest is the request body for creating a recipe
type CreateRecipeRequest struct {
	Title            string        `json:"title" validate:"required"`
	Description      string        `json:"description"`
	SourceURL        string        `json:"source_url"`
	SourceName       string        `json:"source_name"`
	ImageURL         string        `json:"image_url"`
	PrepTimeMinutes  *int          `json:"prep_time_minutes"`
	CookTimeMinutes  *int          `json:"cook_time_minutes"`
	TotalTimeMinutes *int          `json:"total_time_minutes"`
	Servings         *int          `json:"servings"`
	ServingsUnit     string        `json:"servings_unit"`
	Ingredients      []Ingredient  `json:"ingredients"`
	Instructions     []Instruction `json:"instructions"`
	Cuisine          string        `json:"cuisine"`
	Course           string        `json:"course"`
	DietTags         []string      `json:"diet_tags"`
	CustomTags       []string      `json:"custom_tags"`
	Notes            string        `json:"notes"`
}

// UpdateRecipeRequest is the request body for updating a recipe
type UpdateRecipeRequest struct {
	Title            *string       `json:"title"`
	Description      *string       `json:"description"`
	SourceURL        *string       `json:"source_url"`
	SourceName       *string       `json:"source_name"`
	ImageURL         *string       `json:"image_url"`
	PrepTimeMinutes  *int          `json:"prep_time_minutes"`
	CookTimeMinutes  *int          `json:"cook_time_minutes"`
	TotalTimeMinutes *int          `json:"total_time_minutes"`
	Servings         *int          `json:"servings"`
	ServingsUnit     *string       `json:"servings_unit"`
	Ingredients      []Ingredient  `json:"ingredients"`
	Instructions     []Instruction `json:"instructions"`
	Cuisine          *string       `json:"cuisine"`
	Course           *string       `json:"course"`
	DietTags         []string      `json:"diet_tags"`
	CustomTags       []string      `json:"custom_tags"`
	Rating           *int          `json:"rating"`
	Notes            *string       `json:"notes"`
	IsFavourite      *bool         `json:"is_favourite"`
}

// ScrapeRecipeRequest is the request body for scraping a recipe from URL
type ScrapeRecipeRequest struct {
	URL string `json:"url" validate:"required,url"`
}

// ScrapedRecipe is the response from the recipe scraper service
type ScrapedRecipe struct {
	Title        string            `json:"title"`
	Description  string            `json:"description,omitempty"`
	ImageURL     string            `json:"image_url,omitempty"`
	Ingredients  []string          `json:"ingredients"`
	Instructions []string          `json:"instructions"`
	PrepTime     *int              `json:"prep_time,omitempty"`
	CookTime     *int              `json:"cook_time,omitempty"`
	TotalTime    *int              `json:"total_time,omitempty"`
	Yields       string            `json:"yields,omitempty"`
	Nutrients    map[string]string `json:"nutrients,omitempty"`
	SourceURL    string            `json:"source_url"`
}

// CreateCollectionRequest is the request body for creating a collection
type CreateCollectionRequest struct {
	Name          string `json:"name" validate:"required"`
	Description   string `json:"description"`
	CoverImageURL string `json:"cover_image_url"`
}

// CreateMealPlanRequest is the request body for creating a meal plan entry
type CreateMealPlanRequest struct {
	PlanDate   string     `json:"plan_date" validate:"required"` // YYYY-MM-DD
	MealType   string     `json:"meal_type" validate:"required"`
	RecipeID   *uuid.UUID `json:"recipe_id"`
	CustomMeal string     `json:"custom_meal"`
	Servings   int        `json:"servings"`
	Notes      string     `json:"notes"`
}

// AddShoppingItemRequest is the request body for adding a shopping list item
type AddShoppingItemRequest struct {
	IngredientName string     `json:"ingredient_name" validate:"required"`
	Amount         string     `json:"amount"`
	Unit           string     `json:"unit"`
	Category       string     `json:"category"`
	RecipeID       *uuid.UUID `json:"recipe_id"`
}

// GenerateShoppingListRequest is the request body for generating shopping list from meal plans
type GenerateShoppingListRequest struct {
	StartDate string `json:"start_date" validate:"required"` // YYYY-MM-DD
	EndDate   string `json:"end_date" validate:"required"`   // YYYY-MM-DD
}

// =============================================================================
// Reading Module Models
// =============================================================================

// Book format types
const (
	BookFormatPhysical  = "physical"
	BookFormatEbook     = "ebook"
	BookFormatAudiobook = "audiobook"
)

// Reading list types
const (
	ReadingListTypeToRead  = "to_read"
	ReadingListTypeReading = "reading"
	ReadingListTypeRead    = "read"
	ReadingListTypeCustom  = "custom"
)

// Book represents a book in the user's library
type Book struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	GoogleBooksID string     `json:"google_books_id,omitempty"`
	ISBN10        string     `json:"isbn_10,omitempty"`
	ISBN13        string     `json:"isbn_13,omitempty"`
	Title         string     `json:"title"`
	Subtitle      string     `json:"subtitle,omitempty"`
	Authors       []string   `json:"authors"`
	Publisher     string     `json:"publisher,omitempty"`
	PublishedDate string     `json:"published_date,omitempty"`
	Description   string     `json:"description,omitempty"`
	PageCount     *int       `json:"page_count,omitempty"`
	Categories    []string   `json:"categories,omitempty"`
	Language      string     `json:"language,omitempty"`
	ThumbnailURL  string     `json:"thumbnail_url,omitempty"`
	Format        string     `json:"format,omitempty"`
	Owned         bool       `json:"owned"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ReadingList represents a reading list (to-read, reading, read, or custom)
type ReadingList struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	ListType    string    `json:"list_type"`
	IsDefault   bool      `json:"is_default"`
	SortOrder   int       `json:"sort_order"`
	BookCount   int       `json:"book_count,omitempty"` // Computed field
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ReadingListBook represents a book in a reading list with progress
type ReadingListBook struct {
	ID            uuid.UUID  `json:"id"`
	ReadingListID uuid.UUID  `json:"reading_list_id"`
	BookID        uuid.UUID  `json:"book_id"`
	CurrentPage   int        `json:"current_page"`
	ProgressPct   int        `json:"progress_percent"`
	DateAdded     time.Time  `json:"date_added"`
	DateStarted   *time.Time `json:"date_started,omitempty"`
	DateFinished  *time.Time `json:"date_finished,omitempty"`
	Rating        *int       `json:"rating,omitempty"`
	Review        string     `json:"review,omitempty"`
	ReviewDate    *time.Time `json:"review_date,omitempty"`
	SortOrder     int        `json:"sort_order"`

	// Joined field
	Book *Book `json:"book,omitempty"`
}

// ReadingGoal represents a yearly reading goal
type ReadingGoal struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Year        int       `json:"year"`
	TargetBooks int       `json:"target_books"`
	BooksRead   int       `json:"books_read,omitempty"` // Computed field
	CreatedAt   time.Time `json:"created_at"`
}

// ReadingSummary represents the summary for the reading domain on the hub
type ReadingSummary struct {
	TotalBooks       int              `json:"total_books"`
	CurrentlyReading int              `json:"currently_reading"`
	BooksThisYear    int              `json:"books_this_year"`
	YearlyGoal       *ReadingGoal     `json:"yearly_goal,omitempty"`
	RecentlyFinished []ReadingListBook `json:"recently_finished,omitempty"`
}

// ReadingStats represents detailed reading statistics
type ReadingStats struct {
	TotalBooksRead     int                `json:"total_books_read"`
	TotalPagesRead     int                `json:"total_pages_read"`
	BooksReadByYear    []YearlyBookCount  `json:"books_read_by_year"`
	BooksReadByMonth   []MonthlyBookCount `json:"books_read_by_month"`
	GenreBreakdown     []GenreCount       `json:"genre_breakdown"`
	AuthorStats        []AuthorCount      `json:"author_stats"`
	AverageRating      float64            `json:"average_rating"`
	AveragePageCount   int                `json:"average_page_count"`
	AverageBooksPerMonth float64          `json:"average_books_per_month"`
	LongestBook        *BookStat          `json:"longest_book,omitempty"`
	ShortestBook       *BookStat          `json:"shortest_book,omitempty"`
}

// YearlyBookCount represents books read in a year
type YearlyBookCount struct {
	Year  int `json:"year"`
	Count int `json:"count"`
	Pages int `json:"pages"`
}

// MonthlyBookCount represents books read in a month
type MonthlyBookCount struct {
	Year  int    `json:"year"`
	Month int    `json:"month"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

// GenreCount represents books in a genre
type GenreCount struct {
	Genre string `json:"genre"`
	Count int    `json:"count"`
}

// AuthorCount represents books by an author
type AuthorCount struct {
	Author string `json:"author"`
	Count  int    `json:"count"`
}

// BookStat represents a book statistic
type BookStat struct {
	Title     string `json:"title"`
	Authors   string `json:"authors"`
	PageCount int    `json:"page_count"`
}

// GoogleBooksVolume represents a book from Google Books API
type GoogleBooksVolume struct {
	ID         string                   `json:"id"`
	VolumeInfo GoogleBooksVolumeInfo    `json:"volumeInfo"`
	SaleInfo   *GoogleBooksSaleInfo     `json:"saleInfo,omitempty"`
}

// GoogleBooksVolumeInfo contains book details from Google Books
type GoogleBooksVolumeInfo struct {
	Title               string   `json:"title"`
	Subtitle            string   `json:"subtitle,omitempty"`
	Authors             []string `json:"authors,omitempty"`
	Publisher           string   `json:"publisher,omitempty"`
	PublishedDate       string   `json:"publishedDate,omitempty"`
	Description         string   `json:"description,omitempty"`
	PageCount           int      `json:"pageCount,omitempty"`
	Categories          []string `json:"categories,omitempty"`
	Language            string   `json:"language,omitempty"`
	ImageLinks          *GoogleBooksImageLinks `json:"imageLinks,omitempty"`
	IndustryIdentifiers []GoogleBooksIdentifier `json:"industryIdentifiers,omitempty"`
}

// GoogleBooksImageLinks contains image URLs from Google Books
type GoogleBooksImageLinks struct {
	SmallThumbnail string `json:"smallThumbnail,omitempty"`
	Thumbnail      string `json:"thumbnail,omitempty"`
}

// GoogleBooksIdentifier contains ISBN identifiers
type GoogleBooksIdentifier struct {
	Type       string `json:"type"`
	Identifier string `json:"identifier"`
}

// GoogleBooksSaleInfo contains sale information
type GoogleBooksSaleInfo struct {
	Country     string `json:"country,omitempty"`
	IsEbook     bool   `json:"isEbook,omitempty"`
	BuyLink     string `json:"buyLink,omitempty"`
}

// GoogleBooksSearchResult represents a search response from Google Books API
type GoogleBooksSearchResult struct {
	TotalItems int                  `json:"totalItems"`
	Items      []GoogleBooksVolume  `json:"items,omitempty"`
}

// CreateBookRequest is the request body for adding a book
type CreateBookRequest struct {
	GoogleBooksID string   `json:"google_books_id"`
	ISBN10        string   `json:"isbn_10"`
	ISBN13        string   `json:"isbn_13"`
	Title         string   `json:"title" validate:"required"`
	Subtitle      string   `json:"subtitle"`
	Authors       []string `json:"authors"`
	Publisher     string   `json:"publisher"`
	PublishedDate string   `json:"published_date"`
	Description   string   `json:"description"`
	PageCount     *int     `json:"page_count"`
	Categories    []string `json:"categories"`
	Language      string   `json:"language"`
	ThumbnailURL  string   `json:"thumbnail_url"`
	Format        string   `json:"format"`
	Owned         bool     `json:"owned"`
}

// UpdateBookRequest is the request body for updating a book
type UpdateBookRequest struct {
	Title         *string  `json:"title"`
	Subtitle      *string  `json:"subtitle"`
	Authors       []string `json:"authors"`
	Publisher     *string  `json:"publisher"`
	PublishedDate *string  `json:"published_date"`
	Description   *string  `json:"description"`
	PageCount     *int     `json:"page_count"`
	Categories    []string `json:"categories"`
	ThumbnailURL  *string  `json:"thumbnail_url"`
	Format        *string  `json:"format"`
	Owned         *bool    `json:"owned"`
}

// CreateReadingListRequest is the request body for creating a reading list
type CreateReadingListRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
}

// AddBookToListRequest is the request body for adding a book to a list
type AddBookToListRequest struct {
	BookID uuid.UUID `json:"book_id" validate:"required"`
}

// UpdateReadingProgressRequest is the request body for updating reading progress
type UpdateReadingProgressRequest struct {
	CurrentPage  *int       `json:"current_page"`
	ProgressPct  *int       `json:"progress_percent"`
	DateStarted  *time.Time `json:"date_started"`
	DateFinished *time.Time `json:"date_finished"`
	Rating       *int       `json:"rating"`
	Review       *string    `json:"review"`
}

// SetReadingGoalRequest is the request body for setting a reading goal
type SetReadingGoalRequest struct {
	Year        int `json:"year" validate:"required"`
	TargetBooks int `json:"target_books" validate:"required,min=1"`
}

// GoodreadsImportResult represents the result of a Goodreads CSV import
type GoodreadsImportResult struct {
	BooksImported int      `json:"books_imported"`
	BooksSkipped  int      `json:"books_skipped"`
	BooksUpdated  int      `json:"books_updated"`
	Errors        []string `json:"errors,omitempty"`
}

// =============================================================================
// Plants Module
// =============================================================================

// Plant health status constants
const (
	PlantHealthThriving   = "thriving"
	PlantHealthHealthy    = "healthy"
	PlantHealthFair       = "fair"
	PlantHealthStruggling = "struggling"
	PlantHealthCritical   = "critical"
)

// Plant light requirement constants
const (
	PlantLightLow            = "low"
	PlantLightMedium         = "medium"
	PlantLightBrightIndirect = "bright_indirect"
	PlantLightDirect         = "direct"
)

// Plant humidity preference constants
const (
	PlantHumidityLow    = "low"
	PlantHumidityMedium = "medium"
	PlantHumidityHigh   = "high"
)

// Plant care type constants
const (
	PlantCareTypeWatered    = "watered"
	PlantCareTypeFertilized = "fertilized"
	PlantCareTypePruned     = "pruned"
	PlantCareTypeRepotted   = "repotted"
	PlantCareTypeTreated    = "treated"
	PlantCareTypeMisted     = "misted"
	PlantCareTypeRotated    = "rotated"
	PlantCareTypeCleaned    = "cleaned"
)

// Plant represents a user's plant
type Plant struct {
	ID                      uuid.UUID  `json:"id"`
	UserID                  uuid.UUID  `json:"user_id"`
	Name                    string     `json:"name"`
	Species                 string     `json:"species,omitempty"`
	Variety                 string     `json:"variety,omitempty"`
	Nickname                string     `json:"nickname,omitempty"`
	Room                    string     `json:"room,omitempty"`
	LocationDetail          string     `json:"location_detail,omitempty"`
	PhotoURL                string     `json:"photo_url,omitempty"`
	AcquiredDate            *time.Time `json:"acquired_date,omitempty"`
	AcquiredFrom            string     `json:"acquired_from,omitempty"`
	PurchasePrice           *float64   `json:"purchase_price,omitempty"`
	WateringFrequencyDays   int        `json:"watering_frequency_days"`
	LightRequirement        string     `json:"light_requirement"`
	HumidityPreference      string     `json:"humidity_preference"`
	FertilizingFrequencyDays *int      `json:"fertilizing_frequency_days,omitempty"`
	LastFertilizedAt        *time.Time `json:"last_fertilized_at,omitempty"`
	HealthStatus            string     `json:"health_status"`
	IsActive                bool       `json:"is_active"`
	LastWateredAt           *time.Time `json:"last_watered_at,omitempty"`
	LastRepottedAt          *time.Time `json:"last_repotted_at,omitempty"`
	LastPrunedAt            *time.Time `json:"last_pruned_at,omitempty"`
	NextWaterDate           *time.Time `json:"next_water_date,omitempty"`
	NextFertilizeDate       *time.Time `json:"next_fertilize_date,omitempty"`
	Notes                   string     `json:"notes,omitempty"`
	CareNotes               string     `json:"care_notes,omitempty"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`

	// Computed fields
	DaysUntilWater int `json:"days_until_water,omitempty"`
	DaysSinceWater int `json:"days_since_water,omitempty"`
}

// PlantCareLog represents a care activity log for a plant
type PlantCareLog struct {
	ID        uuid.UUID `json:"id"`
	PlantID   uuid.UUID `json:"plant_id"`
	UserID    uuid.UUID `json:"user_id"`
	CareType  string    `json:"care_type"`
	CareDate  time.Time `json:"care_date"`
	Notes     string    `json:"notes,omitempty"`
	PhotoURL  string    `json:"photo_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`

	// Joined field
	PlantName string `json:"plant_name,omitempty"`
}

// PlantHealthLog represents a health observation for a plant
type PlantHealthLog struct {
	ID           uuid.UUID `json:"id"`
	PlantID      uuid.UUID `json:"plant_id"`
	UserID       uuid.UUID `json:"user_id"`
	LogDate      time.Time `json:"log_date"`
	HealthStatus string    `json:"health_status"`
	Observations []string  `json:"observations,omitempty"`
	ActionsTaken []string  `json:"actions_taken,omitempty"`
	Notes        string    `json:"notes,omitempty"`
	PhotoURL     string    `json:"photo_url,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// PlantPhoto represents a photo in a plant's gallery
type PlantPhoto struct {
	ID               uuid.UUID  `json:"id"`
	PlantID          uuid.UUID  `json:"plant_id"`
	UserID           uuid.UUID  `json:"user_id"`
	Filename         string     `json:"filename"`
	OriginalFilename string     `json:"original_filename,omitempty"`
	ContentType      string     `json:"content_type"`
	FileSize         int        `json:"file_size,omitempty"`
	PhotoURL         string     `json:"photo_url"`
	ThumbnailURL     string     `json:"thumbnail_url,omitempty"`
	TakenAt          time.Time  `json:"taken_at"`
	Caption          string     `json:"caption,omitempty"`
	IsPrimary        bool       `json:"is_primary"`
	PhotoType        string     `json:"photo_type"` // general, growth, problem, treatment, milestone
	CreatedAt        time.Time  `json:"created_at"`
}

// Plant photo type constants
const (
	PlantPhotoTypeGeneral   = "general"
	PlantPhotoTypeGrowth    = "growth"
	PlantPhotoTypeProblem   = "problem"
	PlantPhotoTypeTreatment = "treatment"
	PlantPhotoTypeMilestone = "milestone"
)

// CreatePlantPhotoRequest is the request body for uploading a plant photo
type CreatePlantPhotoRequest struct {
	Caption   string `json:"caption"`
	PhotoType string `json:"photo_type"`
	IsPrimary bool   `json:"is_primary"`
	TakenAt   string `json:"taken_at,omitempty"` // ISO date string
}

// PlantSummary represents the summary for the plants domain on the hub
type PlantSummary struct {
	TotalPlants        int            `json:"total_plants"`
	NeedingWater       int            `json:"needing_water"`
	NeedingWaterPlants []Plant        `json:"needing_water_plants,omitempty"`
	HealthyCount       int            `json:"healthy_count"`
	NeedsAttention     int            `json:"needs_attention"`
	RecentCareLogs     []PlantCareLog `json:"recent_care_logs,omitempty"`
}

// PlantsByRoom groups plants by their room location
type PlantsByRoom struct {
	Room   string  `json:"room"`
	Plants []Plant `json:"plants"`
	Count  int     `json:"count"`
}

// CreatePlantRequest is the request body for creating a plant
type CreatePlantRequest struct {
	Name                    string     `json:"name" validate:"required"`
	Species                 string     `json:"species"`
	Variety                 string     `json:"variety"`
	Nickname                string     `json:"nickname"`
	Room                    string     `json:"room"`
	LocationDetail          string     `json:"location_detail"`
	PhotoURL                string     `json:"photo_url"`
	AcquiredDate            *time.Time `json:"acquired_date"`
	AcquiredFrom            string     `json:"acquired_from"`
	PurchasePrice           *float64   `json:"purchase_price"`
	WateringFrequencyDays   int        `json:"watering_frequency_days"`
	LightRequirement        string     `json:"light_requirement"`
	HumidityPreference      string     `json:"humidity_preference"`
	FertilizingFrequencyDays *int      `json:"fertilizing_frequency_days"`
	Notes                   string     `json:"notes"`
	CareNotes               string     `json:"care_notes"`
}

// UpdatePlantRequest is the request body for updating a plant
type UpdatePlantRequest struct {
	Name                    *string    `json:"name"`
	Species                 *string    `json:"species"`
	Variety                 *string    `json:"variety"`
	Nickname                *string    `json:"nickname"`
	Room                    *string    `json:"room"`
	LocationDetail          *string    `json:"location_detail"`
	PhotoURL                *string    `json:"photo_url"`
	AcquiredDate            *time.Time `json:"acquired_date"`
	AcquiredFrom            *string    `json:"acquired_from"`
	PurchasePrice           *float64   `json:"purchase_price"`
	WateringFrequencyDays   *int       `json:"watering_frequency_days"`
	LightRequirement        *string    `json:"light_requirement"`
	HumidityPreference      *string    `json:"humidity_preference"`
	FertilizingFrequencyDays *int      `json:"fertilizing_frequency_days"`
	HealthStatus            *string    `json:"health_status"`
	IsActive                *bool      `json:"is_active"`
	Notes                   *string    `json:"notes"`
	CareNotes               *string    `json:"care_notes"`
}

// LogCareRequest is the request body for logging plant care
type LogCareRequest struct {
	CareType string     `json:"care_type" validate:"required"`
	CareDate *time.Time `json:"care_date"`
	Notes    string     `json:"notes"`
	PhotoURL string     `json:"photo_url"`
}

// LogHealthRequest is the request body for logging plant health
type LogHealthRequest struct {
	HealthStatus string    `json:"health_status" validate:"required"`
	LogDate      *time.Time `json:"log_date"`
	Observations []string  `json:"observations"`
	ActionsTaken []string  `json:"actions_taken"`
	Notes        string    `json:"notes"`
	PhotoURL     string    `json:"photo_url"`
}

// WaterMultipleRequest is the request body for watering multiple plants
type WaterMultipleRequest struct {
	PlantIDs []uuid.UUID `json:"plant_ids" validate:"required"`
	Notes    string      `json:"notes"`
}

// =============================================================================
// Coding Module
// =============================================================================

// Template type constants
const (
	TemplateTypeGitHub = "github_template"
	TemplateTypeGist   = "gist"
	TemplateTypeLocal  = "local"
)

// Template category constants
const (
	TemplateCategoryWeb     = "web"
	TemplateCategoryAPI     = "api"
	TemplateCategoryCLI     = "cli"
	TemplateCategoryLibrary = "library"
	TemplateCategoryOther   = "other"
)

// Common programming languages
var CommonLanguages = []string{
	"JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "C#", "C++",
	"Ruby", "PHP", "Swift", "Kotlin", "Scala", "Haskell", "Elixir", "Clojure",
	"Shell", "Bash", "PowerShell", "SQL", "HTML", "CSS", "SCSS", "JSON", "YAML",
	"Markdown", "Dockerfile", "Terraform", "GraphQL",
}

// GitHubConfig represents user's GitHub configuration
type GitHubConfig struct {
	ID                uuid.UUID `json:"id"`
	UserID            uuid.UUID `json:"user_id"`
	GitHubUsername    string    `json:"github_username"`
	GitHubToken       string    `json:"-"` // Never expose in JSON
	HasToken          bool      `json:"has_token"`
	DefaultVisibility string    `json:"default_visibility"`
	ShowArchived      bool      `json:"show_archived"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// CodeSnippet represents a code snippet
type CodeSnippet struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Language    string    `json:"language,omitempty"`
	Filename    string    `json:"filename,omitempty"`
	Code        string    `json:"code"`
	Tags        []string  `json:"tags,omitempty"`
	IsFavourite bool      `json:"is_favourite"`
	IsPublic    bool      `json:"is_public"`
	SourceURL   string    `json:"source_url,omitempty"`
	SourceRepo  string    `json:"source_repo,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TemplateFile represents a file in a local template
type TemplateFile struct {
	Filename string `json:"filename"`
	Content  string `json:"content"`
	Language string `json:"language,omitempty"`
}

// TemplateVariable represents a variable in a template
type TemplateVariable struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Default     string `json:"default,omitempty"`
	Required    bool   `json:"required"`
}

// ProjectTemplate represents a project template
type ProjectTemplate struct {
	ID                  uuid.UUID          `json:"id"`
	UserID              uuid.UUID          `json:"user_id"`
	Name                string             `json:"name"`
	Description         string             `json:"description,omitempty"`
	TemplateType        string             `json:"template_type"`
	GitHubTemplateRepo  string             `json:"github_template_repo,omitempty"`
	GitHubTemplateOwner string             `json:"github_template_owner,omitempty"`
	Files               []TemplateFile     `json:"files,omitempty"`
	SetupCommands       []string           `json:"setup_commands,omitempty"`
	DefaultBranch       string             `json:"default_branch"`
	Variables           []TemplateVariable `json:"variables,omitempty"`
	Category            string             `json:"category,omitempty"`
	Tags                []string           `json:"tags,omitempty"`
	CreatedAt           time.Time          `json:"created_at"`
	UpdatedAt           time.Time          `json:"updated_at"`
}

// GitHubRepo represents a cached GitHub repository
type GitHubRepo struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	GitHubID        int64      `json:"github_id"`
	Name            string     `json:"name"`
	FullName        string     `json:"full_name"`
	Description     string     `json:"description,omitempty"`
	HTMLURL         string     `json:"html_url"`
	CloneURL        string     `json:"clone_url,omitempty"`
	SSHURL          string     `json:"ssh_url,omitempty"`
	Language        string     `json:"language,omitempty"`
	StargazersCount int        `json:"stargazers_count"`
	ForksCount      int        `json:"forks_count"`
	OpenIssuesCount int        `json:"open_issues_count"`
	IsPrivate       bool       `json:"is_private"`
	IsFork          bool       `json:"is_fork"`
	IsArchived      bool       `json:"is_archived"`
	IsTemplate      bool       `json:"is_template"`
	DefaultBranch   string     `json:"default_branch"`
	Topics          []string   `json:"topics,omitempty"`
	PushedAt        *time.Time `json:"pushed_at,omitempty"`
	CreatedAt       *time.Time `json:"created_at,omitempty"`
	UpdatedAt       *time.Time `json:"updated_at,omitempty"`
	CachedAt        time.Time  `json:"cached_at"`
}

// CodingSummary represents the summary for the coding domain on the hub
type CodingSummary struct {
	TotalRepos     int            `json:"total_repos"`
	TotalSnippets  int            `json:"total_snippets"`
	TotalTemplates int            `json:"total_templates"`
	RecentRepos    []GitHubRepo   `json:"recent_repos,omitempty"`
	RecentSnippets []CodeSnippet  `json:"recent_snippets,omitempty"`
	TopLanguages   map[string]int `json:"top_languages,omitempty"`
}

// GitHubRepoFromAPI converts GitHub API response to our model
type GitHubRepoFromAPI struct {
	ID              int64    `json:"id"`
	Name            string   `json:"name"`
	FullName        string   `json:"full_name"`
	Description     *string  `json:"description"`
	HTMLURL         string   `json:"html_url"`
	CloneURL        string   `json:"clone_url"`
	SSHURL          string   `json:"ssh_url"`
	Language        *string  `json:"language"`
	StargazersCount int      `json:"stargazers_count"`
	ForksCount      int      `json:"forks_count"`
	OpenIssuesCount int      `json:"open_issues_count"`
	Private         bool     `json:"private"`
	Fork            bool     `json:"fork"`
	Archived        bool     `json:"archived"`
	IsTemplate      bool     `json:"is_template"`
	DefaultBranch   string   `json:"default_branch"`
	Topics          []string `json:"topics"`
	PushedAt        string   `json:"pushed_at"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}

// API Request types for Coding

// UpdateGitHubConfigRequest is the request body for updating GitHub config
type UpdateGitHubConfigRequest struct {
	GitHubUsername    *string `json:"github_username"`
	GitHubToken       *string `json:"github_token"`
	DefaultVisibility *string `json:"default_visibility"`
	ShowArchived      *bool   `json:"show_archived"`
}

// CreateSnippetRequest is the request body for creating a snippet
type CreateSnippetRequest struct {
	Title       string   `json:"title" validate:"required"`
	Description string   `json:"description"`
	Language    string   `json:"language"`
	Filename    string   `json:"filename"`
	Code        string   `json:"code" validate:"required"`
	Tags        []string `json:"tags"`
	IsPublic    bool     `json:"is_public"`
	SourceURL   string   `json:"source_url"`
	SourceRepo  string   `json:"source_repo"`
}

// UpdateSnippetRequest is the request body for updating a snippet
type UpdateSnippetRequest struct {
	Title       *string  `json:"title"`
	Description *string  `json:"description"`
	Language    *string  `json:"language"`
	Filename    *string  `json:"filename"`
	Code        *string  `json:"code"`
	Tags        []string `json:"tags"`
	IsFavourite *bool    `json:"is_favourite"`
	IsPublic    *bool    `json:"is_public"`
	SourceURL   *string  `json:"source_url"`
	SourceRepo  *string  `json:"source_repo"`
}

// CreateTemplateRequest is the request body for creating a template
type CreateTemplateRequest struct {
	Name                string             `json:"name" validate:"required"`
	Description         string             `json:"description"`
	TemplateType        string             `json:"template_type" validate:"required"`
	GitHubTemplateRepo  string             `json:"github_template_repo"`
	GitHubTemplateOwner string             `json:"github_template_owner"`
	Files               []TemplateFile     `json:"files"`
	SetupCommands       []string           `json:"setup_commands"`
	DefaultBranch       string             `json:"default_branch"`
	Variables           []TemplateVariable `json:"variables"`
	Category            string             `json:"category"`
	Tags                []string           `json:"tags"`
}

// UpdateTemplateRequest is the request body for updating a template
type UpdateTemplateRequest struct {
	Name                *string            `json:"name"`
	Description         *string            `json:"description"`
	TemplateType        *string            `json:"template_type"`
	GitHubTemplateRepo  *string            `json:"github_template_repo"`
	GitHubTemplateOwner *string            `json:"github_template_owner"`
	Files               []TemplateFile     `json:"files"`
	SetupCommands       []string           `json:"setup_commands"`
	DefaultBranch       *string            `json:"default_branch"`
	Variables           []TemplateVariable `json:"variables"`
	Category            *string            `json:"category"`
	Tags                []string           `json:"tags"`
}

// CreateRepoRequest is the request body for creating a GitHub repo
type CreateRepoRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	Private     bool   `json:"private"`
	AutoInit    bool   `json:"auto_init"`
}

// CreateFromTemplateRequest is the request body for creating a repo from a template
type CreateFromTemplateRequest struct {
	TemplateOwner string `json:"template_owner" validate:"required"`
	TemplateRepo  string `json:"template_repo" validate:"required"`
	Name          string `json:"name" validate:"required"`
	Description   string `json:"description"`
	Private       bool   `json:"private"`
}

// =============================================================================
// Calendar Module Models
// =============================================================================

// Calendar provider types
const (
	CalendarProviderNone   = "none"
	CalendarProviderICloud = "icloud"
	CalendarProviderGoogle = "google"
	CalendarProviderCalDAV = "caldav"
)

// Reminder priority levels
const (
	ReminderPriorityLow    = "low"
	ReminderPriorityNormal = "normal"
	ReminderPriorityHigh   = "high"
	ReminderPriorityUrgent = "urgent"
)

// Recurrence types
const (
	RecurrenceDaily   = "daily"
	RecurrenceWeekly  = "weekly"
	RecurrenceMonthly = "monthly"
	RecurrenceYearly  = "yearly"
	RecurrenceCustom  = "custom"
)

// CalendarConfig represents a user's calendar integration settings
type CalendarConfig struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	Provider     string     `json:"provider"`
	CalDAVURL    *string    `json:"caldav_url,omitempty"`
	Username     *string    `json:"username,omitempty"`
	Password     *string    `json:"-"` // Never expose in JSON
	CalendarID   *string    `json:"calendar_id,omitempty"`
	CalendarName *string    `json:"calendar_name,omitempty"`
	IsActive     bool       `json:"is_active"`
	SyncEnabled  bool       `json:"sync_enabled"`
	LastSyncAt   *time.Time `json:"last_sync_at,omitempty"`
	SyncError    *string    `json:"sync_error,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// Reminder represents a reminder/event that can be synced to external calendars
type Reminder struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Domain      string     `json:"domain"`
	EntityType  *string    `json:"entity_type,omitempty"`
	EntityID    *uuid.UUID `json:"entity_id,omitempty"`
	EntityName  *string    `json:"entity_name,omitempty"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`

	// Timing
	ReminderDate time.Time  `json:"reminder_date"`
	ReminderTime *string    `json:"reminder_time,omitempty"`
	IsAllDay     bool       `json:"is_all_day"`

	// Recurrence
	IsRecurring        bool    `json:"is_recurring"`
	RecurrenceType     *string `json:"recurrence_type,omitempty"`
	RecurrenceInterval int     `json:"recurrence_interval"`
	RecurrenceEndDate  *string `json:"recurrence_end_date,omitempty"`

	// Notifications
	NotifyDaysBefore int  `json:"notify_days_before"`
	NotifyEmail      bool `json:"notify_email"`
	NotifyPush       bool `json:"notify_push"`

	// Calendar sync
	ExternalEventID  *string    `json:"external_event_id,omitempty"`
	ExternalEventURL *string    `json:"external_event_url,omitempty"`
	IsSynced         bool       `json:"is_synced"`
	LastSyncedAt     *time.Time `json:"last_synced_at,omitempty"`

	// Status
	Priority    string     `json:"priority"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	IsDismissed bool       `json:"is_dismissed"`
	DismissedAt *time.Time `json:"dismissed_at,omitempty"`
	IsSnoozed   bool       `json:"is_snoozed"`
	SnoozedUntil *string   `json:"snoozed_until,omitempty"`

	// Auto-generation
	IsAutoGenerated bool    `json:"is_auto_generated"`
	AutoGenerateKey *string `json:"auto_generate_key,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Computed fields
	DaysUntil *int `json:"days_until,omitempty"`
	IsOverdue bool `json:"is_overdue,omitempty"`
}

// ReminderSummary represents summary stats for reminders
type ReminderSummary struct {
	TotalReminders    int         `json:"total_reminders"`
	PendingReminders  int         `json:"pending_reminders"`
	OverdueReminders  int         `json:"overdue_reminders"`
	TodayReminders    int         `json:"today_reminders"`
	UpcomingReminders int         `json:"upcoming_reminders"` // Next 7 days
	ByDomain          map[string]int `json:"by_domain,omitempty"`
	ByPriority        map[string]int `json:"by_priority,omitempty"`
}

// API Request types for Calendar

// UpdateCalendarConfigRequest is the request body for updating calendar config
type UpdateCalendarConfigRequest struct {
	Provider     *string `json:"provider"`
	CalDAVURL    *string `json:"caldav_url"`
	Username     *string `json:"username"`
	Password     *string `json:"password"`
	CalendarID   *string `json:"calendar_id"`
	CalendarName *string `json:"calendar_name"`
	IsActive     *bool   `json:"is_active"`
	SyncEnabled  *bool   `json:"sync_enabled"`
}

// CreateReminderRequest is the request body for creating a reminder
type CreateReminderRequest struct {
	Domain             string  `json:"domain" validate:"required"`
	EntityType         *string `json:"entity_type"`
	EntityID           *string `json:"entity_id"`
	EntityName         *string `json:"entity_name"`
	Title              string  `json:"title" validate:"required"`
	Description        *string `json:"description"`
	ReminderDate       string  `json:"reminder_date" validate:"required"`
	ReminderTime       *string `json:"reminder_time"`
	IsAllDay           bool    `json:"is_all_day"`
	IsRecurring        bool    `json:"is_recurring"`
	RecurrenceType     *string `json:"recurrence_type"`
	RecurrenceInterval *int    `json:"recurrence_interval"`
	RecurrenceEndDate  *string `json:"recurrence_end_date"`
	NotifyDaysBefore   *int    `json:"notify_days_before"`
	NotifyEmail        *bool   `json:"notify_email"`
	NotifyPush         *bool   `json:"notify_push"`
	Priority           *string `json:"priority"`
}

// UpdateReminderRequest is the request body for updating a reminder
type UpdateReminderRequest struct {
	Title              *string `json:"title"`
	Description        *string `json:"description"`
	ReminderDate       *string `json:"reminder_date"`
	ReminderTime       *string `json:"reminder_time"`
	IsAllDay           *bool   `json:"is_all_day"`
	IsRecurring        *bool   `json:"is_recurring"`
	RecurrenceType     *string `json:"recurrence_type"`
	RecurrenceInterval *int    `json:"recurrence_interval"`
	RecurrenceEndDate  *string `json:"recurrence_end_date"`
	NotifyDaysBefore   *int    `json:"notify_days_before"`
	NotifyEmail        *bool   `json:"notify_email"`
	NotifyPush         *bool   `json:"notify_push"`
	Priority           *string `json:"priority"`
}

// SnoozeReminderRequest is the request body for snoozing a reminder
type SnoozeReminderRequest struct {
	SnoozeUntil string `json:"snooze_until" validate:"required"`
}

// GenerateRemindersRequest is the request body for generating reminders
type GenerateRemindersRequest struct {
	Domains []string `json:"domains"` // Empty = all domains
}

// =============================================================================
// Household Module Models
// =============================================================================

// Bill frequency types
const (
	BillFrequencyWeekly     = "weekly"
	BillFrequencyFortnightly = "fortnightly"
	BillFrequencyMonthly    = "monthly"
	BillFrequencyQuarterly  = "quarterly"
	BillFrequencyAnnually   = "annually"
	BillFrequencyOneTime    = "one_time"
)

// Bill categories
const (
	BillCategoryUtilities  = "utilities"
	BillCategoryHousing    = "housing"
	BillCategoryInsurance  = "insurance"
	BillCategoryTax        = "tax"
	BillCategoryOther      = "other"
)

// Subscription categories
const (
	SubscriptionCategoryStreaming = "streaming"
	SubscriptionCategorySoftware  = "software"
	SubscriptionCategoryNews      = "news"
	SubscriptionCategoryFitness   = "fitness"
	SubscriptionCategoryGaming    = "gaming"
	SubscriptionCategoryCloud     = "cloud"
	SubscriptionCategoryOther     = "other"
)

// Insurance policy types
const (
	InsuranceTypeHome   = "home"
	InsuranceTypeCar    = "car"
	InsuranceTypeLife   = "life"
	InsuranceTypeHealth = "health"
	InsuranceTypeTravel = "travel"
	InsuranceTypePet    = "pet"
	InsuranceTypeGadget = "gadget"
	InsuranceTypeOther  = "other"
)

// Maintenance categories
const (
	MaintenanceCategoryHVAC       = "hvac"
	MaintenanceCategoryPlumbing   = "plumbing"
	MaintenanceCategoryElectrical = "electrical"
	MaintenanceCategoryAppliance  = "appliance"
	MaintenanceCategoryGarden     = "garden"
	MaintenanceCategoryCleaning   = "cleaning"
	MaintenanceCategorySafety     = "safety"
	MaintenanceCategoryOther      = "other"
)

// Maintenance priority levels
const (
	MaintenancePriorityLow    = "low"
	MaintenancePriorityMedium = "medium"
	MaintenancePriorityHigh   = "high"
	MaintenancePriorityUrgent = "urgent"
)

// Bill represents a recurring bill or one-time payment
type Bill struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	Name            string     `json:"name"`
	Description     string     `json:"description,omitempty"`
	Category        string     `json:"category"`
	Amount          float64    `json:"amount"`
	Currency        string     `json:"currency"`
	Provider        string     `json:"provider,omitempty"`
	AccountNumber   string     `json:"account_number,omitempty"`
	Reference       string     `json:"reference,omitempty"`
	Frequency       string     `json:"frequency"`
	DueDay          *int       `json:"due_day,omitempty"`
	StartDate       *time.Time `json:"start_date,omitempty"`
	EndDate         *time.Time `json:"end_date,omitempty"`
	NextDueDate     *time.Time `json:"next_due_date,omitempty"`
	PaymentMethod   string     `json:"payment_method,omitempty"`
	IsActive        bool       `json:"is_active"`
	AutoPay         bool       `json:"auto_pay"`
	ReminderDays    int        `json:"reminder_days"`
	Notes           string     `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Computed fields
	DaysUntilDue    *int  `json:"days_until_due,omitempty"`
	IsOverdue       bool  `json:"is_overdue,omitempty"`
	LastPaymentDate *time.Time `json:"last_payment_date,omitempty"`
}

// BillPayment represents a payment made for a bill
type BillPayment struct {
	ID                 uuid.UUID  `json:"id"`
	BillID             uuid.UUID  `json:"bill_id"`
	UserID             uuid.UUID  `json:"user_id"`
	Amount             float64    `json:"amount"`
	Currency           string     `json:"currency"`
	PaidDate           time.Time  `json:"paid_date"`
	DueDate            *time.Time `json:"due_date,omitempty"`
	PaymentMethod      string     `json:"payment_method,omitempty"`
	ConfirmationNumber string     `json:"confirmation_number,omitempty"`
	IsLate             bool       `json:"is_late"`
	Notes              string     `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`

	// Joined field
	BillName string `json:"bill_name,omitempty"`
}

// Subscription represents a recurring subscription
type Subscription struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	Name            string     `json:"name"`
	Description     string     `json:"description,omitempty"`
	Category        string     `json:"category"`
	Amount          float64    `json:"amount"`
	Currency        string     `json:"currency"`
	Provider        string     `json:"provider,omitempty"`
	WebsiteURL      string     `json:"website_url,omitempty"`
	CancelURL       string     `json:"cancel_url,omitempty"`
	Frequency       string     `json:"frequency"`
	BillingDay      *int       `json:"billing_day,omitempty"`
	NextBillingDate *time.Time `json:"next_billing_date,omitempty"`
	IsActive        bool       `json:"is_active"`
	IsShared        bool       `json:"is_shared"`
	IsTrial         bool       `json:"is_trial"`
	TrialEndDate    *time.Time `json:"trial_end_date,omitempty"`
	StartDate       *time.Time `json:"start_date,omitempty"`
	CancelledDate   *time.Time `json:"cancelled_date,omitempty"`
	Notes           string     `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Computed fields
	DaysUntilBilling *int    `json:"days_until_billing,omitempty"`
	MonthlyEquivalent float64 `json:"monthly_equivalent,omitempty"`
	AnnualCost        float64 `json:"annual_cost,omitempty"`
}

// InsurancePolicy represents an insurance policy
type InsurancePolicy struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	Name             string     `json:"name"`
	PolicyType       string     `json:"policy_type"`
	Provider         string     `json:"provider"`
	PolicyNumber     string     `json:"policy_number,omitempty"`
	Phone            string     `json:"phone,omitempty"`
	WebsiteURL       string     `json:"website_url,omitempty"`
	CoverageAmount   *float64   `json:"coverage_amount,omitempty"`
	ExcessAmount     *float64   `json:"excess_amount,omitempty"`
	CoverageDetails  string     `json:"coverage_details,omitempty"`
	PremiumAmount    float64    `json:"premium_amount"`
	Currency         string     `json:"currency"`
	PaymentFrequency string     `json:"payment_frequency"`
	StartDate        time.Time  `json:"start_date"`
	EndDate          *time.Time `json:"end_date,omitempty"`
	RenewalDate      *time.Time `json:"renewal_date,omitempty"`
	NextPaymentDate  *time.Time `json:"next_payment_date,omitempty"`
	IsActive         bool       `json:"is_active"`
	AutoRenew        bool       `json:"auto_renew"`
	DocumentURL      string     `json:"document_url,omitempty"`
	Notes            string     `json:"notes,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	// Computed fields
	DaysUntilRenewal  *int    `json:"days_until_renewal,omitempty"`
	AnnualPremium     float64 `json:"annual_premium,omitempty"`
}

// MaintenanceTask represents a recurring home maintenance task
type MaintenanceTask struct {
	ID                uuid.UUID  `json:"id"`
	UserID            uuid.UUID  `json:"user_id"`
	Name              string     `json:"name"`
	Description       string     `json:"description,omitempty"`
	Category          string     `json:"category"`
	Frequency         string     `json:"frequency,omitempty"`
	FrequencyMonths   *int       `json:"frequency_months,omitempty"`
	Priority          string     `json:"priority"`
	LastCompletedDate *time.Time `json:"last_completed_date,omitempty"`
	NextDueDate       *time.Time `json:"next_due_date,omitempty"`
	ReminderDays      int        `json:"reminder_days"`
	EstimatedCost     *float64   `json:"estimated_cost,omitempty"`
	TypicalProvider   string     `json:"typical_provider,omitempty"`
	IsActive          bool       `json:"is_active"`
	Notes             string     `json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	// Computed fields
	DaysUntilDue *int `json:"days_until_due,omitempty"`
	IsOverdue    bool `json:"is_overdue,omitempty"`
}

// MaintenanceLog represents a completed maintenance task
type MaintenanceLog struct {
	ID              uuid.UUID  `json:"id"`
	TaskID          *uuid.UUID `json:"task_id,omitempty"`
	UserID          uuid.UUID  `json:"user_id"`
	TaskName        string     `json:"task_name"`
	Category        string     `json:"category,omitempty"`
	CompletedDate   time.Time  `json:"completed_date"`
	Cost            *float64   `json:"cost,omitempty"`
	Currency        string     `json:"currency"`
	Provider        string     `json:"provider,omitempty"`
	ProviderContact string     `json:"provider_contact,omitempty"`
	WorkDone        string     `json:"work_done,omitempty"`
	PartsUsed       string     `json:"parts_used,omitempty"`
	DurationMinutes *int       `json:"duration_minutes,omitempty"`
	ReceiptURL      string     `json:"receipt_url,omitempty"`
	PhotoURL        string     `json:"photo_url,omitempty"`
	Notes           string     `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// HouseholdSummary represents the summary for the household domain on the hub
type HouseholdSummary struct {
	// Bills
	TotalBills        int     `json:"total_bills"`
	BillsDueThisMonth int     `json:"bills_due_this_month"`
	MonthlyBillsTotal float64 `json:"monthly_bills_total"`
	OverdueBills      int     `json:"overdue_bills"`

	// Subscriptions
	TotalSubscriptions    int     `json:"total_subscriptions"`
	ActiveSubscriptions   int     `json:"active_subscriptions"`
	MonthlySubsTotal      float64 `json:"monthly_subs_total"`
	TrialsEndingSoon      int     `json:"trials_ending_soon"`

	// Insurance
	TotalPolicies         int     `json:"total_policies"`
	ActivePolicies        int     `json:"active_policies"`
	RenewalsThisMonth     int     `json:"renewals_this_month"`
	AnnualPremiumsTotal   float64 `json:"annual_premiums_total"`

	// Maintenance
	TotalTasks            int     `json:"total_tasks"`
	OverdueTasks          int     `json:"overdue_tasks"`
	TasksDueThisMonth     int     `json:"tasks_due_this_month"`
	YearlyMaintenanceCost float64 `json:"yearly_maintenance_cost"`

	// Overall
	Currency              string  `json:"currency"`
	MonthlyTotal          float64 `json:"monthly_total"`
	AnnualTotal           float64 `json:"annual_total"`
}

// API Request types for Household

// CreateBillRequest is the request body for creating a bill
type CreateBillRequest struct {
	Name          string  `json:"name" validate:"required"`
	Description   string  `json:"description"`
	Category      string  `json:"category" validate:"required"`
	Amount        float64 `json:"amount" validate:"required"`
	Currency      string  `json:"currency"`
	Provider      string  `json:"provider"`
	AccountNumber string  `json:"account_number"`
	Reference     string  `json:"reference"`
	Frequency     string  `json:"frequency" validate:"required"`
	DueDay        *int    `json:"due_day"`
	StartDate     *string `json:"start_date"`
	EndDate       *string `json:"end_date"`
	NextDueDate   *string `json:"next_due_date"`
	PaymentMethod string  `json:"payment_method"`
	AutoPay       bool    `json:"auto_pay"`
	ReminderDays  *int    `json:"reminder_days"`
	Notes         string  `json:"notes"`
}

// UpdateBillRequest is the request body for updating a bill
type UpdateBillRequest struct {
	Name          *string  `json:"name"`
	Description   *string  `json:"description"`
	Category      *string  `json:"category"`
	Amount        *float64 `json:"amount"`
	Currency      *string  `json:"currency"`
	Provider      *string  `json:"provider"`
	AccountNumber *string  `json:"account_number"`
	Reference     *string  `json:"reference"`
	Frequency     *string  `json:"frequency"`
	DueDay        *int     `json:"due_day"`
	StartDate     *string  `json:"start_date"`
	EndDate       *string  `json:"end_date"`
	NextDueDate   *string  `json:"next_due_date"`
	PaymentMethod *string  `json:"payment_method"`
	IsActive      *bool    `json:"is_active"`
	AutoPay       *bool    `json:"auto_pay"`
	ReminderDays  *int     `json:"reminder_days"`
	Notes         *string  `json:"notes"`
}

// RecordBillPaymentRequest is the request body for recording a bill payment
type RecordBillPaymentRequest struct {
	Amount             float64 `json:"amount" validate:"required"`
	PaidDate           *string `json:"paid_date"`
	PaymentMethod      string  `json:"payment_method"`
	ConfirmationNumber string  `json:"confirmation_number"`
	Notes              string  `json:"notes"`
}

// CreateSubscriptionRequest is the request body for creating a subscription
type CreateSubscriptionRequest struct {
	Name            string  `json:"name" validate:"required"`
	Description     string  `json:"description"`
	Category        string  `json:"category" validate:"required"`
	Amount          float64 `json:"amount" validate:"required"`
	Currency        string  `json:"currency"`
	Provider        string  `json:"provider"`
	WebsiteURL      string  `json:"website_url"`
	CancelURL       string  `json:"cancel_url"`
	Frequency       string  `json:"frequency" validate:"required"`
	BillingDay      *int    `json:"billing_day"`
	NextBillingDate *string `json:"next_billing_date"`
	IsShared        bool    `json:"is_shared"`
	IsTrial         bool    `json:"is_trial"`
	TrialEndDate    *string `json:"trial_end_date"`
	StartDate       *string `json:"start_date"`
	Notes           string  `json:"notes"`
}

// UpdateSubscriptionRequest is the request body for updating a subscription
type UpdateSubscriptionRequest struct {
	Name            *string  `json:"name"`
	Description     *string  `json:"description"`
	Category        *string  `json:"category"`
	Amount          *float64 `json:"amount"`
	Currency        *string  `json:"currency"`
	Provider        *string  `json:"provider"`
	WebsiteURL      *string  `json:"website_url"`
	CancelURL       *string  `json:"cancel_url"`
	Frequency       *string  `json:"frequency"`
	BillingDay      *int     `json:"billing_day"`
	NextBillingDate *string  `json:"next_billing_date"`
	IsActive        *bool    `json:"is_active"`
	IsShared        *bool    `json:"is_shared"`
	IsTrial         *bool    `json:"is_trial"`
	TrialEndDate    *string  `json:"trial_end_date"`
	CancelledDate   *string  `json:"cancelled_date"`
	Notes           *string  `json:"notes"`
}

// CreateInsurancePolicyRequest is the request body for creating an insurance policy
type CreateInsurancePolicyRequest struct {
	Name             string   `json:"name" validate:"required"`
	PolicyType       string   `json:"policy_type" validate:"required"`
	Provider         string   `json:"provider" validate:"required"`
	PolicyNumber     string   `json:"policy_number"`
	Phone            string   `json:"phone"`
	WebsiteURL       string   `json:"website_url"`
	CoverageAmount   *float64 `json:"coverage_amount"`
	ExcessAmount     *float64 `json:"excess_amount"`
	CoverageDetails  string   `json:"coverage_details"`
	PremiumAmount    float64  `json:"premium_amount" validate:"required"`
	Currency         string   `json:"currency"`
	PaymentFrequency string   `json:"payment_frequency"`
	StartDate        string   `json:"start_date" validate:"required"`
	EndDate          *string  `json:"end_date"`
	RenewalDate      *string  `json:"renewal_date"`
	NextPaymentDate  *string  `json:"next_payment_date"`
	AutoRenew        bool     `json:"auto_renew"`
	DocumentURL      string   `json:"document_url"`
	Notes            string   `json:"notes"`
}

// UpdateInsurancePolicyRequest is the request body for updating an insurance policy
type UpdateInsurancePolicyRequest struct {
	Name             *string  `json:"name"`
	PolicyType       *string  `json:"policy_type"`
	Provider         *string  `json:"provider"`
	PolicyNumber     *string  `json:"policy_number"`
	Phone            *string  `json:"phone"`
	WebsiteURL       *string  `json:"website_url"`
	CoverageAmount   *float64 `json:"coverage_amount"`
	ExcessAmount     *float64 `json:"excess_amount"`
	CoverageDetails  *string  `json:"coverage_details"`
	PremiumAmount    *float64 `json:"premium_amount"`
	Currency         *string  `json:"currency"`
	PaymentFrequency *string  `json:"payment_frequency"`
	StartDate        *string  `json:"start_date"`
	EndDate          *string  `json:"end_date"`
	RenewalDate      *string  `json:"renewal_date"`
	NextPaymentDate  *string  `json:"next_payment_date"`
	IsActive         *bool    `json:"is_active"`
	AutoRenew        *bool    `json:"auto_renew"`
	DocumentURL      *string  `json:"document_url"`
	Notes            *string  `json:"notes"`
}

// CreateMaintenanceTaskRequest is the request body for creating a maintenance task
type CreateMaintenanceTaskRequest struct {
	Name            string   `json:"name" validate:"required"`
	Description     string   `json:"description"`
	Category        string   `json:"category" validate:"required"`
	Frequency       string   `json:"frequency"`
	FrequencyMonths *int     `json:"frequency_months"`
	Priority        string   `json:"priority"`
	NextDueDate     *string  `json:"next_due_date"`
	ReminderDays    *int     `json:"reminder_days"`
	EstimatedCost   *float64 `json:"estimated_cost"`
	TypicalProvider string   `json:"typical_provider"`
	Notes           string   `json:"notes"`
}

// UpdateMaintenanceTaskRequest is the request body for updating a maintenance task
type UpdateMaintenanceTaskRequest struct {
	Name            *string  `json:"name"`
	Description     *string  `json:"description"`
	Category        *string  `json:"category"`
	Frequency       *string  `json:"frequency"`
	FrequencyMonths *int     `json:"frequency_months"`
	Priority        *string  `json:"priority"`
	NextDueDate     *string  `json:"next_due_date"`
	ReminderDays    *int     `json:"reminder_days"`
	EstimatedCost   *float64 `json:"estimated_cost"`
	TypicalProvider *string  `json:"typical_provider"`
	IsActive        *bool    `json:"is_active"`
	Notes           *string  `json:"notes"`
}

// LogMaintenanceRequest is the request body for logging a completed maintenance task
type LogMaintenanceRequest struct {
	TaskID          *string  `json:"task_id"`
	TaskName        string   `json:"task_name" validate:"required"`
	Category        string   `json:"category"`
	CompletedDate   *string  `json:"completed_date"`
	Cost            *float64 `json:"cost"`
	Currency        string   `json:"currency"`
	Provider        string   `json:"provider"`
	ProviderContact string   `json:"provider_contact"`
	WorkDone        string   `json:"work_done"`
	PartsUsed       string   `json:"parts_used"`
	DurationMinutes *int     `json:"duration_minutes"`
	ReceiptURL      string   `json:"receipt_url"`
	PhotoURL        string   `json:"photo_url"`
	Notes           string   `json:"notes"`
}
