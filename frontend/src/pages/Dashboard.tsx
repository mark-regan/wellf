import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/api/dashboard';
import { useAuthStore } from '@/store/auth';
import { NetWorthSummary, AssetAllocation, TopMover } from '@/types';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/format';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Wallet,
  Building2,
  ArrowRight,
  Target,
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Format portfolio type for display
const formatPortfolioType = (type: string): string => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export function Dashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<NetWorthSummary | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocation | null>(null);
  const [movers, setMovers] = useState<{ gainers: TopMover[]; losers: TopMover[] }>({ gainers: [], losers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, allocationData, moversData] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getAllocation(),
          dashboardApi.getTopMovers(),
        ]);
        setSummary(summaryData);
        setAllocation(allocationData);
        setMovers(moversData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome{user?.display_name ? `, ${user.display_name}` : ''}</h1>
        <p className="text-muted-foreground">Your financial overview</p>
      </div>

      {/* Net Worth Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Net Worth
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_net_worth || 0, summary?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investments
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.investments || 0, summary?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.cash || 0, summary?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fixed Assets
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.fixed_assets || 0, summary?.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FIRE Progress */}
      {user?.fire_enabled && user?.fire_target && user.fire_target > 0 && summary && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              FIRE Progress
            </CardTitle>
            <Link to="/settings" className="text-xs text-muted-foreground hover:text-primary">
              Edit Target
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold">
                    {((summary.total_net_worth / user.fire_target) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(summary.total_net_worth, summary.currency)} of {formatCurrency(user.fire_target, summary.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Remaining</div>
                  <div className={`font-medium ${summary.total_net_worth >= user.fire_target ? 'text-green-600' : ''}`}>
                    {summary.total_net_worth >= user.fire_target
                      ? 'Target Reached!'
                      : formatCurrency(user.fire_target - summary.total_net_worth, summary.currency)}
                  </div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((summary.total_net_worth / user.fire_target) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Summary & Allocation */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Portfolios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Portfolios</CardTitle>
            <Link to="/portfolios">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!summary?.portfolio_summary || summary.portfolio_summary.length === 0 ? (
                <p className="text-muted-foreground text-sm">No portfolios yet</p>
              ) : (
                summary?.portfolio_summary?.map((portfolio) => (
                  <div
                    key={portfolio.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <Link
                        to={`/portfolios/${portfolio.id}`}
                        className="font-medium hover:text-primary hover:underline transition-colors"
                      >
                        {portfolio.name}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {formatPortfolioType(portfolio.type)} • {portfolio.holdings_count} holdings
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(portfolio.total_value, summary?.currency)}
                      </div>
                      <div className={`text-sm ${getChangeColor(portfolio.unrealised_pct)}`}>
                        {formatPercentage(portfolio.unrealised_pct)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Allocation List */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {!allocation?.by_type || allocation.by_type.length === 0 ? (
              <p className="text-muted-foreground text-sm">No allocation data</p>
            ) : (
              <div className="space-y-4">
                {allocation.by_type.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.value, summary?.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Note: Due to rounding, percentages may not add up to exactly 100%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Movers */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle>Top Gainers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {!movers.gainers || movers.gainers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No data available</p>
              ) : (
                movers.gainers.map((mover) => (
                  <div key={mover.symbol} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{mover.symbol}</div>
                      <div className="text-sm text-muted-foreground">{mover.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-medium">
                        {formatPercentage(mover.change_pct)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <CardTitle>Top Losers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {!movers.losers || movers.losers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No data available</p>
              ) : (
                movers.losers.map((mover) => (
                  <div key={mover.symbol} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{mover.symbol}</div>
                      <div className="text-sm text-muted-foreground">{mover.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-600 font-medium">
                        {formatPercentage(mover.change_pct)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
