export type Theme = 'light' | 'dark' | 'system';

export interface ProviderLists {
  GIA?: string[];
  ISA?: string[];
  SIPP?: string[];
  LISA?: string[];
  JISA?: string[];
  CRYPTO?: string[];
  SAVINGS?: string[];
  CASH?: string[];
  [key: string]: string[] | undefined;
}

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
  provider_lists?: string;
  is_admin: boolean;
  created_at: string;
  last_login_at?: string;
}

// Admin user list response
export interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
  is_admin: boolean;
  is_locked: boolean;
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
  is_cash_portfolio?: boolean; // true for CASH, SAVINGS, and Cash ISAs
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

// Hub types - Lyfboat modules
export type Domain = 'finance' | 'household' | 'cooking' | 'reading' | 'coding' | 'plants';

export interface DomainSummary {
  domain: Domain;
  title: string;
  icon: string;
  value: string;
  subtitle: string;
  link: string;
  is_available: boolean;
  metric?: number;
}

export interface HubSummary {
  display_name: string;
  domains: DomainSummary[];
}

export interface ActivityLog {
  id: string;
  user_id: string;
  domain: Domain;
  action: 'created' | 'updated' | 'deleted' | 'completed';
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface UpcomingReminder {
  id: string;
  domain: Domain;
  title: string;
  description?: string;
  due_date: string;
  entity_type?: string;
  entity_id?: string;
}

// =============================================================================
// Cooking Module Types
// =============================================================================

export type Course = 'starter' | 'main' | 'dessert' | 'side' | 'snack' | 'drink';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ShoppingCategory = 'produce' | 'dairy' | 'meat' | 'bakery' | 'frozen' | 'pantry' | 'other';

export interface Ingredient {
  amount?: string;
  unit?: string;
  name: string;
  group?: string;
  notes?: string;
}

export interface Instruction {
  step: number;
  text: string;
  image_url?: string;
}

export interface Nutrition {
  calories?: string;
  protein?: string;
  carbohydrates?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  source_url?: string;
  source_name?: string;
  image_url?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings?: number;
  servings_unit?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  cuisine?: string;
  course?: Course;
  diet_tags?: string[];
  custom_tags?: string[];
  rating?: number;
  notes?: string;
  is_favourite: boolean;
  times_cooked: number;
  last_cooked_at?: string;
  nutrition?: Nutrition;
  created_at: string;
  updated_at: string;
}

export interface RecipeCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  is_default: boolean;
  recipe_count?: number;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: string;
  meal_type: MealType;
  recipe_id?: string;
  custom_meal?: string;
  servings: number;
  notes?: string;
  is_cooked: boolean;
  created_at: string;
  recipe?: Recipe;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  ingredient_name: string;
  amount?: string;
  unit?: string;
  category?: ShoppingCategory;
  recipe_id?: string;
  meal_plan_id?: string;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
  recipe_name?: string;
}

export interface CookingSummary {
  total_recipes: number;
  favourite_recipes: number;
  recipes_this_week: number;
  last_cooked?: Recipe;
  meal_plans_today?: MealPlan[];
}

// API Request types for Cooking
export interface CreateRecipeRequest {
  title: string;
  description?: string;
  source_url?: string;
  source_name?: string;
  image_url?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings?: number;
  servings_unit?: string;
  ingredients?: Ingredient[];
  instructions?: Instruction[];
  cuisine?: string;
  course?: Course;
  diet_tags?: string[];
  custom_tags?: string[];
  notes?: string;
}

export interface UpdateRecipeRequest {
  title?: string;
  description?: string;
  source_url?: string;
  source_name?: string;
  image_url?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings?: number;
  servings_unit?: string;
  ingredients?: Ingredient[];
  instructions?: Instruction[];
  cuisine?: string;
  course?: Course;
  diet_tags?: string[];
  custom_tags?: string[];
  rating?: number;
  notes?: string;
  is_favourite?: boolean;
}

export interface CreateMealPlanRequest {
  plan_date: string;
  meal_type: MealType;
  recipe_id?: string;
  custom_meal?: string;
  servings?: number;
  notes?: string;
}

export interface AddShoppingItemRequest {
  ingredient_name: string;
  amount?: string;
  unit?: string;
  category?: ShoppingCategory;
  recipe_id?: string;
}

// =============================================================================
// Reading Module Types
// =============================================================================

export type BookFormat = 'physical' | 'ebook' | 'audiobook';
export type ReadingListType = 'to_read' | 'reading' | 'read' | 'custom';

export interface Book {
  id: string;
  user_id: string;
  google_books_id?: string;
  isbn_10?: string;
  isbn_13?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  published_date?: string;
  description?: string;
  page_count?: number;
  categories: string[];
  language?: string;
  thumbnail_url?: string;
  format?: BookFormat;
  owned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadingList {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  list_type: ReadingListType;
  is_default: boolean;
  sort_order: number;
  book_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReadingListBook {
  id: string;
  reading_list_id: string;
  book_id: string;
  current_page: number;
  progress_percent: number;
  date_added: string;
  date_started?: string;
  date_finished?: string;
  rating?: number;
  review?: string;
  review_date?: string;
  sort_order: number;
  book?: Book;
}

export interface ReadingGoal {
  id: string;
  user_id: string;
  year: number;
  target_books: number;
  books_read?: number;
  created_at: string;
}

export interface ReadingSummary {
  total_books: number;
  currently_reading: number;
  books_this_year: number;
  yearly_goal?: ReadingGoal;
  recently_finished?: ReadingListBook[];
}

// Goodreads Import
export interface GoodreadsImportResult {
  books_imported: number;
  books_skipped: number;
  books_updated: number;
  errors?: string[];
}

// Reading Statistics
export interface ReadingStats {
  total_books_read: number;
  total_pages_read: number;
  books_read_by_year: YearlyBookCount[];
  books_read_by_month: MonthlyBookCount[];
  genre_breakdown: GenreCount[];
  author_stats: AuthorCount[];
  average_rating: number;
  average_page_count: number;
  average_books_per_month: number;
  longest_book?: BookStat;
  shortest_book?: BookStat;
}

export interface YearlyBookCount {
  year: number;
  count: number;
  pages: number;
}

export interface MonthlyBookCount {
  year: number;
  month: number;
  label: string;
  count: number;
}

export interface GenreCount {
  genre: string;
  count: number;
}

export interface AuthorCount {
  author: string;
  count: number;
}

export interface BookStat {
  title: string;
  authors: string;
  page_count: number;
}

// Google Books API types
export interface GoogleBooksVolume {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

export interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  industryIdentifiers?: {
    type: string;
    identifier: string;
  }[];
}

export interface GoogleBooksSearchResult {
  totalItems: number;
  items: GoogleBooksVolume[];
}

// API Request types for Reading
export interface CreateBookRequest {
  google_books_id?: string;
  isbn_10?: string;
  isbn_13?: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  published_date?: string;
  description?: string;
  page_count?: number;
  categories?: string[];
  language?: string;
  thumbnail_url?: string;
  format?: BookFormat;
  owned?: boolean;
}

export interface UpdateBookRequest {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  published_date?: string;
  description?: string;
  page_count?: number;
  categories?: string[];
  thumbnail_url?: string;
  format?: BookFormat;
  owned?: boolean;
}

export interface CreateReadingListRequest {
  name: string;
  description?: string;
}

export interface AddBookToListRequest {
  book_id: string;
}

export interface UpdateReadingProgressRequest {
  current_page?: number;
  progress_percent?: number;
  date_started?: string;
  date_finished?: string;
  rating?: number;
  review?: string;
}

export interface SetReadingGoalRequest {
  year: number;
  target_books: number;
}

// =============================================================================
// Plants Module Types
// =============================================================================

export type PlantHealthStatus = 'thriving' | 'healthy' | 'fair' | 'struggling' | 'critical';
export type PlantLightRequirement = 'low' | 'medium' | 'bright_indirect' | 'direct';
export type PlantHumidityPreference = 'low' | 'medium' | 'high';
export type PlantCareType = 'watered' | 'fertilized' | 'pruned' | 'repotted' | 'treated' | 'misted' | 'rotated' | 'cleaned';

export interface Plant {
  id: string;
  user_id: string;
  name: string;
  species?: string;
  variety?: string;
  nickname?: string;
  room?: string;
  location_detail?: string;
  photo_url?: string;
  acquired_date?: string;
  acquired_from?: string;
  purchase_price?: number;
  watering_frequency_days: number;
  light_requirement: PlantLightRequirement;
  humidity_preference: PlantHumidityPreference;
  fertilizing_frequency_days?: number;
  last_fertilized_at?: string;
  health_status: PlantHealthStatus;
  is_active: boolean;
  last_watered_at?: string;
  last_repotted_at?: string;
  last_pruned_at?: string;
  next_water_date?: string;
  next_fertilize_date?: string;
  notes?: string;
  care_notes?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  days_until_water?: number;
  days_since_water?: number;
}

export interface PlantCareLog {
  id: string;
  plant_id: string;
  user_id: string;
  care_type: PlantCareType;
  care_date: string;
  notes?: string;
  photo_url?: string;
  created_at: string;
  plant_name?: string;
}

export interface PlantHealthLog {
  id: string;
  plant_id: string;
  user_id: string;
  log_date: string;
  health_status: PlantHealthStatus;
  observations?: string[];
  actions_taken?: string[];
  notes?: string;
  photo_url?: string;
  created_at: string;
}

export interface PlantSummary {
  total_plants: number;
  needing_water: number;
  needing_water_plants?: Plant[];
  healthy_count: number;
  needs_attention: number;
  recent_care_logs?: PlantCareLog[];
}

export interface PlantsByRoom {
  room: string;
  plants: Plant[];
  count: number;
}

export interface PlantPhoto {
  id: string;
  plant_id: string;
  user_id: string;
  filename: string;
  original_filename?: string;
  content_type: string;
  file_size?: number;
  photo_url: string;
  thumbnail_url?: string;
  taken_at: string;
  caption?: string;
  is_primary: boolean;
  photo_type: PlantPhotoType;
  created_at: string;
}

export type PlantPhotoType = 'general' | 'growth' | 'problem' | 'treatment' | 'milestone';

// API Request types for Plants
export interface CreatePlantRequest {
  name: string;
  species?: string;
  variety?: string;
  nickname?: string;
  room?: string;
  location_detail?: string;
  photo_url?: string;
  acquired_date?: string;
  acquired_from?: string;
  purchase_price?: number;
  watering_frequency_days?: number;
  light_requirement?: PlantLightRequirement;
  humidity_preference?: PlantHumidityPreference;
  fertilizing_frequency_days?: number;
  notes?: string;
  care_notes?: string;
}

export interface UpdatePlantRequest {
  name?: string;
  species?: string;
  variety?: string;
  nickname?: string;
  room?: string;
  location_detail?: string;
  photo_url?: string;
  acquired_date?: string;
  acquired_from?: string;
  purchase_price?: number;
  watering_frequency_days?: number;
  light_requirement?: PlantLightRequirement;
  humidity_preference?: PlantHumidityPreference;
  fertilizing_frequency_days?: number;
  health_status?: PlantHealthStatus;
  is_active?: boolean;
  notes?: string;
  care_notes?: string;
}

export interface LogCareRequest {
  care_type: PlantCareType;
  care_date?: string;
  notes?: string;
  photo_url?: string;
}

export interface LogHealthRequest {
  health_status: PlantHealthStatus;
  log_date?: string;
  observations?: string[];
  actions_taken?: string[];
  notes?: string;
  photo_url?: string;
}

export interface WaterMultipleRequest {
  plant_ids: string[];
  notes?: string;
}

// =============================================================================
// Coding Module Types
// =============================================================================

export type SnippetLanguage = 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'sql' | 'bash' | 'css' | 'html' | 'json' | 'yaml' | 'markdown' | 'other';
export type SnippetCategory = 'algorithm' | 'data_structure' | 'api' | 'database' | 'testing' | 'utility' | 'config' | 'boilerplate' | 'other';
export type TemplateType = 'project' | 'file' | 'component';

export interface GitHubConfig {
  id: string;
  user_id: string;
  github_username?: string;
  github_token?: string;
  default_visibility: 'public' | 'private';
  show_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CodeSnippet {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  code: string;
  language: SnippetLanguage;
  category?: SnippetCategory;
  tags: string[];
  is_favourite: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateFile {
  path: string;
  content: string;
  is_template: boolean;
}

export interface TemplateVariable {
  name: string;
  description?: string;
  default_value?: string;
  required: boolean;
}

export interface ProjectTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  template_type: TemplateType;
  language?: SnippetLanguage;
  framework?: string;
  files: TemplateFile[];
  variables: TemplateVariable[];
  tags: string[];
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: string;
  user_id: string;
  github_id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  is_private: boolean;
  is_fork: boolean;
  is_archived: boolean;
  is_template: boolean;
  default_branch: string;
  topics: string[];
  pushed_at?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at: string;
}

export interface CodingSummary {
  total_snippets: number;
  favourite_snippets: number;
  total_templates: number;
  total_repos: number;
  github_connected: boolean;
  repos_by_language?: { language: string; count: number }[];
  recent_snippets?: CodeSnippet[];
  recent_repos?: GitHubRepo[];
  last_sync?: string;
}

// API Request types for Coding
export interface UpdateGitHubConfigRequest {
  github_username?: string;
  github_token?: string;
  default_visibility?: 'public' | 'private';
  show_archived?: boolean;
}

export interface CreateSnippetRequest {
  title: string;
  description?: string;
  code: string;
  language: SnippetLanguage;
  category?: SnippetCategory;
  tags?: string[];
}

export interface UpdateSnippetRequest {
  title?: string;
  description?: string;
  code?: string;
  language?: SnippetLanguage;
  category?: SnippetCategory;
  tags?: string[];
  is_favourite?: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  template_type: TemplateType;
  language?: SnippetLanguage;
  framework?: string;
  files?: TemplateFile[];
  variables?: TemplateVariable[];
  tags?: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  template_type?: TemplateType;
  language?: SnippetLanguage;
  framework?: string;
  files?: TemplateFile[];
  variables?: TemplateVariable[];
  tags?: string[];
}

// =============================================================================
// Calendar Module Types
// =============================================================================

export type CalendarProvider = 'none' | 'icloud' | 'google' | 'caldav';
export type ReminderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ReminderDomain = 'plants' | 'finance' | 'cooking' | 'reading' | 'coding' | 'household' | 'custom';

export interface CalendarConfig {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  caldav_url?: string;
  username?: string;
  calendar_id?: string;
  calendar_name?: string;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at?: string;
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  domain: ReminderDomain;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_time?: string;
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  notify_days_before: number;
  notify_email: boolean;
  notify_push: boolean;
  external_event_id?: string;
  external_event_url?: string;
  is_synced: boolean;
  last_synced_at?: string;
  priority: ReminderPriority;
  is_completed: boolean;
  completed_at?: string;
  is_dismissed: boolean;
  dismissed_at?: string;
  is_snoozed: boolean;
  snoozed_until?: string;
  is_auto_generated: boolean;
  auto_generate_key?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  days_until?: number;
  is_overdue?: boolean;
}

export interface ReminderSummary {
  total_reminders: number;
  upcoming_today: number;
  upcoming_week: number;
  overdue: number;
  by_domain: { domain: ReminderDomain; count: number }[];
}

// API Request types for Calendar
export interface UpdateCalendarConfigRequest {
  provider?: CalendarProvider;
  caldav_url?: string;
  username?: string;
  password?: string;
  calendar_id?: string;
  calendar_name?: string;
  sync_enabled?: boolean;
}

export interface CreateReminderRequest {
  domain: ReminderDomain;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_time?: string;
  is_all_day?: boolean;
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  notify_days_before?: number;
  notify_email?: boolean;
  notify_push?: boolean;
  priority?: ReminderPriority;
}

export interface UpdateReminderRequest {
  title?: string;
  description?: string;
  reminder_date?: string;
  reminder_time?: string;
  is_all_day?: boolean;
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  notify_days_before?: number;
  notify_email?: boolean;
  notify_push?: boolean;
  priority?: ReminderPriority;
}

export interface SnoozeReminderRequest {
  snooze_until: string;
}

export interface GenerateRemindersRequest {
  domain?: string;
}

// =============================================================================
// Household Module Types
// =============================================================================

export type BillCategory = 'utilities' | 'housing' | 'insurance' | 'tax' | 'other';
export type BillFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'one_time';
export type SubscriptionCategory = 'streaming' | 'software' | 'news' | 'fitness' | 'gaming' | 'cloud' | 'other';
export type InsuranceType = 'home' | 'car' | 'life' | 'health' | 'travel' | 'pet' | 'gadget' | 'other';
export type MaintenanceCategory = 'hvac' | 'plumbing' | 'electrical' | 'appliance' | 'garden' | 'cleaning' | 'safety' | 'other';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type PaymentFrequency = 'monthly' | 'annually';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: BillCategory;
  amount: number;
  currency: string;
  provider?: string;
  account_number?: string;
  reference?: string;
  frequency: BillFrequency;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  next_due_date?: string;
  payment_method?: string;
  is_active: boolean;
  auto_pay: boolean;
  reminder_days: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  days_until_due?: number;
  is_overdue?: boolean;
  monthly_equivalent?: number;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  user_id: string;
  amount: number;
  currency: string;
  paid_date: string;
  due_date?: string;
  payment_method?: string;
  confirmation_number?: string;
  is_late: boolean;
  notes?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: SubscriptionCategory;
  amount: number;
  currency: string;
  provider?: string;
  website_url?: string;
  cancel_url?: string;
  frequency: BillFrequency;
  billing_day?: number;
  next_billing_date?: string;
  is_active: boolean;
  is_shared: boolean;
  is_trial: boolean;
  trial_end_date?: string;
  start_date?: string;
  cancelled_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  days_until_billing?: number;
  monthly_equivalent?: number;
  annual_cost?: number;
}

export interface InsurancePolicy {
  id: string;
  user_id: string;
  name: string;
  policy_type: InsuranceType;
  provider: string;
  policy_number?: string;
  phone?: string;
  website_url?: string;
  coverage_amount?: number;
  excess_amount?: number;
  coverage_details?: string;
  premium_amount: number;
  currency: string;
  payment_frequency: PaymentFrequency;
  start_date: string;
  end_date?: string;
  renewal_date?: string;
  next_payment_date?: string;
  is_active: boolean;
  auto_renew: boolean;
  document_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  days_until_renewal?: number;
  monthly_premium?: number;
  annual_premium?: number;
}

export interface MaintenanceTask {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: MaintenanceCategory;
  frequency?: string;
  frequency_months?: number;
  priority: MaintenancePriority;
  last_completed_date?: string;
  next_due_date?: string;
  reminder_days: number;
  estimated_cost?: number;
  typical_provider?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  days_until_due?: number;
  is_overdue?: boolean;
}

export interface MaintenanceLog {
  id: string;
  task_id?: string;
  user_id: string;
  task_name: string;
  category?: string;
  completed_date: string;
  cost?: number;
  currency: string;
  provider?: string;
  provider_contact?: string;
  work_done?: string;
  parts_used?: string;
  duration_minutes?: number;
  receipt_url?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
}

export interface HouseholdSummary {
  bills_count: number;
  subscriptions_count: number;
  insurance_count: number;
  maintenance_tasks_count: number;
  monthly_bills: number;
  monthly_subscriptions: number;
  monthly_insurance: number;
  monthly_spending: number;
  annual_spending: number;
  overdue_bills: number;
  due_soon: number;
  upcoming_renewals: number;
  maintenance_due: number;
  currency: string;
}

// API Request types for Household
export interface CreateBillRequest {
  name: string;
  description?: string;
  category: BillCategory;
  amount: number;
  currency?: string;
  provider?: string;
  account_number?: string;
  reference?: string;
  frequency?: BillFrequency;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  next_due_date?: string;
  payment_method?: string;
  auto_pay?: boolean;
  reminder_days?: number;
  notes?: string;
}

export interface UpdateBillRequest {
  name?: string;
  description?: string;
  category?: BillCategory;
  amount?: number;
  currency?: string;
  provider?: string;
  account_number?: string;
  reference?: string;
  frequency?: BillFrequency;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  next_due_date?: string;
  payment_method?: string;
  is_active?: boolean;
  auto_pay?: boolean;
  reminder_days?: number;
  notes?: string;
}

export interface RecordBillPaymentRequest {
  amount: number;
  paid_date?: string;
  payment_method?: string;
  confirmation_number?: string;
  notes?: string;
}

export interface CreateSubscriptionRequest {
  name: string;
  description?: string;
  category: SubscriptionCategory;
  amount: number;
  currency?: string;
  provider?: string;
  website_url?: string;
  cancel_url?: string;
  frequency?: BillFrequency;
  billing_day?: number;
  next_billing_date?: string;
  is_shared?: boolean;
  is_trial?: boolean;
  trial_end_date?: string;
  start_date?: string;
  notes?: string;
}

export interface UpdateSubscriptionRequest {
  name?: string;
  description?: string;
  category?: SubscriptionCategory;
  amount?: number;
  currency?: string;
  provider?: string;
  website_url?: string;
  cancel_url?: string;
  frequency?: BillFrequency;
  billing_day?: number;
  next_billing_date?: string;
  is_active?: boolean;
  is_shared?: boolean;
  is_trial?: boolean;
  trial_end_date?: string;
  cancelled_date?: string;
  notes?: string;
}

export interface CreateInsurancePolicyRequest {
  name: string;
  policy_type: InsuranceType;
  provider: string;
  policy_number?: string;
  phone?: string;
  website_url?: string;
  coverage_amount?: number;
  excess_amount?: number;
  coverage_details?: string;
  premium_amount: number;
  currency?: string;
  payment_frequency?: PaymentFrequency;
  start_date: string;
  end_date?: string;
  renewal_date?: string;
  next_payment_date?: string;
  auto_renew?: boolean;
  document_url?: string;
  notes?: string;
}

export interface UpdateInsurancePolicyRequest {
  name?: string;
  policy_type?: InsuranceType;
  provider?: string;
  policy_number?: string;
  phone?: string;
  website_url?: string;
  coverage_amount?: number;
  excess_amount?: number;
  coverage_details?: string;
  premium_amount?: number;
  currency?: string;
  payment_frequency?: PaymentFrequency;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  next_payment_date?: string;
  is_active?: boolean;
  auto_renew?: boolean;
  document_url?: string;
  notes?: string;
}

export interface CreateMaintenanceTaskRequest {
  name: string;
  description?: string;
  category: MaintenanceCategory;
  frequency?: string;
  frequency_months?: number;
  priority?: MaintenancePriority;
  next_due_date?: string;
  reminder_days?: number;
  estimated_cost?: number;
  typical_provider?: string;
  notes?: string;
}

export interface UpdateMaintenanceTaskRequest {
  name?: string;
  description?: string;
  category?: MaintenanceCategory;
  frequency?: string;
  frequency_months?: number;
  priority?: MaintenancePriority;
  next_due_date?: string;
  reminder_days?: number;
  estimated_cost?: number;
  typical_provider?: string;
  is_active?: boolean;
  notes?: string;
}

export interface LogMaintenanceRequest {
  completed_date?: string;
  cost?: number;
  currency?: string;
  provider?: string;
  provider_contact?: string;
  work_done?: string;
  parts_used?: string;
  duration_minutes?: number;
  receipt_url?: string;
  photo_url?: string;
  notes?: string;
}
