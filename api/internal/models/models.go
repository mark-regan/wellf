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
	ByType     []AllocationItem `json:"by_type"`
	ByCurrency []AllocationItem `json:"by_currency"`
	ByPortfolio []AllocationItem `json:"by_portfolio"`
}
