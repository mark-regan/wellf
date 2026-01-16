import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { portfolioApi } from '@/api/portfolios';
import { assetApi } from '@/api/assets';
import { useAuthStore } from '@/store/auth';
import { getProvidersForType, parseProviderLists } from '@/constants/providers';
import { PortfolioType, PortfolioMetadata, AssetSearchResult, Portfolio } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Loader2,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddPortfolioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface HoldingEntry {
  id: string;
  symbol: string;
  name: string;
  quantity: string;
  price: string;
  date: string;
}

interface CashEntry {
  id: string;
  amount: string;
  date: string;
  notes: string;
}

const PORTFOLIO_TYPES: { value: PortfolioType; label: string; description: string }[] = [
  { value: 'GIA', label: 'GIA', description: 'General Investment Account' },
  { value: 'ISA', label: 'ISA', description: 'Individual Savings Account' },
  { value: 'SIPP', label: 'SIPP', description: 'Self-Invested Personal Pension' },
  { value: 'LISA', label: 'LISA', description: 'Lifetime ISA' },
  { value: 'JISA', label: 'JISA', description: 'Junior ISA' },
  { value: 'CRYPTO', label: 'Crypto', description: 'Cryptocurrency Wallet' },
  { value: 'SAVINGS', label: 'Savings', description: 'Savings Account' },
  { value: 'CASH', label: 'Cash', description: 'Cash / Bank Account' },
];

const ISA_TYPES = [
  { value: 'STOCKS_AND_SHARES', label: 'Stocks & Shares' },
  { value: 'CASH', label: 'Cash ISA' },
];

const SAVINGS_TYPES = [
  { value: 'EASY_ACCESS', label: 'Easy Access' },
  { value: 'NOTICE', label: 'Notice Account' },
  { value: 'FIXED_TERM', label: 'Fixed Term' },
  { value: 'REGULAR_SAVER', label: 'Regular Saver' },
];

const CASH_ACCOUNT_TYPES = [
  { value: 'BASIC', label: 'Basic Current Account' },
  { value: 'STANDARD', label: 'Standard Current Account' },
  { value: 'PREMIUM', label: 'Premium Current Account' },
  { value: 'PACKAGED', label: 'Packaged Account' },
  { value: 'STUDENT', label: 'Student Account' },
  { value: 'GRADUATE', label: 'Graduate Account' },
  { value: 'JOINT', label: 'Joint Account' },
  { value: 'BUSINESS', label: 'Business Account' },
  { value: 'SAVINGS', label: 'Savings Account' },
  { value: 'OTHER', label: 'Other' },
];

const TAX_RELIEF_TYPES = [
  { value: 'RELIEF_AT_SOURCE', label: 'Relief at Source' },
  { value: 'NET_PAY', label: 'Net Pay' },
];

const LISA_PURPOSES = [
  { value: 'FIRST_HOME', label: 'First Home Purchase' },
  { value: 'RETIREMENT', label: 'Retirement' },
];

const CRYPTO_WALLET_TYPES = [
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'HARDWARE', label: 'Hardware Wallet' },
  { value: 'SOFTWARE', label: 'Software Wallet' },
];

export function AddPortfolioModal({ open, onOpenChange, onSuccess }: AddPortfolioModalProps) {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Portfolio details
  const [name, setName] = useState('');
  const [type, setType] = useState<PortfolioType>('GIA');
  const [currency, setCurrency] = useState('GBP');
  const [metadata, setMetadata] = useState<PortfolioMetadata>({});
  const [isOtherProvider, setIsOtherProvider] = useState(false);

  // Step 2: Holdings
  const [holdings, setHoldings] = useState<HoldingEntry[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [createdPortfolio, setCreatedPortfolio] = useState<Portfolio | null>(null);

  // Provider list
  const providerLists = parseProviderLists(user?.provider_lists);
  const currentProviders = getProvidersForType(providerLists, type);

  // Determine if this is a cash-based portfolio
  const isCashPortfolio = type === 'SAVINGS' || type === 'CASH' ||
    ((type === 'ISA' || type === 'JISA') && metadata.isa_type === 'CASH');

  const steps = [
    { id: 'details', title: 'Portfolio Details' },
    { id: 'holdings', title: isCashPortfolio ? 'Initial Deposit' : 'Initial Holdings' },
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setName('');
      setType('GIA');
      setCurrency('GBP');
      setMetadata({});
      setIsOtherProvider(false);
      setHoldings([]);
      setCashEntries([]);
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setCreatedPortfolio(null);
    }
  }, [open]);

  // Get default metadata for portfolio type
  const getDefaultMetadata = (portfolioType: PortfolioType): PortfolioMetadata => {
    switch (portfolioType) {
      case 'ISA':
      case 'JISA':
        return { isa_type: 'STOCKS_AND_SHARES' };
      case 'SIPP':
        return { tax_relief_type: 'RELIEF_AT_SOURCE' };
      case 'LISA':
        return { lisa_purpose: 'FIRST_HOME' };
      case 'CRYPTO':
        return { wallet_type: 'EXCHANGE' };
      case 'SAVINGS':
        return { savings_type: 'EASY_ACCESS', fscs_protected: true };
      case 'CASH':
        return { account_type: 'STANDARD', fscs_protected: true };
      default:
        return {};
    }
  };

  const updateMetadata = (field: keyof PortfolioMetadata, value: unknown) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  // Validate step 1
  const isStep1Valid = (): boolean => {
    if (!name.trim() || !metadata.provider?.trim()) return false;

    switch (type) {
      case 'ISA':
        if (!metadata.isa_type) return false;
        if (metadata.isa_type === 'CASH' && metadata.interest_rate === undefined) return false;
        break;
      case 'JISA':
        if (!metadata.isa_type) return false;
        if (!metadata.child_name?.trim() || !metadata.child_dob?.trim() || !metadata.contact_name?.trim()) return false;
        if (metadata.isa_type === 'CASH' && metadata.interest_rate === undefined) return false;
        break;
      case 'SIPP':
        if (!metadata.tax_relief_type) return false;
        break;
      case 'LISA':
        if (!metadata.lisa_purpose) return false;
        break;
      case 'CRYPTO':
        if (!metadata.wallet_type || !metadata.wallet_name?.trim()) return false;
        break;
      case 'SAVINGS':
        if (!metadata.savings_type || metadata.interest_rate === undefined) return false;
        if (metadata.savings_type === 'NOTICE' && !metadata.notice_period) return false;
        if (metadata.savings_type === 'FIXED_TERM' && !metadata.maturity_date?.trim()) return false;
        break;
      case 'CASH':
        if (!metadata.account_type) return false;
        break;
    }
    return true;
  };

  // Search for assets
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await assetApi.search(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  // Add holding from search result
  const addHolding = (asset: AssetSearchResult) => {
    const newHolding: HoldingEntry = {
      id: crypto.randomUUID(),
      symbol: asset.symbol,
      name: asset.name,
      quantity: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
    };
    setHoldings([...holdings, newHolding]);
    setSearchQuery('');
    setSearchResults([]);

    // Auto-fetch price
    fetchPrice(newHolding.id, asset.symbol);
  };

  const fetchPrice = async (holdingId: string, symbol: string) => {
    try {
      const details = await assetApi.getDetails(symbol);
      if (details?.price) {
        setHoldings(prev => prev.map(h =>
          h.id === holdingId ? { ...h, price: details.price.toString() } : h
        ));
      }
    } catch (err) {
      console.error('Failed to fetch price:', err);
    }
  };

  const updateHolding = (id: string, field: keyof HoldingEntry, value: string) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const removeHolding = (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  };

  // Cash entry functions
  const addCashEntry = () => {
    setCashEntries([...cashEntries, {
      id: crypto.randomUUID(),
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    }]);
  };

  const updateCashEntry = (id: string, field: keyof CashEntry, value: string) => {
    setCashEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeCashEntry = (id: string) => {
    setCashEntries(prev => prev.filter(e => e.id !== id));
  };

  // Handle step navigation
  const handleNext = async () => {
    if (currentStep === 0) {
      if (!isStep1Valid()) return;

      // Create portfolio first
      setIsLoading(true);
      setError(null);
      try {
        const portfolio = await portfolioApi.create({
          name,
          type,
          currency,
          metadata,
        });
        setCreatedPortfolio(portfolio);
        setCurrentStep(1);

        // Add default entry for step 2
        if (isCashPortfolio && cashEntries.length === 0) {
          addCashEntry();
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to create portfolio');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  // Submit holdings/deposits
  const handleSubmit = async () => {
    if (!createdPortfolio) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isCashPortfolio) {
        // Create deposit transactions
        for (const entry of cashEntries) {
          if (entry.amount && parseFloat(entry.amount) > 0) {
            await portfolioApi.createTransaction(createdPortfolio.id, {
              transaction_type: 'DEPOSIT',
              total_amount: parseFloat(entry.amount),
              currency: createdPortfolio.currency,
              transaction_date: entry.date,
              notes: entry.notes || undefined,
            });
          }
        }
      } else {
        // Create buy transactions
        for (const holding of holdings) {
          if (holding.symbol && holding.quantity && holding.price) {
            const qty = parseFloat(holding.quantity);
            const prc = parseFloat(holding.price);
            if (qty > 0 && prc > 0) {
              await portfolioApi.createTransaction(createdPortfolio.id, {
                symbol: holding.symbol,
                transaction_type: 'BUY',
                quantity: qty,
                price: prc,
                total_amount: qty * prc,
                currency: createdPortfolio.currency,
                transaction_date: holding.date,
              });
            }
          }
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to add holdings');
    } finally {
      setIsLoading(false);
    }
  };

  // Skip holdings step
  const handleSkip = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Portfolio</DialogTitle>
          <DialogDescription>
            Create a new portfolio to track your investments
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  disabled={index > currentStep}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all",
                    isCompleted && "bg-finance text-white",
                    isCurrent && "ring-2 ring-finance ring-offset-2 bg-background",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-8 ml-2",
                    index < currentStep ? "bg-finance" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Title */}
        <div className="text-center mb-4">
          <h3 className="font-medium text-lg">{steps[currentStep].title}</h3>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          {currentStep === 0 && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Name *</Label>
                  <Input
                    placeholder="Portfolio name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Type *</Label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as PortfolioType;
                      setType(newType);
                      setMetadata(getDefaultMetadata(newType));
                      setIsOtherProvider(false);
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {PORTFOLIO_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} - {t.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Provider *</Label>
                  <select
                    value={isOtherProvider ? 'OTHER' : (metadata.provider || '')}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setIsOtherProvider(true);
                        updateMetadata('provider', '');
                      } else {
                        setIsOtherProvider(false);
                        updateMetadata('provider', e.target.value);
                      }
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select provider...</option>
                    {currentProviders.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="OTHER">Other...</option>
                  </select>
                  {isOtherProvider && (
                    <Input
                      className="mt-2"
                      placeholder="Enter provider name"
                      value={metadata.provider || ''}
                      onChange={(e) => updateMetadata('provider', e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <Label>Currency</Label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* ISA/JISA specific */}
              {(type === 'ISA' || type === 'JISA') && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">{type} Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>ISA Type *</Label>
                      <select
                        value={metadata.isa_type || 'STOCKS_AND_SHARES'}
                        onChange={(e) => updateMetadata('isa_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ISA_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Tax Year Opened</Label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={metadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                  {type === 'JISA' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label>Child's Name *</Label>
                        <Input
                          placeholder="Child's full name"
                          value={metadata.child_name || ''}
                          onChange={(e) => updateMetadata('child_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Child's DOB *</Label>
                        <Input
                          type="date"
                          value={metadata.child_dob || ''}
                          onChange={(e) => updateMetadata('child_dob', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Contact Name *</Label>
                        <Input
                          placeholder="Parent/Guardian"
                          value={metadata.contact_name || ''}
                          onChange={(e) => updateMetadata('contact_name', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {metadata.isa_type === 'CASH' && (
                    <div className="w-48">
                      <Label>Interest Rate (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="4.5"
                        value={metadata.interest_rate || ''}
                        onChange={(e) => updateMetadata('interest_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SIPP specific */}
              {type === 'SIPP' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">SIPP Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Tax Relief Type *</Label>
                      <select
                        value={metadata.tax_relief_type || 'RELIEF_AT_SOURCE'}
                        onChange={(e) => updateMetadata('tax_relief_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {TAX_RELIEF_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Target Retirement Age</Label>
                      <Input
                        type="number"
                        placeholder="65"
                        value={metadata.target_retirement_age || ''}
                        onChange={(e) => updateMetadata('target_retirement_age', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LISA specific */}
              {type === 'LISA' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">LISA Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Purpose *</Label>
                      <select
                        value={metadata.lisa_purpose || 'FIRST_HOME'}
                        onChange={(e) => updateMetadata('lisa_purpose', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {LISA_PURPOSES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Tax Year Opened</Label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={metadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto specific */}
              {type === 'CRYPTO' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Crypto Wallet Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Wallet Type *</Label>
                      <select
                        value={metadata.wallet_type || 'EXCHANGE'}
                        onChange={(e) => updateMetadata('wallet_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CRYPTO_WALLET_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Wallet/Exchange Name *</Label>
                      <Input
                        placeholder="e.g., Coinbase"
                        value={metadata.wallet_name || ''}
                        onChange={(e) => updateMetadata('wallet_name', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Savings specific */}
              {type === 'SAVINGS' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Savings Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Account Type *</Label>
                      <select
                        value={metadata.savings_type || 'EASY_ACCESS'}
                        onChange={(e) => updateMetadata('savings_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {SAVINGS_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Interest Rate (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="4.5"
                        value={metadata.interest_rate || ''}
                        onChange={(e) => updateMetadata('interest_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="fscs"
                        checked={metadata.fscs_protected || false}
                        onChange={(e) => updateMetadata('fscs_protected', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="fscs" className="text-sm">FSCS Protected</label>
                    </div>
                  </div>
                  {metadata.savings_type === 'NOTICE' && (
                    <div className="w-48">
                      <Label>Notice Period (days) *</Label>
                      <Input
                        type="number"
                        placeholder="90"
                        value={metadata.notice_period || ''}
                        onChange={(e) => updateMetadata('notice_period', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                  {metadata.savings_type === 'FIXED_TERM' && (
                    <div className="w-48">
                      <Label>Maturity Date *</Label>
                      <Input
                        type="date"
                        value={metadata.maturity_date || ''}
                        onChange={(e) => updateMetadata('maturity_date', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Cash specific */}
              {type === 'CASH' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Current Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Account Type *</Label>
                      <select
                        value={metadata.account_type || 'STANDARD'}
                        onChange={(e) => updateMetadata('account_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CASH_ACCOUNT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Interest Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.5"
                        value={metadata.interest_rate || ''}
                        onChange={(e) => updateMetadata('interest_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="fscs-cash"
                        checked={metadata.fscs_protected || false}
                        onChange={(e) => updateMetadata('fscs_protected', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="fscs-cash" className="text-sm">FSCS Protected</label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              {isCashPortfolio ? (
                // Cash deposit form
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add an initial deposit to your account, or skip this step.
                  </p>

                  {cashEntries.map((entry) => (
                    <div key={entry.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Deposit</Label>
                        {cashEntries.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCashEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label>Amount ({currency})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1000.00"
                            value={entry.amount}
                            onChange={(e) => updateCashEntry(entry.id, 'amount', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={entry.date}
                            onChange={(e) => updateCashEntry(entry.id, 'date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Input
                            placeholder="Optional notes"
                            value={entry.notes}
                            onChange={(e) => updateCashEntry(entry.id, 'notes', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCashEntry}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Deposit
                  </Button>
                </div>
              ) : (
                // Investment holdings form
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Search for assets to add to your portfolio, or skip this step.
                  </p>

                  {/* Asset Search */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for stocks, ETFs, funds..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10"
                      />
                    </div>
                    <Button type="button" onClick={handleSearch} disabled={searching}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                    </Button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.symbol}
                          type="button"
                          onClick={() => addHolding(result)}
                          className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">{result.symbol}</div>
                            <div className="text-sm text-muted-foreground truncate">{result.name}</div>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Added Holdings */}
                  {holdings.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-base">Holdings to Add</Label>
                      {holdings.map((holding) => (
                        <div key={holding.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{holding.symbol}</span>
                              <span className="text-sm text-muted-foreground ml-2">{holding.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeHolding(holding.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div>
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                step="0.0001"
                                placeholder="10"
                                value={holding.quantity}
                                onChange={(e) => updateHolding(holding.id, 'quantity', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Price ({currency})</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="100.00"
                                value={holding.price}
                                onChange={(e) => updateHolding(holding.id, 'price', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Date</Label>
                              <Input
                                type="date"
                                value={holding.date}
                                onChange={(e) => updateHolding(holding.id, 'date', e.target.value)}
                              />
                            </div>
                          </div>
                          {holding.quantity && holding.price && (
                            <div className="text-sm text-muted-foreground">
                              Total: {currency} {(parseFloat(holding.quantity) * parseFloat(holding.price)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-4 border-t">
          <div>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>

            {currentStep === 0 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isLoading || !isStep1Valid()}
                className="bg-finance hover:bg-finance/90 text-white"
              >
                {isLoading ? 'Creating...' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || (isCashPortfolio ? !cashEntries.some(e => e.amount && parseFloat(e.amount) > 0) : holdings.length === 0)}
                  className="bg-finance hover:bg-finance/90 text-white"
                >
                  {isLoading ? 'Saving...' : 'Complete'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
