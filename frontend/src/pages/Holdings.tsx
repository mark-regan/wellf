import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { portfolioApi } from '@/api/portfolios';
import { HoldingWithPortfolio, CashAccount, AssetType } from '@/types';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/format';
import { Filter, TrendingUp, TrendingDown, ExternalLink, Wallet, Landmark, Percent } from 'lucide-react';

const ASSET_TYPES: { value: AssetType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'STOCK', label: 'Stocks' },
  { value: 'ETF', label: 'ETFs' },
  { value: 'FUND', label: 'Funds' },
  { value: 'CRYPTO', label: 'Crypto' },
  { value: 'BOND', label: 'Bonds' },
];

interface CashAccountWithPortfolio extends CashAccount {
  portfolio_name?: string;
}

export function Holdings() {
  const [holdings, setHoldings] = useState<HoldingWithPortfolio[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccountWithPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AssetType | 'ALL'>('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        const [holdingsData, cashData, portfoliosData] = await Promise.all([
          portfolioApi.getAllHoldings(),
          portfolioApi.getAllCashAccounts(),
          portfolioApi.list(),
        ]);
        setHoldings(holdingsData);

        // Add portfolio names to cash accounts
        const portfolioMap = new Map(portfoliosData.map(p => [p.id, p.name]));
        const cashWithPortfolios = cashData.map(ca => ({
          ...ca,
          portfolio_name: portfolioMap.get(ca.portfolio_id) || 'Unknown',
        }));
        setCashAccounts(cashWithPortfolios);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredHoldings = filter === 'ALL'
    ? holdings
    : holdings.filter(h => h.asset?.asset_type === filter);

  // Calculate totals
  const totalValue = filteredHoldings.reduce((sum, h) => sum + (h.current_value || 0), 0);
  const totalCost = filteredHoldings.reduce((sum, h) => sum + h.quantity * h.average_cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Count by type
  const countByType = holdings.reduce((acc, h) => {
    const type = h.asset?.asset_type || 'OTHER';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        <h1 className="text-3xl font-bold">Holdings</h1>
        <p className="text-muted-foreground">All your holdings across portfolios</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue, 'GBP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost, 'GBP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getChangeColor(totalGain)}`}>
              {formatCurrency(totalGain, 'GBP')}
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
            <div className="text-2xl font-bold">{filteredHoldings.length}</div>
            <div className="text-sm text-muted-foreground">
              {filter === 'ALL' ? 'Total' : filter}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Holdings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Holdings</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as AssetType | 'ALL')}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              {ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} {type.value !== 'ALL' && countByType[type.value] ? `(${countByType[type.value]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHoldings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {holdings.length === 0
                ? 'No holdings yet. Add transactions to your portfolios to see holdings here.'
                : `No ${filter} holdings found.`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Symbol</th>
                    <th className="text-left py-3 px-2">Name</th>
                    <th className="text-left py-3 px-2">Type</th>
                    <th className="text-left py-3 px-2">Portfolio</th>
                    <th className="text-right py-3 px-2">Quantity</th>
                    <th className="text-right py-3 px-2">Avg Cost</th>
                    <th className="text-right py-3 px-2">Current Price</th>
                    <th className="text-right py-3 px-2">Value</th>
                    <th className="text-right py-3 px-2">Gain/Loss</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.map((holding) => (
                    <tr key={holding.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{holding.asset?.symbol}</td>
                      <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate">
                        {holding.asset?.name}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">
                          {holding.asset?.asset_type}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Link
                          to={`/portfolios/${holding.portfolio_id}`}
                          className="text-primary hover:underline"
                        >
                          {holding.portfolio_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{holding.portfolio_type}</div>
                      </td>
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
                          <div className="flex items-center justify-end gap-1">
                            {holding.gain_loss > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : holding.gain_loss < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            <div>
                              <div>{formatCurrency(holding.gain_loss, holding.asset?.currency)}</div>
                              <div className="text-xs">
                                {formatPercentage(holding.gain_loss_pct || 0)}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Link to={`/portfolios/${holding.portfolio_id}`}>
                          <Button variant="ghost" size="icon" title="View Portfolio">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Holdings Section */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Cash Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {cashAccounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No cash accounts yet. Add cash accounts to your portfolios to see them here.
            </p>
          ) : (
            <>
              {/* Cash Summary */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Total Cash</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      cashAccounts.reduce((sum, ca) => sum + ca.balance, 0),
                      'GBP'
                    )}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Accounts</div>
                  <div className="text-2xl font-bold">{cashAccounts.length}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Avg Interest Rate</div>
                  <div className="text-2xl font-bold">
                    {cashAccounts.filter(ca => ca.interest_rate).length > 0
                      ? `${(
                          cashAccounts
                            .filter(ca => ca.interest_rate)
                            .reduce((sum, ca) => sum + (ca.interest_rate || 0), 0) /
                          cashAccounts.filter(ca => ca.interest_rate).length
                        ).toFixed(2)}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Cash Accounts Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Account</th>
                      <th className="text-left py-3 px-2">Type</th>
                      <th className="text-left py-3 px-2">Institution</th>
                      <th className="text-left py-3 px-2">Portfolio</th>
                      <th className="text-right py-3 px-2">Balance</th>
                      <th className="text-right py-3 px-2">Interest Rate</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashAccounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{account.account_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">
                            {account.account_type}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {account.institution || '-'}
                        </td>
                        <td className="py-3 px-2">
                          <Link
                            to={`/portfolios/${account.portfolio_id}`}
                            className="text-primary hover:underline"
                          >
                            {account.portfolio_name}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(account.balance, account.currency)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {account.interest_rate ? (
                            <div className="flex items-center justify-end gap-1 text-green-600">
                              <Percent className="h-3 w-3" />
                              {account.interest_rate.toFixed(2)}%
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Link to={`/portfolios/${account.portfolio_id}`}>
                            <Button variant="ghost" size="icon" title="View Portfolio">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
