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
import { useAuthStore } from '@/store/auth';
import { getProvidersForType, parseProviderLists } from '@/constants/providers';
import { Portfolio, PortfolioMetadata, PortfolioType } from '@/types';

interface EditPortfolioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: Portfolio | null;
  onSuccess: () => void;
}

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

const PORTFOLIO_TYPE_LABELS: Record<string, string> = {
  'GIA': 'General Investment Account',
  'ISA': 'Individual Savings Account',
  'SIPP': 'Self-Invested Personal Pension',
  'LISA': 'Lifetime ISA',
  'JISA': 'Junior ISA',
  'CRYPTO': 'Cryptocurrency Wallet',
  'SAVINGS': 'Savings Account',
  'CASH': 'Cash / Bank Account',
};

export function EditPortfolioModal({ open, onOpenChange, portfolio, onSuccess }: EditPortfolioModalProps) {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [metadata, setMetadata] = useState<PortfolioMetadata>({});
  const [isOtherProvider, setIsOtherProvider] = useState(false);

  const providerLists = parseProviderLists(user?.provider_lists);
  const currentProviders = portfolio ? getProvidersForType(providerLists, portfolio.type) : [];

  // Reset form when portfolio changes
  useEffect(() => {
    if (portfolio && open) {
      setName(portfolio.name);
      setCurrency(portfolio.currency);
      setMetadata(portfolio.metadata || {});
      const currentProvider = portfolio.metadata?.provider || '';
      setIsOtherProvider(currentProvider !== '' && !currentProviders.includes(currentProvider));
      setError(null);
    }
  }, [portfolio, open, currentProviders]);

  const updateMetadata = (field: keyof PortfolioMetadata, value: unknown) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = (): boolean => {
    if (!portfolio) return false;
    if (!name.trim() || !metadata.provider?.trim()) return false;

    const type = portfolio.type as PortfolioType;

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

  const handleSubmit = async () => {
    if (!portfolio || !isFormValid()) return;

    setIsLoading(true);
    setError(null);

    try {
      await portfolioApi.update(portfolio.id, {
        name,
        currency,
        metadata,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  if (!portfolio) return null;

  const type = portfolio.type as PortfolioType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Portfolio</DialogTitle>
          <DialogDescription>
            Update {portfolio.name} settings
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Portfolio name"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Input
                value={PORTFOLIO_TYPE_LABELS[type] || type}
                disabled
                className="bg-muted"
              />
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

          <div>
            <Label>Account Reference</Label>
            <Input
              placeholder="Account number or reference"
              value={metadata.account_reference || ''}
              onChange={(e) => updateMetadata('account_reference', e.target.value)}
            />
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
                    id="fscs-edit"
                    checked={metadata.fscs_protected || false}
                    onChange={(e) => updateMetadata('fscs_protected', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="fscs-edit" className="text-sm">FSCS Protected</label>
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
                    id="fscs-cash-edit"
                    checked={metadata.fscs_protected || false}
                    onChange={(e) => updateMetadata('fscs_protected', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="fscs-cash-edit" className="text-sm">FSCS Protected</label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
            className="bg-finance hover:bg-finance/90 text-white"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
