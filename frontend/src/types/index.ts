export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  display_name: string;
  base_currency: string;
  date_format: string;
  locale: string;
  fire_target?: number;
  fire_enabled?: boolean;
  theme: Theme;
  phone_number?: string;
  date_of_birth?: string;
  notify_email: boolean;
  notify_price_alerts: boolean;
  notify_weekly: boolean;
  notify_monthly: boolean;
  watchlist?: string;
  created_at: string;
  last_login_at?: string;
}

export interface QuoteData {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  quote_type: string;
  price: number;
  change: number;
  change_pct: number;
  market_time: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// Portfolio types and metadata
export type PortfolioType = 'GIA' | 'ISA' | 'SIPP' | 'LISA' | 'JISA' | 'CRYPTO' | 'SAVINGS' | 'CASH' | 'FIXED_ASSETS';
export type ISAType = 'STOCKS_AND_SHARES' | 'CASH';
export type SavingsType = 'EASY_ACCESS' | 'NOTICE' | 'FIXED_TERM' | 'REGULAR_SAVER';
export type CryptoWalletType = 'EXCHANGE' | 'HARDWARE' | 'SOFTWARE';
export type SIPPTaxReliefType = 'RELIEF_AT_SOURCE' | 'NET_PAY';
export type LISAPurpose = 'FIRST_HOME' | 'RETIREMENT';

export interface PortfolioMetadata {
  // Common fields
  provider?: string;
  account_reference?: string;
  interest_rate?: number;

  // ISA/JISA specific
  isa_type?: ISAType;
  tax_year?: string;
  child_name?: string;
  child_dob?: string;
  contact_name?: string;

  // SIPP specific
  tax_relief_type?: SIPPTaxReliefType;
  crystallised_amount?: number;
  target_retirement_age?: number;

  // LISA specific
  lisa_purpose?: LISAPurpose;

  // Savings specific
  savings_type?: SavingsType;
  notice_period?: number;
  maturity_date?: string;
  fscs_protected?: boolean;

  // Crypto specific
  wallet_type?: CryptoWalletType;
  wallet_name?: string;

  // Cash specific
  bank_name?: string;
  account_type?: string;

  // Contribution tracking
  contributions_this_year?: number;
  contribution_limit?: number;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  type: PortfolioType;
  currency: string;
  description?: string;
  is_active: boolean;
  metadata?: PortfolioMetadata;
  created_at: string;
  updated_at: string;
  has_transactions?: boolean;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  exchange?: string;
  currency: string;
  data_source: string;
  last_price?: number;
  last_price_updated_at?: string;
  created_at: string;
}

export interface Holding {
  id: string;
  portfolio_id: string;
  asset_id: string;
  quantity: number;
  average_cost: number;
  purchased_at?: string;
  created_at: string;
  updated_at: string;
  asset?: Asset;
  current_value?: number;
  gain_loss?: number;
  gain_loss_pct?: number;
}

export interface HoldingWithPortfolio extends Holding {
  portfolio_name: string;
  portfolio_type: string;
}

export interface Transaction {
  id: string;
  portfolio_id: string;
  asset_id?: string;
  transaction_type: string;
  quantity?: number;
  price?: number;
  total_amount: number;
  currency: string;
  transaction_date: string;
  notes?: string;
  created_at: string;
  asset?: Asset;
}

export interface CashAccount {
  id: string;
  portfolio_id: string;
  account_name: string;
  account_type: string;
  institution?: string;
  balance: number;
  currency: string;
  interest_rate?: number;
  last_updated: string;
  created_at: string;
}

export interface FixedAsset {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value: number;
  currency: string;
  valuation_date?: string;
  valuation_notes?: string;
  created_at: string;
  updated_at: string;
  appreciation?: number;
  appreciation_pct?: number;
}

export interface PortfolioSummary {
  id: string;
  name: string;
  type: string;
  total_value: number;
  total_cost: number;
  unrealised_gain: number;
  unrealised_pct: number;
  holdings_count: number;
}

export interface NetWorthSummary {
  total_net_worth: number;
  investments: number;
  cash: number;
  fixed_assets: number;
  currency: string;
  change_day: number;
  change_week: number;
  change_month: number;
  change_year: number;
  portfolio_summary: PortfolioSummary[];
}

export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
}

export interface AssetAllocation {
  by_type: AllocationItem[];
  by_currency: AllocationItem[];
  by_portfolio: AllocationItem[];
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quote_type: string;
}

export interface AssetDetails {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  quote_type: string;
  price: number;
  change: number;
  change_pct: number;
}

export interface PriceHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TopMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type AssetType = 'STOCK' | 'ETF' | 'FUND' | 'CRYPTO' | 'BOND';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | 'FEE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'DEPOSIT' | 'WITHDRAWAL';
export type CashAccountType = 'CURRENT' | 'SAVINGS' | 'MONEY_MARKET';
export type FixedAssetCategory = 'PROPERTY' | 'VEHICLE' | 'COLLECTIBLE' | 'OTHER';

export type PerformancePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export interface PortfolioPerformance {
  id: string;
  name: string;
  data_points: PerformanceDataPoint[];
  start_value: number;
  end_value: number;
  change: number;
  change_pct: number;
}

export interface PerformanceData {
  period: PerformancePeriod;
  data_points: PerformanceDataPoint[];
  start_value: number;
  end_value: number;
  change: number;
  change_pct: number;
  portfolios?: PortfolioPerformance[];
}
