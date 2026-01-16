import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { AddPortfolioModal } from '@/components/finance/AddPortfolioModal';
import { EditPortfolioModal } from '@/components/finance/EditPortfolioModal';
import { portfolioApi } from '@/api/portfolios';
import { Portfolio, PortfolioSummary, PortfolioMetadata } from '@/types';
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
  LayoutDashboard,
  FolderKanban,
  PieChart,
  LineChart,
  CircleDollarSign,
} from 'lucide-react';

const financeNavItems = [
  { label: 'Overview', href: '/finance', icon: LayoutDashboard },
  { label: 'Portfolios', href: '/portfolios', icon: FolderKanban },
  { label: 'Holdings', href: '/holdings', icon: PieChart },
  { label: 'Charts', href: '/charts', icon: LineChart },
  { label: 'Prices', href: '/prices', icon: CircleDollarSign },
  { label: 'Fixed Assets', href: '/fixed-assets', icon: Landmark },
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit state
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  // Delete state
  const [deletingPortfolio, setDeletingPortfolio] = useState<Portfolio | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        setEditingPortfolio(portfolio);
        setShowEditModal(true);
      }
      setPendingEditId(null);
    }
  }, [pendingEditId, portfolios]);

  const startEdit = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setShowEditModal(true);
  };

  const handleEditModalClose = (open: boolean) => {
    setShowEditModal(open);
    if (!open) {
      setEditingPortfolio(null);
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
          <div>
            <h1 className="font-display text-2xl font-bold">Portfolios</h1>
            <p className="text-muted-foreground">Manage your investment portfolios</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Portfolio
          </Button>
        </div>

        {/* Add Portfolio Modal */}
        <AddPortfolioModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={loadPortfolios}
        />

        {/* Edit Portfolio Modal */}
        <EditPortfolioModal
          open={showEditModal}
          onOpenChange={handleEditModalClose}
          portfolio={editingPortfolio}
          onSuccess={loadPortfolios}
        />

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
            <Button onClick={() => setShowAddModal(true)}>
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
    </HubLayout>
  );
}
