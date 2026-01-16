import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { assetApi } from '@/api/assets';
import { portfolioApi } from '@/api/portfolios';
import { useAuthStore } from '@/store/auth';
import { QuoteData, PriceHistory, HoldingWithPortfolio } from '@/types';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/format';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  LineChart,
  X,
  Wallet,
  LayoutDashboard,
  FolderKanban,
  PieChart,
  CircleDollarSign,
  Landmark,
} from 'lucide-react';

const financeNavItems = [
  { label: 'Overview', href: '/finance', icon: LayoutDashboard },
  { label: 'Portfolios', href: '/portfolios', icon: FolderKanban },
  { label: 'Holdings', href: '/holdings', icon: PieChart },
  { label: 'Charts', href: '/charts', icon: TrendingUp },
  { label: 'Prices', href: '/prices', icon: CircleDollarSign },
  { label: 'Fixed Assets', href: '/fixed-assets', icon: Landmark },
];

const FinanceLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Finance"
    description="Track portfolios, investments, and financial goals"
    icon={Wallet}
    color="finance"
    navItems={financeNavItems}
  >
    {children}
  </HubLayout>
);

// Default indices to show
const DEFAULT_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^IXIC', name: 'Nasdaq' },
  { symbol: '^FTSE', name: 'FTSE 100' },
  { symbol: '^FTMC', name: 'FTSE 250' },
  { symbol: '^GDAXI', name: 'DAX' },
  { symbol: '^N225', name: 'Nikkei 225' },
];

type Period = 'daily' | 'monthly' | 'yearly';

const PERIODS: { value: Period; label: string; apiPeriod: string }[] = [
  { value: 'daily', label: '1M', apiPeriod: '1mo' },
  { value: 'monthly', label: '1Y', apiPeriod: '1y' },
  { value: 'yearly', label: '5Y', apiPeriod: '5y' },
];

// Format currency compactly for chart axis
const formatCurrencyCompact = (value: number, currency: string): string => {
  const absValue = Math.abs(value);
  let scaled: number;
  let suffix: string;

  if (absValue >= 1_000_000_000) {
    scaled = value / 1_000_000_000;
    suffix = 'B';
  } else if (absValue >= 1_000_000) {
    scaled = value / 1_000_000;
    suffix = 'M';
  } else if (absValue >= 1_000) {
    scaled = value / 1_000;
    suffix = 'K';
  } else {
    return formatCurrency(value, currency);
  }

  const formatted = scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
  return `${symbol}${formatted}${suffix}`;
};

// Calculate nice tick values for Y axis
const calculateNiceTicks = (min: number, max: number, targetCount: number = 5): number[] => {
  const range = max - min;
  if (range === 0) return [min];

  const roughStep = range / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;

  let niceStep: number;
  if (normalizedStep <= 1) niceStep = 1;
  else if (normalizedStep <= 2) niceStep = 2;
  else if (normalizedStep <= 5) niceStep = 5;
  else niceStep = 10;
  niceStep *= magnitude;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax; tick += niceStep) {
    ticks.push(tick);
  }

  return ticks;
};

interface PriceCardProps {
  quote: QuoteData;
  onShowChart: () => void;
}

function PriceCard({ quote, onShowChart }: PriceCardProps) {
  const changeColor = getChangeColor(quote.change);
  const ChangeIcon = quote.change > 0 ? TrendingUp : quote.change < 0 ? TrendingDown : Minus;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Name row - full width */}
        <div className="mb-3">
          <div className="font-semibold text-lg">
            {quote.name || quote.symbol}
            {quote.name && <span className="text-muted-foreground font-normal ml-2">({quote.symbol})</span>}
          </div>
        </div>

        {/* Price and change */}
        <div className="mb-3">
          <div className="font-semibold text-2xl">
            {formatCurrency(quote.price || 0, quote.currency || 'USD')}
          </div>
          <div className={`flex items-center gap-1 mt-1 ${changeColor}`}>
            <ChangeIcon className="h-4 w-4" />
            <span>{(quote.change ?? 0) >= 0 ? '+' : ''}{(quote.change ?? 0).toFixed(2)}</span>
            <span className="text-sm">({formatPercentage(quote.change_pct ?? 0)})</span>
          </div>
          {quote.market_time > 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              Last updated: {new Date(quote.market_time * 1000).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        {/* View Chart button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onShowChart}
        >
          <LineChart className="h-4 w-4 mr-2" />
          View Chart
        </Button>
      </CardContent>
    </Card>
  );
}

interface ChartModalProps {
  quote: QuoteData | null;
  onClose: () => void;
}

function ChartModal({ quote, onClose }: ChartModalProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('daily');

  useEffect(() => {
    if (quote) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const apiPeriod = PERIODS.find((p) => p.value === period)?.apiPeriod || '1mo';
          const data = await assetApi.getHistory(quote.symbol, apiPeriod);
          setHistory(data);
        } catch (error) {
          console.error('Failed to fetch history:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [quote, period]);

  if (!quote) return null;

  const changeColor = getChangeColor(quote.change);
  const ChangeIcon = quote.change > 0 ? TrendingUp : quote.change < 0 ? TrendingDown : Minus;

  // Chart data with fill-forward/backward logic
  const chartData = (() => {
    if (history.length === 0) return [];

    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const dateMap = new Map<string, typeof sortedHistory[0]>();
    for (const h of sortedHistory) {
      const dateKey = h.date.split('T')[0];
      dateMap.set(dateKey, h);
    }
    const deduplicatedHistory = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let lastKnownPrice = 0;
    for (const h of deduplicatedHistory) {
      if (h.close != null && h.close > 0) {
        lastKnownPrice = h.close;
        break;
      }
    }

    return deduplicatedHistory.map((h, index) => {
      let price = h.close;
      if (price == null || price === 0) {
        price = lastKnownPrice;
      } else {
        lastKnownPrice = price;
      }

      return {
        index,
        timestamp: new Date(h.date).getTime(),
        date: h.date,
        dateLabel: new Date(h.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          ...(period === 'yearly' ? { year: '2-digit' } : {}),
        }),
        close: price,
      };
    });
  })();

  const closes = chartData.map((d) => d.close);
  const minClose = closes.length > 0 ? Math.min(...closes) : 0;
  const maxClose = closes.length > 0 ? Math.max(...closes) : 0;
  const ticks = calculateNiceTicks(minClose, maxClose);
  const isPositive = chartData.length > 0 && chartData[chartData.length - 1].close >= chartData[0].close;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">
              {quote.name || quote.symbol}
              {quote.name && <span className="text-muted-foreground font-normal ml-2">({quote.symbol})</span>}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-2xl font-semibold">
                {formatCurrency(quote.price || 0, quote.currency || 'USD')}
              </span>
              <span className={`flex items-center gap-1 ${changeColor}`}>
                <ChangeIcon className="h-5 w-5" />
                <span>{(quote.change ?? 0) >= 0 ? '+' : ''}{(quote.change ?? 0).toFixed(2)}</span>
                <span>({formatPercentage(quote.change_pct ?? 0)})</span>
              </span>
            </div>
            {quote.market_time > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                Last updated: {new Date(quote.market_time * 1000).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Chart */}
          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Loading chart...
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                  <defs>
                    <linearGradient id={`modal-gradient-${quote.symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isPositive ? '#22c55e' : '#ef4444'}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={isPositive ? '#22c55e' : '#ef4444'}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 12, fill: '#888888' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    domain={[ticks[0], ticks[ticks.length - 1]]}
                    ticks={ticks}
                    tick={{ fontSize: 12, fill: '#888888' }}
                    tickFormatter={(value) => formatCurrencyCompact(value, quote.currency)}
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, _name: string, props: any) => {
                      const item = props.payload;
                      const dateStr = item?.date ? new Date(item.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }) : '';
                      return [formatCurrency(value, quote.currency), dateStr];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={isPositive ? '#22c55e' : '#ef4444'}
                    strokeWidth={2}
                    fill={`url(#modal-gradient-${quote.symbol})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No chart data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Prices() {
  const { user } = useAuthStore();
  const [indexQuotes, setIndexQuotes] = useState<QuoteData[]>([]);
  const [holdingQuotes, setHoldingQuotes] = useState<QuoteData[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<QuoteData[]>([]);
  const [holdings, setHoldings] = useState<HoldingWithPortfolio[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const watchlistSymbols = user?.watchlist
    ? user.watchlist.split(',').filter((s) => s.trim())
    : [];

  const fetchQuotes = async () => {
    try {
      const indexSymbols = DEFAULT_INDICES.map((i) => i.symbol);
      const indexData = await assetApi.getQuotes(indexSymbols);
      setIndexQuotes(indexData);

      const holdingsData = await portfolioApi.getAllHoldings();
      setHoldings(holdingsData);

      const holdingSymbols = [...new Set(holdingsData.map((h) => h.asset?.symbol).filter(Boolean))] as string[];
      if (holdingSymbols.length > 0) {
        const holdingData = await assetApi.getQuotes(holdingSymbols);
        setHoldingQuotes(holdingData);
      }

      if (watchlistSymbols.length > 0) {
        const watchlistData = await assetApi.getQuotes(watchlistSymbols);
        setWatchlistQuotes(watchlistData);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchQuotes();
      setLoading(false);
    };
    loadData();
  }, [user?.watchlist]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQuotes();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <FinanceLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">Current Prices</h1>
          </div>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading prices...
          </div>
        </div>
      </FinanceLayout>
    );
  }

  return (
    <FinanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Current Prices</h1>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Market Indices */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Market Indices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {indexQuotes.length > 0 ? (
            indexQuotes.map((quote) => (
              <PriceCard
                key={quote.symbol}
                quote={quote}
                onShowChart={() => setSelectedQuote(quote)}
              />
            ))
          ) : (
            <div className="col-span-full p-4 text-muted-foreground text-center">
              Unable to load index data
            </div>
          )}
        </div>
      </div>

      {/* My Holdings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Holdings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {holdingQuotes.length > 0 ? (
            holdingQuotes.map((quote) => (
              <PriceCard
                key={quote.symbol}
                quote={quote}
                onShowChart={() => setSelectedQuote(quote)}
              />
            ))
          ) : (
            <div className="col-span-full p-4 text-muted-foreground text-center">
              {holdings.length === 0
                ? 'No holdings yet. Add some to your portfolios!'
                : 'Unable to load holding prices'}
            </div>
          )}
        </div>
      </div>

      {/* Watchlist */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">Watchlist</h2>
          <Link to="/settings?section=watchlist">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {watchlistQuotes.length > 0 ? (
            watchlistQuotes.map((quote) => (
              <PriceCard
                key={quote.symbol}
                quote={quote}
                onShowChart={() => setSelectedQuote(quote)}
              />
            ))
          ) : (
            <div className="col-span-full p-4 text-muted-foreground text-center">
              {watchlistSymbols.length === 0 ? (
                <span>
                  No watchlist items.{' '}
                  <Link to="/settings?section=watchlist" className="text-primary hover:underline">
                    Add some tickers
                  </Link>
                </span>
              ) : (
                'Unable to load watchlist prices'
              )}
            </div>
          )}
        </div>
      </div>

        {/* Chart Modal */}
        {selectedQuote && (
          <ChartModal
            quote={selectedQuote}
            onClose={() => setSelectedQuote(null)}
          />
        )}
      </div>
    </FinanceLayout>
  );
}
