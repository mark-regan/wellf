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

// Family/Household Types
export type HouseholdRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'declined';
export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other';

export type RelationshipType =
  | 'spouse'
  | 'partner'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'aunt_uncle'
  | 'niece_nephew'
  | 'cousin'
  | 'step_parent'
  | 'step_child'
  | 'step_sibling'
  | 'in_law'
  | 'guardian'
  | 'ward'
  | 'other';

export interface Household {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  members?: HouseholdMember[];
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id?: string;
  role: HouseholdRole;
  invited_email?: string;
  invite_status: InviteStatus;
  joined_at?: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    display_name?: string;
  };
}

export interface PersonMetadata {
  occupation?: string;
  employer?: string;
  education?: string;
  hobbies?: string[];
  dietary_requirements?: string;
  allergies?: string[];
  notes?: string;
}

export interface Person {
  id: string;
  household_id: string;
  user_id?: string;
  first_name: string;
  last_name?: string;
  nickname?: string;
  date_of_birth?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  national_insurance_number?: string;
  passport_number?: string;
  driving_licence_number?: string;
  blood_type?: string;
  medical_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  avatar_url?: string;
  is_primary_account_holder: boolean;
  metadata?: PersonMetadata;
  created_at: string;
  updated_at: string;
  // Computed fields from backend
  age?: number;
  full_name?: string;
  relationships?: FamilyRelationship[];
}

export interface FamilyRelationship {
  id: string;
  household_id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: RelationshipType;
  created_at: string;
  related_person?: Person;
}

// Property Types
export type PropertyType = 'HOUSE' | 'FLAT' | 'LAND' | 'COMMERCIAL' | 'OTHER';
export type OwnershipType = 'SOLE' | 'JOINT_TENANTS' | 'TENANTS_IN_COMMON';

export interface Property {
  id: string;
  household_id: string;
  name: string;
  property_type: PropertyType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  currency: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  land_registry_title?: string;
  epc_rating?: string;
  council_tax_band?: string;
  is_primary_residence: boolean;
  is_rental: boolean;
  rental_income?: number;
  mortgage_provider?: string;
  mortgage_account_number?: string;
  mortgage_balance?: number;
  mortgage_rate?: number;
  mortgage_end_date?: string;
  mortgage_monthly_payment?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  owners?: PropertyOwner[];
  equity?: number;
}

export interface PropertyOwner {
  id: string;
  property_id: string;
  person_id: string;
  ownership_percentage: number;
  ownership_type?: OwnershipType;
  created_at: string;
  person?: Person;
}

// Vehicle Types
export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'VAN' | 'BOAT' | 'CARAVAN' | 'OTHER';
export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'OTHER';
export type ServiceType = 'MOT' | 'SERVICE' | 'REPAIR' | 'TYRE' | 'OTHER';

export interface Vehicle {
  id: string;
  household_id: string;
  name: string;
  vehicle_type: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  registration?: string;
  vin?: string;
  color?: string;
  fuel_type?: FuelType;
  transmission?: string;
  engine_size?: string;
  mileage?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  currency: string;
  mot_expiry?: string;
  tax_expiry?: string;
  insurance_expiry?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  finance_provider?: string;
  finance_end_date?: string;
  finance_monthly_payment?: number;
  finance_balance?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  users?: VehicleUser[];
  service_records?: VehicleServiceRecord[];
  days_until_mot?: number;
  days_until_tax?: number;
  days_until_insurance?: number;
}

export interface VehicleUser {
  id: string;
  vehicle_id: string;
  person_id: string;
  is_primary_driver: boolean;
  is_named_on_insurance: boolean;
  created_at: string;
  person?: Person;
}

export interface VehicleServiceRecord {
  id: string;
  vehicle_id: string;
  service_type: ServiceType;
  service_date: string;
  mileage?: number;
  provider?: string;
  description?: string;
  cost?: number;
  currency: string;
  next_service_date?: string;
  next_service_mileage?: number;
  notes?: string;
  created_at: string;
}

// Insurance Types
export type InsurancePolicyType = 'HOME' | 'MOTOR' | 'LIFE' | 'HEALTH' | 'TRAVEL' | 'PET' | 'CONTENTS' | 'LANDLORD' | 'OTHER';
export type PremiumFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
export type CoverageType = 'PRIMARY' | 'NAMED' | 'DEPENDENT';
export type InsuranceClaimType = 'THEFT' | 'DAMAGE' | 'ACCIDENT' | 'MEDICAL' | 'OTHER';
export type InsuranceClaimStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'SETTLED';

export interface InsurancePolicy {
  id: string;
  household_id: string;
  policy_name: string;
  policy_type: InsurancePolicyType;
  provider?: string;
  policy_number?: string;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  premium_amount?: number;
  premium_frequency?: PremiumFrequency;
  excess_amount?: number;
  cover_amount?: number;
  currency: string;
  auto_renewal: boolean;
  property_id?: string;
  vehicle_id?: string;
  broker_name?: string;
  broker_phone?: string;
  broker_email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  covered_people?: InsuranceCoveredPerson[];
  claims?: InsuranceClaim[];
  days_until_renewal?: number;
  is_expired?: boolean;
}

export interface InsuranceCoveredPerson {
  id: string;
  policy_id: string;
  person_id: string;
  coverage_type?: CoverageType;
  notes?: string;
  created_at: string;
  person?: Person;
}

export interface InsuranceClaim {
  id: string;
  policy_id: string;
  claim_reference?: string;
  claim_date: string;
  incident_date?: string;
  claim_type?: InsuranceClaimType;
  description?: string;
  claim_amount?: number;
  settled_amount?: number;
  excess_paid?: number;
  currency: string;
  status: InsuranceClaimStatus;
  resolution_date?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

// Document Types
export type DocumentCategory = 'IDENTITY' | 'PROPERTY' | 'VEHICLE' | 'INSURANCE' | 'FINANCIAL' | 'MEDICAL' | 'LEGAL' | 'OTHER';
export type FileType = 'PDF' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'JPG' | 'PNG' | 'OTHER';

export interface Document {
  id: string;
  household_id: string;
  name: string;
  description?: string;
  category: DocumentCategory;
  url: string;
  file_type?: FileType;
  file_size?: number;
  document_date?: string;
  expiry_date?: string;
  tags?: string[];
  person_id?: string;
  property_id?: string;
  vehicle_id?: string;
  insurance_policy_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  days_until_expiry?: number;
  is_expired?: boolean;
  // Joined fields
  person?: Person;
  property?: Property;
  vehicle?: Vehicle;
  insurance_policy?: InsurancePolicy;
}

// Reminder Types
export type ReminderType =
  | 'DOCUMENT_EXPIRY'
  | 'VEHICLE_MOT'
  | 'VEHICLE_TAX'
  | 'VEHICLE_INSURANCE'
  | 'VEHICLE_SERVICE'
  | 'INSURANCE_RENEWAL'
  | 'MORTGAGE_END';

export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EntityType = 'document' | 'vehicle' | 'insurance' | 'property';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  description?: string;
  due_date: string;
  days_until: number;
  priority: ReminderPriority;
  is_overdue: boolean;
  entity_id: string;
  entity_type: EntityType;
  entity_name: string;
  category?: string;
  url?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: ReminderType;
  priority: ReminderPriority;
  entity_id: string;
  entity_type: EntityType;
}

export interface ReminderSummary {
  total_count: number;
  overdue_count: number;
  urgent_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}
