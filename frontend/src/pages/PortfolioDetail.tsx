import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { EditPortfolioModal } from '@/components/finance/EditPortfolioModal';
import { AddTransactionModal } from '@/components/finance/AddTransactionModal';
import { portfolioApi } from '@/api/portfolios';
import { Portfolio, Holding, Transaction } from '@/types';
import { formatCurrency, formatPercentage, formatDate, getChangeColor } from '@/utils/format';
import { ArrowLeft, Plus, Trash2, Loader2, Wallet, TrendingUp, Pencil, Building2, Calendar, User, CreditCard, Percent, Shield, Clock, X, Upload, FileText, AlertCircle, LayoutDashboard, FolderKanban, PieChart, LineChart, CircleDollarSign, Landmark } from 'lucide-react';

const financeNavItems = [
  { label: 'Overview', href: '/finance', icon: LayoutDashboard },
  { label: 'Portfolios', href: '/portfolios', icon: FolderKanban },
  { label: 'Holdings', href: '/holdings', icon: PieChart },
  { label: 'Charts', href: '/charts', icon: LineChart },
  { label: 'Prices', href: '/prices', icon: CircleDollarSign },
  { label: 'Fixed Assets', href: '/fixed-assets', icon: Landmark },
];

export function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [invalidSymbols, setInvalidSymbols] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);

  const isCashPortfolio = portfolio?.type === 'CASH' || portfolio?.type === 'SAVINGS';

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

  const handleImport = async () => {
    if (!id || !importFile) return;

    setImporting(true);
    setImportError(null);
    setInvalidSymbols([]);
    setRowErrors([]);

    try {
      const result = await portfolioApi.importTransactions(id, importFile, importMode);
      if (result.success) {
        setShowImportModal(false);
        setImportFile(null);
        setImportMode('append');
        setImportError(null);
        setInvalidSymbols([]);
        setRowErrors([]);
        loadData();
      } else {
        setImportError(result.message);
        if (result.invalid_symbols) {
          setInvalidSymbols(result.invalid_symbols);
        }
        if (result.row_errors) {
          setRowErrors(result.row_errors);
        }
      }
    } catch (err: any) {
      const response = err.response?.data;
      if (response?.invalid_symbols) {
        setInvalidSymbols(response.invalid_symbols);
      }
      if (response?.row_errors) {
        setRowErrors(response.row_errors);
      }
      setImportError(response?.message || response?.error || err.message || 'Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  const clearImportState = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportMode('append');
    setImportError(null);
    setInvalidSymbols([]);
    setRowErrors([]);
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
      <HubLayout
        title="Finance"
        description="Track portfolios, investments, and financial goals"
        icon={Wallet}
        color="finance"
        navItems={financeNavItems}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </HubLayout>
    );
  }

  if (!portfolio) {
    return (
      <HubLayout
        title="Finance"
        description="Track portfolios, investments, and financial goals"
        icon={Wallet}
        color="finance"
        navItems={financeNavItems}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-2">Portfolio not found</h2>
          <Button onClick={() => navigate('/portfolios')}>Go back</Button>
        </div>
      </HubLayout>
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
      <HubLayout
        title="Finance"
        description="Track portfolios, investments, and financial goals"
        icon={Wallet}
        color="finance"
        navItems={financeNavItems}
      >
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
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Edit Portfolio Modal */}
        <EditPortfolioModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          portfolio={portfolio}
          onSuccess={loadData}
        />

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

        {/* Portfolio Information */}
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

        {/* Add Transaction Modal */}
        <AddTransactionModal
          open={showAddTransaction}
          onOpenChange={setShowAddTransaction}
          portfolio={portfolio}
          onSuccess={loadData}
        />

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <Button onClick={() => setShowAddTransaction(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </CardHeader>
          <CardContent>
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
      </HubLayout>
    );
  }

  // Regular portfolio view
  return (
    <HubLayout
      title="Finance"
      description="Track portfolios, investments, and financial goals"
      icon={Wallet}
      color="finance"
      navItems={financeNavItems}
    >
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
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Edit Portfolio Modal */}
      <EditPortfolioModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        portfolio={portfolio}
        onSuccess={loadData}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        portfolio={portfolio}
        onSuccess={loadData}
      />

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

      {/* Portfolio Information */}
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={() => setShowAddTransaction(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
              <CardTitle>Import Transactions from CSV</CardTitle>
              <Button variant="ghost" size="icon" onClick={clearImportState}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto">
              {(importError || rowErrors.length > 0 || invalidSymbols.length > 0) && (
                <div className="p-3 text-sm bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      {importError && <p className="text-red-600 font-medium">{importError}</p>}
                      {invalidSymbols.length > 0 && (
                        <div className="mt-2">
                          <p className="text-red-600 text-xs mb-1">Invalid symbols:</p>
                          <div className="flex flex-wrap gap-1">
                            {invalidSymbols.map((symbol) => (
                              <span key={symbol} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono">
                                {symbol}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {rowErrors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-red-600 text-xs mb-1">Row errors:</p>
                          <ul className="text-red-600 text-xs space-y-1">
                            {rowErrors.slice(0, 10).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                            {rowErrors.length > 10 && (
                              <li className="text-red-500">...and {rowErrors.length - 10} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">CSV File</label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors ${importError ? 'border-red-300' : ''}`}>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csv-upload"
                    key={importFile?.name || 'empty'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        setImportError(null);
                        setInvalidSymbols([]);
                        setRowErrors([]);
                      }
                    }}
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    {importFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="font-medium truncate">{importFile.name}</p>
                          <p className="text-sm text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.preventDefault();
                            setImportFile(null);
                            setImportError(null);
                            setInvalidSymbols([]);
                            setRowErrors([]);
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Import Mode</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">Add to existing</p>
                      <p className="text-sm text-muted-foreground">Import transactions without removing existing data</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-red-600">Replace all transactions</p>
                      <p className="text-sm text-muted-foreground">Delete all existing transactions and holdings, then import from CSV</p>
                    </div>
                  </label>
                </div>
              </div>

              <a
                href="/sample-transactions.csv"
                download="sample-transactions.csv"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                Download sample CSV template
              </a>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={clearImportState} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={!importFile || importing}>
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </HubLayout>
  );
}
