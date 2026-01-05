import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { portfolioApi } from '@/api/portfolios';
import { Portfolio, PortfolioSummary, PortfolioMetadata, PortfolioType } from '@/types';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/format';
import {
  Plus,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Pencil,
  Trash2,
  PiggyBank,
  Wallet,
  Shield,
  Baby,
  Bitcoin,
  Landmark,
  TrendingUp,
  Home,
} from 'lucide-react';

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

const CRYPTO_WALLET_TYPES = [
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'HARDWARE', label: 'Hardware Wallet' },
  { value: 'SOFTWARE', label: 'Software Wallet' },
];

const TAX_RELIEF_TYPES = [
  { value: 'RELIEF_AT_SOURCE', label: 'Relief at Source' },
  { value: 'NET_PAY', label: 'Net Pay' },
];

const LISA_PURPOSES = [
  { value: 'FIRST_HOME', label: 'First Home Purchase' },
  { value: 'RETIREMENT', label: 'Retirement' },
];

// Get icon and color for portfolio type
const getPortfolioTypeStyle = (type: string, metadata?: PortfolioMetadata) => {
  switch (type) {
    case 'GIA':
      return { icon: TrendingUp, color: 'bg-blue-100 text-blue-600', label: 'GIA' };
    case 'ISA':
      return {
        icon: Shield,
        color: 'bg-green-100 text-green-600',
        label: metadata?.isa_type === 'CASH' ? 'Cash ISA' : 'S&S ISA'
      };
    case 'SIPP':
      return { icon: Landmark, color: 'bg-purple-100 text-purple-600', label: 'SIPP' };
    case 'LISA':
      return {
        icon: metadata?.lisa_purpose === 'FIRST_HOME' ? Home : PiggyBank,
        color: 'bg-amber-100 text-amber-600',
        label: 'LISA'
      };
    case 'JISA':
      return { icon: Baby, color: 'bg-pink-100 text-pink-600', label: 'JISA' };
    case 'CRYPTO':
      return { icon: Bitcoin, color: 'bg-orange-100 text-orange-600', label: 'Crypto' };
    case 'SAVINGS':
      return { icon: PiggyBank, color: 'bg-emerald-100 text-emerald-600', label: 'Savings' };
    case 'CASH':
      return { icon: Wallet, color: 'bg-slate-100 text-slate-600', label: 'Cash' };
    case 'FIXED_ASSETS':
      return { icon: Home, color: 'bg-stone-100 text-stone-600', label: 'Fixed Assets' };
    default:
      return { icon: Briefcase, color: 'bg-gray-100 text-gray-600', label: type };
  }
};

export function Portfolios() {
  const location = useLocation();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [summaries, setSummaries] = useState<Map<string, PortfolioSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  // Delete state
  const [deletingPortfolio, setDeletingPortfolio] = useState<Portfolio | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PortfolioType>('GIA');
  const [newCurrency, setNewCurrency] = useState('GBP');
  const [metadata, setMetadata] = useState<PortfolioMetadata>({});

  const loadPortfolios = async () => {
    try {
      const data = await portfolioApi.list();
      setPortfolios(data);

      const summaryMap = new Map<string, PortfolioSummary>();
      await Promise.all(
        data.map(async (p) => {
          try {
            const summary = await portfolioApi.getSummary(p.id);
            summaryMap.set(p.id, summary);
          } catch {
            // Ignore errors for individual summaries
          }
        })
      );
      setSummaries(summaryMap);
    } catch (error) {
      console.error('Failed to load portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  // Check for edit request from navigation state (e.g., from PortfolioDetail page)
  useEffect(() => {
    const state = location.state as { editPortfolioId?: string } | null;
    if (state?.editPortfolioId) {
      setPendingEditId(state.editPortfolioId);
      // Clear the state so refreshing doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Trigger edit when portfolios are loaded and we have a pending edit
  useEffect(() => {
    if (pendingEditId && portfolios.length > 0) {
      const portfolio = portfolios.find(p => p.id === pendingEditId);
      if (portfolio) {
        startEdit(portfolio);
      }
      setPendingEditId(null);
    }
  }, [pendingEditId, portfolios]);

  const resetForm = () => {
    setNewName('');
    setNewType('GIA');
    setNewCurrency('GBP');
    setMetadata(getDefaultMetadata('GIA'));
    setError(null);
    setShowCreate(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await portfolioApi.create({
        name: newName,
        type: newType,
        currency: newCurrency,
        metadata,
      });
      resetForm();
      loadPortfolios();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to create portfolio';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const updateMetadata = (field: keyof PortfolioMetadata, value: any) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const startEdit = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setNewName(portfolio.name);
    setNewType(portfolio.type as PortfolioType);
    setNewCurrency(portfolio.currency);
    // Merge existing metadata with defaults for the type
    const defaults = getDefaultMetadata(portfolio.type as PortfolioType);
    setMetadata({ ...defaults, ...portfolio.metadata });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingPortfolio(null);
    setNewName('');
    setNewType('GIA');
    setNewCurrency('GBP');
    setMetadata(getDefaultMetadata('GIA'));
    setError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPortfolio || !newName.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await portfolioApi.update(editingPortfolio.id, {
        name: newName,
        currency: newCurrency,
        metadata,
      });
      cancelEdit();
      loadPortfolios();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to update portfolio';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPortfolio) return;

    setDeleting(true);
    try {
      await portfolioApi.delete(deletingPortfolio.id);
      setDeletingPortfolio(null);
      loadPortfolios();
    } catch (err: any) {
      console.error('Failed to delete portfolio:', err);
      setDeletingPortfolio(null);
    } finally {
      setDeleting(false);
    }
  };

  // Validate required fields based on portfolio type
  const isFormValid = (type: PortfolioType, name: string, meta: PortfolioMetadata): boolean => {
    // Common required fields
    if (!name.trim() || !meta.provider?.trim()) return false;

    // Type-specific required fields
    switch (type) {
      case 'ISA':
        if (!meta.isa_type) return false;
        if (meta.isa_type === 'CASH' && (meta.interest_rate === undefined || meta.interest_rate === null)) return false;
        break;
      case 'JISA':
        if (!meta.isa_type) return false;
        if (!meta.child_name?.trim() || !meta.child_dob?.trim() || !meta.contact_name?.trim()) return false;
        if (meta.isa_type === 'CASH' && (meta.interest_rate === undefined || meta.interest_rate === null)) return false;
        break;
      case 'SIPP':
        if (!meta.tax_relief_type) return false;
        break;
      case 'LISA':
        if (!meta.lisa_purpose) return false;
        break;
      case 'CRYPTO':
        if (!meta.wallet_type || !meta.wallet_name?.trim()) return false;
        break;
      case 'SAVINGS':
        if (!meta.savings_type) return false;
        if (meta.interest_rate === undefined || meta.interest_rate === null) return false;
        if (meta.savings_type === 'NOTICE' && !meta.notice_period) return false;
        if (meta.savings_type === 'FIXED_TERM' && !meta.maturity_date?.trim()) return false;
        break;
      case 'CASH':
        if (!meta.account_type) return false;
        break;
    }
    return true;
  };

  // Get default metadata for a portfolio type
  const getDefaultMetadata = (type: PortfolioType): PortfolioMetadata => {
    switch (type) {
      case 'ISA':
        return { isa_type: 'STOCKS_AND_SHARES' };
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

  const getContributionWarning = (portfolio: Portfolio) => {
    if (!portfolio.metadata?.contribution_limit) return null;
    const contributions = portfolio.metadata.contributions_this_year || 0;
    const limit = portfolio.metadata.contribution_limit;
    const percentage = (contributions / limit) * 100;

    if (percentage >= 100) {
      return { level: 'error', message: 'Contribution limit reached' };
    } else if (percentage >= 80) {
      return { level: 'warning', message: `${formatCurrency(limit - contributions, portfolio.currency)} remaining` };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolios</h1>
          <p className="text-muted-foreground">Manage your investment portfolios</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!!editingPortfolio}>
          <Plus className="mr-2 h-4 w-4" /> Add Portfolio
        </Button>
      </div>

      {/* Create Portfolio Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Portfolio name"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const type = e.target.value as PortfolioType;
                      setNewType(type);
                      setMetadata(getDefaultMetadata(type));
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {PORTFOLIO_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Provider</label>
                  <Input
                    placeholder="e.g., Hargreaves Lansdown, Vanguard"
                    value={metadata.provider || ''}
                    onChange={(e) => updateMetadata('provider', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Account Reference (optional)</label>
                  <Input
                    placeholder="Account number or reference"
                    value={metadata.account_reference || ''}
                    onChange={(e) => updateMetadata('account_reference', e.target.value)}
                  />
                </div>
              </div>

              {/* ISA Specific */}
              {(newType === 'ISA' || newType === 'JISA') && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">{newType} Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">ISA Type</label>
                      <select
                        value={metadata.isa_type || 'STOCKS_AND_SHARES'}
                        onChange={(e) => updateMetadata('isa_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ISA_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tax Year Opened</label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={metadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                  {newType === 'JISA' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium">Child's Name</label>
                        <Input
                          placeholder="Child's full name"
                          value={metadata.child_name || ''}
                          onChange={(e) => updateMetadata('child_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Child's Date of Birth</label>
                        <Input
                          type="date"
                          value={metadata.child_dob || ''}
                          onChange={(e) => updateMetadata('child_dob', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registered Contact</label>
                        <Input
                          placeholder="Parent/Guardian name"
                          value={metadata.contact_name || ''}
                          onChange={(e) => updateMetadata('contact_name', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {metadata.isa_type === 'CASH' && (
                    <div className="w-48">
                      <label className="text-sm font-medium">Interest Rate (%)</label>
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

              {/* SIPP Specific */}
              {newType === 'SIPP' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">SIPP Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Tax Relief Type</label>
                      <select
                        value={metadata.tax_relief_type || 'RELIEF_AT_SOURCE'}
                        onChange={(e) => updateMetadata('tax_relief_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {TAX_RELIEF_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Target Retirement Age</label>
                      <Input
                        type="number"
                        placeholder="65"
                        value={metadata.target_retirement_age || ''}
                        onChange={(e) => updateMetadata('target_retirement_age', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Crystallised Amount</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={metadata.crystallised_amount || ''}
                        onChange={(e) => updateMetadata('crystallised_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LISA Specific */}
              {newType === 'LISA' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">LISA Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Purpose</label>
                      <select
                        value={metadata.lisa_purpose || 'FIRST_HOME'}
                        onChange={(e) => updateMetadata('lisa_purpose', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {LISA_PURPOSES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tax Year Opened</label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={metadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto Specific */}
              {newType === 'CRYPTO' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Crypto Wallet Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Wallet Type</label>
                      <select
                        value={metadata.wallet_type || 'EXCHANGE'}
                        onChange={(e) => updateMetadata('wallet_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CRYPTO_WALLET_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Exchange/Wallet Name</label>
                      <Input
                        placeholder="e.g., Coinbase, Ledger"
                        value={metadata.wallet_name || ''}
                        onChange={(e) => updateMetadata('wallet_name', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Savings Specific */}
              {newType === 'SAVINGS' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Savings Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Account Type</label>
                      <select
                        value={metadata.savings_type || 'EASY_ACCESS'}
                        onChange={(e) => updateMetadata('savings_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {SAVINGS_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Interest Rate (%)</label>
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
                      <label className="text-sm font-medium">Notice Period (days)</label>
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
                      <label className="text-sm font-medium">Maturity Date</label>
                      <Input
                        type="date"
                        value={metadata.maturity_date || ''}
                        onChange={(e) => updateMetadata('maturity_date', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Cash Specific */}
              {newType === 'CASH' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Current Account Details</h4>
                  <p className="text-sm text-muted-foreground">Use the Provider field above for the Bank Name</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Account Type</label>
                      <select
                        value={metadata.account_type || 'STANDARD'}
                        onChange={(e) => updateMetadata('account_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CASH_ACCOUNT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Interest Rate (% optional)</label>
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

              <div className="flex gap-2">
                <Button type="submit" disabled={creating || !isFormValid(newType, newName, metadata)}>
                  {creating ? 'Creating...' : 'Create Portfolio'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Portfolio Form */}
      {editingPortfolio && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Portfolio: {editingPortfolio.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEdit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Basic Info - Type is read-only */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Portfolio name"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Input
                    value={PORTFOLIO_TYPES.find(t => t.value === editingPortfolio.type)?.label || editingPortfolio.type}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Provider</label>
                  <Input
                    placeholder="e.g., Hargreaves Lansdown, Vanguard"
                    value={metadata.provider || ''}
                    onChange={(e) => updateMetadata('provider', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Account Reference (optional)</label>
                  <Input
                    placeholder="Account number or reference"
                    value={metadata.account_reference || ''}
                    onChange={(e) => updateMetadata('account_reference', e.target.value)}
                  />
                </div>
              </div>

              {/* ISA Specific */}
              {(editingPortfolio.type === 'ISA' || editingPortfolio.type === 'JISA') && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">{editingPortfolio.type} Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">ISA Type</label>
                      <select
                        value={metadata.isa_type || 'STOCKS_AND_SHARES'}
                        onChange={(e) => updateMetadata('isa_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ISA_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tax Year Opened</label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={metadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                  {editingPortfolio.type === 'JISA' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium">Child's Name</label>
                        <Input
                          placeholder="Child's full name"
                          value={metadata.child_name || ''}
                          onChange={(e) => updateMetadata('child_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Child's Date of Birth</label>
                        <Input
                          type="date"
                          value={metadata.child_dob || ''}
                          onChange={(e) => updateMetadata('child_dob', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registered Contact</label>
                        <Input
                          placeholder="Parent/Guardian name"
                          value={metadata.contact_name || ''}
                          onChange={(e) => updateMetadata('contact_name', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {metadata.isa_type === 'CASH' && (
                    <div className="w-48">
                      <label className="text-sm font-medium">Interest Rate (%)</label>
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

              {/* SIPP Specific */}
              {editingPortfolio.type === 'SIPP' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">SIPP Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Tax Relief Type</label>
                      <select
                        value={metadata.tax_relief_type || 'RELIEF_AT_SOURCE'}
                        onChange={(e) => updateMetadata('tax_relief_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {TAX_RELIEF_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Target Retirement Age</label>
                      <Input
                        type="number"
                        placeholder="65"
                        value={metadata.target_retirement_age || ''}
                        onChange={(e) => updateMetadata('target_retirement_age', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Crystallised Amount</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={metadata.crystallised_amount || ''}
                        onChange={(e) => updateMetadata('crystallised_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LISA Specific */}
              {editingPortfolio.type === 'LISA' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">LISA Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Purpose</label>
                      <select
                        value={metadata.lisa_purpose || 'FIRST_HOME'}
                        onChange={(e) => updateMetadata('lisa_purpose', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {LISA_PURPOSES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tax Year Opened</label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={metadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto Specific */}
              {editingPortfolio.type === 'CRYPTO' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Crypto Wallet Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Wallet Type</label>
                      <select
                        value={metadata.wallet_type || 'EXCHANGE'}
                        onChange={(e) => updateMetadata('wallet_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CRYPTO_WALLET_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Exchange/Wallet Name</label>
                      <Input
                        placeholder="e.g., Coinbase, Ledger"
                        value={metadata.wallet_name || ''}
                        onChange={(e) => updateMetadata('wallet_name', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Savings Specific */}
              {editingPortfolio.type === 'SAVINGS' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Savings Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Account Type</label>
                      <select
                        value={metadata.savings_type || 'EASY_ACCESS'}
                        onChange={(e) => updateMetadata('savings_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {SAVINGS_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Interest Rate (%)</label>
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
                      <label className="text-sm font-medium">Notice Period (days)</label>
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
                      <label className="text-sm font-medium">Maturity Date</label>
                      <Input
                        type="date"
                        value={metadata.maturity_date || ''}
                        onChange={(e) => updateMetadata('maturity_date', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Cash Specific */}
              {editingPortfolio.type === 'CASH' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Current Account Details</h4>
                  <p className="text-sm text-muted-foreground">Use the Provider field above for the Bank Name</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Account Type</label>
                      <select
                        value={metadata.account_type || 'STANDARD'}
                        onChange={(e) => updateMetadata('account_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CASH_ACCOUNT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Interest Rate (% optional)</label>
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

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !isFormValid(editingPortfolio.type as PortfolioType, newName, metadata)}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingPortfolio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{deletingPortfolio.name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will permanently delete the portfolio and all associated holdings and transactions. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeletingPortfolio(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Portfolio List */}
      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No portfolios yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first portfolio to start tracking your investments
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => {
            const summary = summaries.get(portfolio.id);
            const warning = getContributionWarning(portfolio);
            const typeStyle = getPortfolioTypeStyle(portfolio.type, portfolio.metadata);
            const TypeIcon = typeStyle.icon;
            return (
              <Card key={portfolio.id} className="h-full flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${typeStyle.color}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg truncate">{portfolio.name}</CardTitle>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${typeStyle.color}`}>
                          {typeStyle.label}
                        </span>
                      </div>
                      {portfolio.metadata?.provider && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{portfolio.metadata.provider}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  {summary ? (
                    <div className="space-y-3 flex-1">
                      <div>
                        <span className="text-2xl font-bold">
                          {formatCurrency(summary.total_value, portfolio.currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted/50 rounded-md p-2">
                          <div className="text-xs text-muted-foreground">Gain/Loss</div>
                          <div className={`font-medium ${getChangeColor(summary.unrealised_gain)}`}>
                            {formatPercentage(summary.unrealised_pct)}
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <div className="text-xs text-muted-foreground">Holdings</div>
                          <div className="font-medium">{summary.holdings_count}</div>
                        </div>
                      </div>
                      {warning && (
                        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${warning.level === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          {warning.message}
                        </div>
                      )}
                      {portfolio.metadata?.interest_rate && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                          {portfolio.metadata.interest_rate}% interest rate
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm flex-1 flex items-center justify-center">
                      Loading...
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <Link
                      to={portfolio.type === 'FIXED_ASSETS' ? '/fixed-assets' : `/portfolios/${portfolio.id}`}
                      className="flex items-center text-sm text-primary hover:underline font-medium"
                    >
                      {portfolio.type === 'FIXED_ASSETS' ? 'Manage assets' : 'View details'} <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                    {portfolio.type !== 'FIXED_ASSETS' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            startEdit(portfolio);
                          }}
                          className="h-8 w-8 p-0"
                          title="Edit portfolio"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeletingPortfolio(portfolio);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete portfolio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
