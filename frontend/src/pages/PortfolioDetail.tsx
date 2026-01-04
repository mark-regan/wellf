import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { portfolioApi } from '@/api/portfolios';
import { assetApi } from '@/api/assets';
import { Portfolio, Holding, Transaction, AssetSearchResult, PortfolioMetadata, PortfolioType } from '@/types';
import { formatCurrency, formatPercentage, formatDate, getChangeColor } from '@/utils/format';
import { ArrowLeft, Plus, Trash2, Search, Loader2, Wallet, TrendingUp, TrendingDown, Pencil, Building2, Calendar, User, CreditCard, Percent, Shield, Clock, X } from 'lucide-react';

// Type constants for edit form
const ISA_TYPES = [
  { value: 'STOCKS_AND_SHARES', label: 'Stocks & Shares' },
  { value: 'CASH', label: 'Cash ISA' },
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

export function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Add transaction form
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<'BUY' | 'DEPOSIT'>('BUY');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceAutoFetched, setPriceAutoFetched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editMetadata, setEditMetadata] = useState<PortfolioMetadata>({});

  const isCashPortfolio = portfolio?.type === 'CASH';

  // Start editing
  const startEditing = () => {
    if (!portfolio) return;
    setEditName(portfolio.name);
    setEditCurrency(portfolio.currency);
    setEditMetadata(portfolio.metadata || {});
    setEditError(null);
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditError(null);
  };

  // Update metadata field
  const updateMetadata = (field: keyof PortfolioMetadata, value: any) => {
    setEditMetadata(prev => ({ ...prev, [field]: value }));
  };

  // Validate form
  const isFormValid = (): boolean => {
    if (!editName.trim() || !editMetadata.provider?.trim()) return false;
    if (!portfolio) return false;

    const type = portfolio.type as PortfolioType;
    const meta = editMetadata;

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

  // Save edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolio || !id) return;

    setSaving(true);
    setEditError(null);
    try {
      await portfolioApi.update(id, {
        name: editName,
        currency: editCurrency,
        metadata: editMetadata,
      });
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to update portfolio';
      setEditError(message);
    } finally {
      setSaving(false);
    }
  };

  const loadData = async () => {
    if (!id) return;
    try {
      const [portfolioData, txData] = await Promise.all([
        portfolioApi.get(id),
        portfolioApi.getTransactions(id, 1, 100),
      ]);
      setPortfolio(portfolioData);
      setTransactions(txData.data);

      if (portfolioData.type !== 'CASH') {
        const holdingsData = await portfolioApi.getHoldings(id);
        setHoldings(holdingsData);
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    try {
      const results = await assetApi.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleDateChange = async (date: string) => {
    setTransactionDate(date);
    if (!date || !selectedAsset) return;

    setFetchingPrice(true);
    try {
      const response = await assetApi.getHistoricalPrice(selectedAsset.symbol, date);
      setPrice(response.price.toFixed(2));
      setPriceAutoFetched(true);
    } catch (error) {
      console.error('Failed to fetch historical price:', error);
      setPriceAutoFetched(false);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    setPriceAutoFetched(false);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setAdding(true);
    setError(null);
    try {
      if (isCashPortfolio) {
        // DEPOSIT or WITHDRAWAL for cash portfolios
        await portfolioApi.createTransaction(id, {
          transaction_type: transactionType === 'BUY' ? 'DEPOSIT' : 'WITHDRAWAL',
          total_amount: parseFloat(amount),
          currency: portfolio?.currency,
          transaction_date: transactionDate,
          notes,
        });
      } else {
        // BUY or SELL for investment portfolios
        if (!selectedAsset) return;
        await portfolioApi.createTransaction(id, {
          symbol: selectedAsset.symbol,
          transaction_type: transactionType,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          total_amount: parseFloat(quantity) * parseFloat(price),
          currency: portfolio?.currency,
          transaction_date: transactionDate,
          notes,
        });
      }

      // Reset form
      setShowAddTransaction(false);
      setSelectedAsset(null);
      setQuantity('');
      setPrice('');
      setAmount('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setPriceAutoFetched(false);
      setSearchQuery('');
      setSearchResults([]);
      setNotes('');
      setError(null);
      loadData();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to add transaction';
      setError(message);
      console.error('Failed to add transaction:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    if (!confirm('Are you sure you want to delete this holding? This will not delete associated transactions.')) return;
    try {
      await portfolioApi.deleteHolding(holdingId);
      loadData();
    } catch (error) {
      console.error('Failed to delete holding:', error);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await portfolioApi.deleteTransaction(txId);
      loadData();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await portfolioApi.delete(id);
      navigate('/portfolios');
    } catch (error) {
      console.error('Failed to delete portfolio:', error);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Helper to get type label
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'GIA': 'General Investment Account',
      'ISA': 'Individual Savings Account',
      'SIPP': 'Self-Invested Personal Pension',
      'LISA': 'Lifetime ISA',
      'JISA': 'Junior ISA',
      'CRYPTO': 'Cryptocurrency Wallet',
      'SAVINGS': 'Savings Account',
      'CASH': 'Cash / Bank Account',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium mb-2">Portfolio not found</h2>
        <Button onClick={() => navigate('/portfolios')}>Go back</Button>
      </div>
    );
  }

  // Calculate totals
  const cashBalance = transactions
    .filter(tx => tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'WITHDRAWAL')
    .reduce((sum, tx) => {
      if (tx.transaction_type === 'DEPOSIT') return sum + tx.total_amount;
      if (tx.transaction_type === 'WITHDRAWAL') return sum - tx.total_amount;
      return sum;
    }, 0);

  const totalValue = isCashPortfolio
    ? cashBalance
    : holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.average_cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Render CASH portfolio view
  if (isCashPortfolio) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portfolios')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{portfolio.name}</h1>
              <p className="text-muted-foreground">{getTypeLabel(portfolio.type)} - {portfolio.currency}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={startEditing} disabled={isEditing}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isEditing}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Delete Portfolio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Are you sure you want to delete <strong>{portfolio.name}</strong>?</p>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete the portfolio and all associated transactions. This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeletePortfolio} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Form */}
        {isEditing && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Edit Portfolio</CardTitle>
              <Button variant="ghost" size="icon" onClick={cancelEditing}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {editError}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Input value={getTypeLabel(portfolio.type)} disabled className="bg-muted" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Provider (Bank Name)</label>
                    <Input
                      placeholder="e.g., Barclays, HSBC"
                      value={editMetadata.provider || ''}
                      onChange={(e) => updateMetadata('provider', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Account Reference (optional)</label>
                    <Input
                      placeholder="Account number"
                      value={editMetadata.account_reference || ''}
                      onChange={(e) => updateMetadata('account_reference', e.target.value)}
                    />
                  </div>
                </div>

                {/* Cash-specific fields */}
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Account Type</label>
                      <select
                        value={editMetadata.account_type || 'STANDARD'}
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
                        value={editMetadata.interest_rate || ''}
                        onChange={(e) => updateMetadata('interest_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="fscs-edit"
                        checked={editMetadata.fscs_protected || false}
                        onChange={(e) => updateMetadata('fscs_protected', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="fscs-edit" className="text-sm">FSCS Protected</label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving || !isFormValid()}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEditing}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Portfolio Information - hidden when editing */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">{portfolio.metadata?.provider || '-'}</p>
                  </div>
                </div>
                {portfolio.metadata?.bank_name && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-medium">{portfolio.metadata.bank_name}</p>
                    </div>
                  </div>
                )}
                {portfolio.metadata?.account_reference && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Account Reference</p>
                      <p className="font-medium">{portfolio.metadata.account_reference}</p>
                    </div>
                  </div>
                )}
                {portfolio.metadata?.interest_rate !== undefined && portfolio.metadata.interest_rate > 0 && (
                  <div className="flex items-center gap-3">
                    <Percent className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="font-medium">{portfolio.metadata.interest_rate}%</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cash Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Cash Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(cashBalance, portfolio.currency)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {transactions.filter(tx => tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'WITHDRAWAL').length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => { setTransactionType('BUY'); setShowAddTransaction(true); }}>
                <TrendingUp className="mr-2 h-4 w-4" /> Deposit
              </Button>
              <Button variant="outline" onClick={() => { setTransactionType('SELL' as any); setShowAddTransaction(true); }}>
                <TrendingDown className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddTransaction && (
              <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium mb-4">
                  {transactionType === 'BUY' ? 'Add Deposit' : 'Add Withdrawal'}
                </h3>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      {error}
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Amount ({portfolio.currency})</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="1000.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes (optional)</label>
                      <Input
                        placeholder="e.g., Monthly savings"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={adding}>
                      {adding ? 'Adding...' : transactionType === 'BUY' ? 'Add Deposit' : 'Add Withdrawal'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowAddTransaction(false); setError(null); }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">{tx.transaction_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(tx.transaction_date)}
                        {tx.notes && ` - ${tx.notes}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`text-xl font-bold ${tx.transaction_type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'DEPOSIT' ? '+' : '-'}
                        {formatCurrency(tx.total_amount, tx.currency)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTransaction(tx.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular portfolio view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portfolios')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{portfolio.name}</h1>
            <p className="text-muted-foreground">{getTypeLabel(portfolio.type)} - {portfolio.currency}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startEditing} disabled={isEditing}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isEditing}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Are you sure you want to delete <strong>{portfolio.name}</strong>?</p>
              <p className="text-sm text-muted-foreground">
                This will permanently delete the portfolio and all associated holdings and transactions. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeletePortfolio} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inline Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edit Portfolio</CardTitle>
            <Button variant="ghost" size="icon" onClick={cancelEditing}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {editError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Input value={getTypeLabel(portfolio.type)} disabled className="bg-muted" />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Provider</label>
                  <Input
                    placeholder="e.g., Hargreaves Lansdown, Vanguard"
                    value={editMetadata.provider || ''}
                    onChange={(e) => updateMetadata('provider', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Account Reference (optional)</label>
                  <Input
                    placeholder="Account number"
                    value={editMetadata.account_reference || ''}
                    onChange={(e) => updateMetadata('account_reference', e.target.value)}
                  />
                </div>
              </div>

              {/* ISA/JISA specific */}
              {(portfolio.type === 'ISA' || portfolio.type === 'JISA') && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">{portfolio.type} Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">ISA Type</label>
                      <select
                        value={editMetadata.isa_type || 'STOCKS_AND_SHARES'}
                        onChange={(e) => updateMetadata('isa_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ISA_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tax Year Opened (optional)</label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={editMetadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                  {portfolio.type === 'JISA' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium">Child's Name</label>
                        <Input
                          value={editMetadata.child_name || ''}
                          onChange={(e) => updateMetadata('child_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Child's Date of Birth</label>
                        <Input
                          type="date"
                          value={editMetadata.child_dob || ''}
                          onChange={(e) => updateMetadata('child_dob', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registered Contact</label>
                        <Input
                          value={editMetadata.contact_name || ''}
                          onChange={(e) => updateMetadata('contact_name', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {editMetadata.isa_type === 'CASH' && (
                    <div className="w-48">
                      <label className="text-sm font-medium">Interest Rate (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editMetadata.interest_rate || ''}
                        onChange={(e) => updateMetadata('interest_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SIPP specific */}
              {portfolio.type === 'SIPP' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">SIPP Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Tax Relief Type</label>
                      <select
                        value={editMetadata.tax_relief_type || 'RELIEF_AT_SOURCE'}
                        onChange={(e) => updateMetadata('tax_relief_type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {TAX_RELIEF_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Target Retirement Age (optional)</label>
                      <Input
                        type="number"
                        value={editMetadata.target_retirement_age || ''}
                        onChange={(e) => updateMetadata('target_retirement_age', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Crystallised Amount (optional)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editMetadata.crystallised_amount || ''}
                        onChange={(e) => updateMetadata('crystallised_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LISA specific */}
              {portfolio.type === 'LISA' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">LISA Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Purpose</label>
                      <select
                        value={editMetadata.lisa_purpose || 'FIRST_HOME'}
                        onChange={(e) => updateMetadata('lisa_purpose', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {LISA_PURPOSES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tax Year Opened (optional)</label>
                      <Input
                        placeholder="e.g., 2024/25"
                        value={editMetadata.tax_year || ''}
                        onChange={(e) => updateMetadata('tax_year', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto specific */}
              {portfolio.type === 'CRYPTO' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Crypto Wallet Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Wallet Type</label>
                      <select
                        value={editMetadata.wallet_type || 'EXCHANGE'}
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
                        value={editMetadata.wallet_name || ''}
                        onChange={(e) => updateMetadata('wallet_name', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Savings specific */}
              {portfolio.type === 'SAVINGS' && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h4 className="font-medium">Savings Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Account Type</label>
                      <select
                        value={editMetadata.savings_type || 'EASY_ACCESS'}
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
                        value={editMetadata.interest_rate || ''}
                        onChange={(e) => updateMetadata('interest_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="fscs-savings-edit"
                        checked={editMetadata.fscs_protected || false}
                        onChange={(e) => updateMetadata('fscs_protected', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="fscs-savings-edit" className="text-sm">FSCS Protected</label>
                    </div>
                  </div>
                  {editMetadata.savings_type === 'NOTICE' && (
                    <div className="w-48">
                      <label className="text-sm font-medium">Notice Period (days)</label>
                      <Input
                        type="number"
                        value={editMetadata.notice_period || ''}
                        onChange={(e) => updateMetadata('notice_period', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                  {editMetadata.savings_type === 'FIXED_TERM' && (
                    <div className="w-48">
                      <label className="text-sm font-medium">Maturity Date</label>
                      <Input
                        type="date"
                        value={editMetadata.maturity_date || ''}
                        onChange={(e) => updateMetadata('maturity_date', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !isFormValid()}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Information - hidden when editing */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portfolio Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{portfolio.metadata?.provider || '-'}</p>
                </div>
              </div>
              {portfolio.metadata?.account_reference && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Account Reference</p>
                    <p className="font-medium">{portfolio.metadata.account_reference}</p>
                  </div>
                </div>
              )}
              {/* ISA/JISA specific */}
              {portfolio.metadata?.isa_type && (
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">ISA Type</p>
                    <p className="font-medium">{portfolio.metadata.isa_type === 'STOCKS_AND_SHARES' ? 'Stocks & Shares' : 'Cash'}</p>
                  </div>
                </div>
              )}
              {portfolio.metadata?.tax_year && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Year</p>
                    <p className="font-medium">{portfolio.metadata.tax_year}</p>
                  </div>
                </div>
              )}
              {/* JISA specific */}
              {portfolio.metadata?.child_name && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Child's Name</p>
                    <p className="font-medium">{portfolio.metadata.child_name}</p>
                  </div>
                </div>
              )}
              {/* SIPP specific */}
              {portfolio.metadata?.tax_relief_type && (
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Relief</p>
                    <p className="font-medium">{portfolio.metadata.tax_relief_type === 'RELIEF_AT_SOURCE' ? 'Relief at Source' : 'Net Pay'}</p>
                  </div>
                </div>
              )}
              {portfolio.metadata?.target_retirement_age && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Target Retirement Age</p>
                    <p className="font-medium">{portfolio.metadata.target_retirement_age}</p>
                  </div>
                </div>
              )}
              {/* LISA specific */}
              {portfolio.metadata?.lisa_purpose && (
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-medium">{portfolio.metadata.lisa_purpose === 'FIRST_HOME' ? 'First Home' : 'Retirement'}</p>
                  </div>
                </div>
              )}
              {/* Crypto specific */}
              {portfolio.metadata?.wallet_type && (
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Wallet Type</p>
                    <p className="font-medium">{portfolio.metadata.wallet_type}</p>
                  </div>
                </div>
              )}
              {portfolio.metadata?.wallet_name && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Exchange/Wallet</p>
                    <p className="font-medium">{portfolio.metadata.wallet_name}</p>
                  </div>
                </div>
              )}
              {/* Savings specific */}
              {portfolio.metadata?.savings_type && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Account Type</p>
                    <p className="font-medium">{portfolio.metadata.savings_type.replace('_', ' ')}</p>
                  </div>
                </div>
              )}
              {portfolio.metadata?.interest_rate !== undefined && portfolio.metadata.interest_rate > 0 && (
                <div className="flex items-center gap-3">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{portfolio.metadata.interest_rate}%</p>
                  </div>
                </div>
              )}
              {portfolio.metadata?.notice_period && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notice Period</p>
                    <p className="font-medium">{portfolio.metadata.notice_period} days</p>
                  </div>
                </div>
              )}
              {portfolio.metadata?.maturity_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Maturity Date</p>
                    <p className="font-medium">{formatDate(portfolio.metadata.maturity_date)}</p>
                  </div>
                </div>
              )}
              {portfolio.metadata?.fscs_protected && (
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">FSCS Protected</p>
                    <p className="font-medium text-green-600">Yes</p>
                  </div>
                </div>
              )}
              {/* Contribution tracking */}
              {portfolio.metadata?.contribution_limit && (
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contributions</p>
                    <p className="font-medium">
                      {formatCurrency(portfolio.metadata.contributions_this_year || 0, portfolio.currency)} / {formatCurrency(portfolio.metadata.contribution_limit, portfolio.currency)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue, portfolio.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCost, portfolio.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Unrealised Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getChangeColor(totalGain)}`}>
              {formatCurrency(totalGain, portfolio.currency)}
            </div>
            <div className={`text-sm ${getChangeColor(totalGainPct)}`}>
              {formatPercentage(totalGainPct)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holdings.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings (computed from transactions) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Holdings</CardTitle>
          <Button onClick={() => { setTransactionType('BUY'); setShowAddTransaction(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Transaction
          </Button>
        </CardHeader>
        <CardContent>
          {showAddTransaction && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-4">Add {transactionType} Transaction</h3>

              {error && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={transactionType === 'BUY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransactionType('BUY')}
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={transactionType === 'SELL' as any ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransactionType('SELL' as any)}
                >
                  Sell
                </Button>
              </div>

              {!selectedAsset ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for a stock or ETF..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button type="button" onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y">
                      {searchResults.slice(0, 10).map((result) => (
                        <button
                          key={result.symbol}
                          className="w-full p-3 text-left hover:bg-muted flex justify-between items-center"
                          onClick={async () => {
                            setSelectedAsset(result);
                            setError(null);
                            // Auto-fetch price for selected date
                            setFetchingPrice(true);
                            try {
                              const response = await assetApi.getHistoricalPrice(result.symbol, transactionDate);
                              setPrice(response.price.toFixed(2));
                              setPriceAutoFetched(true);
                            } catch (error) {
                              console.error('Failed to fetch price:', error);
                              setPriceAutoFetched(false);
                            } finally {
                              setFetchingPrice(false);
                            }
                          }}
                        >
                          <div>
                            <div className="font-medium">{result.symbol}</div>
                            <div className="text-sm text-muted-foreground">{result.name}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{result.exchange}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-background rounded border">
                    <div>
                      <div className="font-medium">{selectedAsset.symbol}</div>
                      <div className="text-sm text-muted-foreground">{selectedAsset.name}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => {
                        setSelectedAsset(null);
                        setPrice('');
                        setPriceAutoFetched(false);
                        setError(null);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Transaction Date</label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={transactionDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="100"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Price per Share
                        {priceAutoFetched && (
                          <span className="text-xs text-muted-foreground ml-2">(auto-fetched)</span>
                        )}
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          placeholder="29.50"
                          value={price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          disabled={fetchingPrice}
                          required
                        />
                        {fetchingPrice && (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  {quantity && price && (
                    <div className="text-sm text-muted-foreground">
                      Total: {formatCurrency(parseFloat(quantity) * parseFloat(price), portfolio.currency)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={adding || fetchingPrice}>
                      {adding ? 'Adding...' : `Add ${transactionType} Transaction`}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowAddTransaction(false); setError(null); }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {holdings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No holdings yet. Add a BUY transaction to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Symbol</th>
                    <th className="text-left py-3 px-2">Name</th>
                    <th className="text-right py-3 px-2">Quantity</th>
                    <th className="text-right py-3 px-2">Avg Cost</th>
                    <th className="text-right py-3 px-2">Current Price</th>
                    <th className="text-right py-3 px-2">Value</th>
                    <th className="text-right py-3 px-2">Gain/Loss</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.id} className="border-b">
                      <td className="py-3 px-2 font-medium">{holding.asset?.symbol}</td>
                      <td className="py-3 px-2 text-muted-foreground">{holding.asset?.name}</td>
                      <td className="py-3 px-2 text-right">{holding.quantity.toFixed(4)}</td>
                      <td className="py-3 px-2 text-right">
                        {formatCurrency(holding.average_cost, holding.asset?.currency)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {holding.asset?.last_price
                          ? formatCurrency(holding.asset.last_price, holding.asset.currency)
                          : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {holding.current_value
                          ? formatCurrency(holding.current_value, holding.asset?.currency)
                          : '-'}
                      </td>
                      <td className={`py-3 px-2 text-right ${getChangeColor(holding.gain_loss || 0)}`}>
                        {holding.gain_loss !== undefined && (
                          <>
                            {formatCurrency(holding.gain_loss, holding.asset?.currency)}
                            <br />
                            <span className="text-sm">
                              {formatPercentage(holding.gain_loss_pct || 0)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteHolding(holding.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">
                      {tx.transaction_type} {tx.asset?.symbol || ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(tx.transaction_date)}
                      {tx.quantity && ` - ${tx.quantity} units @ ${formatCurrency(tx.price || 0, tx.currency)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`font-medium ${tx.transaction_type === 'BUY' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.transaction_type === 'BUY' ? '-' : '+'}
                      {formatCurrency(tx.total_amount, tx.currency)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTransaction(tx.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
