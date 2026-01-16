import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { dashboardApi } from '@/api/dashboard';
import { portfolioApi } from '@/api/portfolios';
import { assetApi } from '@/api/assets';
import { PerformanceData, PerformancePeriod, Portfolio, HoldingWithPortfolio } from '@/types';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/format';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
  LineChart,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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

const PERIODS: { value: PerformancePeriod; label: string; description: string; maxDays: number }[] = [
  { value: 'daily', label: 'Daily', description: 'Max 30 days', maxDays: 30 },
  { value: 'weekly', label: 'Weekly', description: 'Max 26 weeks', maxDays: 182 },
  { value: 'monthly', label: 'Monthly', description: 'Max 2 years', maxDays: 730 },
  { value: 'yearly', label: 'Yearly', description: 'Max 10 years', maxDays: 3650 },
];

// Helper to format date as YYYY-MM-DD
const formatDateInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper to get default date range for a period
const getDefaultDateRange = (period: PerformancePeriod): { start: string; end: string } => {
  const now = new Date();
  const end = formatDateInput(now);
  let start: Date;

  switch (period) {
    case 'daily':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case 'weekly':
      start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      break;
    case 'monthly':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 2);
      break;
    case 'yearly':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 10);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
  }

  return { start: formatDateInput(start), end };
};

const PORTFOLIO_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#0088FE',
];

// Helper to format currency with scale (K, M, B)
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

  // Format with up to 1 decimal place, remove trailing zeros
  const formatted = scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
  return `${symbol}${formatted}${suffix}`;
};

// Helper to calculate nice round tick values for the Y axis
const calculateNiceTicks = (min: number, max: number, targetTickCount = 5): { domain: [number, number]; ticks: number[] } => {
  if (min === max || max === 0) {
    return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
  }

  const range = max - min;
  const roughStep = range / (targetTickCount - 1);

  // Find the order of magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));

  // Find nice step size (1, 2, 2.5, 5, 10 times the magnitude)
  const niceSteps = [1, 2, 2.5, 5, 10];
  let niceStep = magnitude;
  for (const step of niceSteps) {
    if (step * magnitude >= roughStep) {
      niceStep = step * magnitude;
      break;
    }
  }

  // Calculate nice min and max
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  // Generate ticks
  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax; tick += niceStep) {
    ticks.push(Math.round(tick * 100) / 100); // Round to avoid floating point issues
  }

  return { domain: [niceMin, niceMax], ticks };
};

interface HoldingPriceChange {
  holding: HoldingWithPortfolio;
  startPrice: number | null;
  endPrice: number | null;
  startValue: number | null;
  endValue: number | null;
  priceChange: number | null;
  priceChangePct: number | null;
  valueChange: number | null;
  valueChangePct: number | null;
}

export function Charts() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [holdings, setHoldings] = useState<HoldingPriceChange[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PerformancePeriod>('daily');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [dateRange, setDateRange] = useState(() => getDefaultDateRange('daily'));

  // Calculate min date based on period constraints
  const dateConstraints = useMemo(() => {
    const periodConfig = PERIODS.find((p) => p.value === period);
    const maxDays = periodConfig?.maxDays || 30;
    const today = formatDateInput(new Date());

    // Min start date based on end date and max days
    const endDateObj = new Date(dateRange.end);
    const minStartDate = new Date(endDateObj);
    minStartDate.setDate(minStartDate.getDate() - maxDays);

    return {
      minStartDate: formatDateInput(minStartDate),
      maxEndDate: today,
    };
  }, [period, dateRange.end]);

  useEffect(() => {
    async function loadPortfolios() {
      try {
        const data = await portfolioApi.list();
        setPortfolios(data);
      } catch (error) {
        console.error('Failed to load portfolios:', error);
      }
    }
    loadPortfolios();
  }, []);

  // Reset date range when period changes
  useEffect(() => {
    setDateRange(getDefaultDateRange(period));
  }, [period]);

  useEffect(() => {
    async function loadPerformance() {
      setLoading(true);
      try {
        const data = await dashboardApi.getPerformance(
          period,
          selectedPortfolio || undefined,
          dateRange.start,
          dateRange.end
        );
        setPerformance(data);
      } catch (error) {
        console.error('Failed to load performance data:', error);
        setPerformance(null);
      } finally {
        setLoading(false);
      }
    }
    loadPerformance();
  }, [period, selectedPortfolio, dateRange.start, dateRange.end]);

  // Load holdings with historical prices
  useEffect(() => {
    async function loadHoldings() {
      setHoldingsLoading(true);
      try {
        const allHoldings = await portfolioApi.getAllHoldings();

        // Filter by selected portfolio if one is selected
        const filteredHoldings = selectedPortfolio
          ? allHoldings.filter(h => h.portfolio_id === selectedPortfolio)
          : allHoldings;

        // Fetch historical prices for each holding
        const holdingsWithPrices: HoldingPriceChange[] = await Promise.all(
          filteredHoldings.map(async (holding) => {
            const symbol = holding.asset?.symbol;
            if (!symbol) {
              return {
                holding,
                startPrice: null,
                endPrice: holding.asset?.last_price || null,
                startValue: null,
                endValue: holding.current_value || null,
                priceChange: null,
                priceChangePct: null,
                valueChange: null,
                valueChangePct: null,
              };
            }

            try {
              const startPriceData = await assetApi.getHistoricalPrice(symbol, dateRange.start);
              const startPrice = startPriceData.price;
              const endPrice = holding.asset?.last_price || 0;
              const startValue = startPrice * holding.quantity;
              const endValue = endPrice * holding.quantity;
              const priceChange = endPrice - startPrice;
              const priceChangePct = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
              const valueChange = endValue - startValue;
              const valueChangePct = startValue > 0 ? (valueChange / startValue) * 100 : 0;

              return {
                holding,
                startPrice,
                endPrice,
                startValue,
                endValue,
                priceChange,
                priceChangePct,
                valueChange,
                valueChangePct,
              };
            } catch {
              // If historical price fetch fails, just show current values
              return {
                holding,
                startPrice: null,
                endPrice: holding.asset?.last_price || null,
                startValue: null,
                endValue: holding.current_value || null,
                priceChange: null,
                priceChangePct: null,
                valueChange: null,
                valueChangePct: null,
              };
            }
          })
        );

        setHoldings(holdingsWithPrices);
      } catch (error) {
        console.error('Failed to load holdings:', error);
        setHoldings([]);
      } finally {
        setHoldingsLoading(false);
      }
    }
    loadHoldings();
  }, [selectedPortfolio, dateRange.start]);

  const formatDateLabel = (date: string) => {
    switch (period) {
      case 'daily':
        return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      case 'weekly':
        return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      case 'monthly':
        return new Date(date + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      case 'yearly':
        return date;
      default:
        return date;
    }
  };

  // Build chart data with all portfolio values merged by date
  const hasMultiplePortfolios = performance?.portfolios && performance.portfolios.length > 1;

  interface ChartDataPoint {
    date: string;
    label: string;
    total?: number;
    [key: string]: string | number | undefined;
  }

  const chartData: ChartDataPoint[] = (() => {
    if (!performance) return [];

    if (hasMultiplePortfolios && performance.portfolios) {
      // Merge all portfolio data by date
      const dateMap = new Map<string, ChartDataPoint>();

      // Add total values
      for (const dp of performance.data_points) {
        const entry = dateMap.get(dp.date) || { date: dp.date, label: formatDateLabel(dp.date) };
        entry.total = dp.value;
        dateMap.set(dp.date, entry);
      }

      // Add individual portfolio values
      for (const portfolio of performance.portfolios) {
        for (const dp of portfolio.data_points) {
          const entry = dateMap.get(dp.date) || { date: dp.date, label: formatDateLabel(dp.date) };
          entry[portfolio.name] = dp.value;
          dateMap.set(dp.date, entry);
        }
      }

      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    return performance.data_points.map((dp) => ({
      date: dp.date,
      label: formatDateLabel(dp.date),
      total: dp.value,
    }));
  })();

  // Calculate min/max across all values and nice ticks
  const allValues = chartData.flatMap(d =>
    Object.entries(d)
      .filter(([key]) => key !== 'date' && key !== 'label')
      .map(([, value]) => value as number)
      .filter(v => v > 0)
  );
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 0;
  const { domain: yDomain, ticks: yTicks } = calculateNiceTicks(rawMin * 0.95, rawMax * 1.05);

  return (
    <FinanceLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Performance Charts</h1>
          <p className="text-muted-foreground">Track your portfolio performance over time</p>
        </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Period Selector */}
            <div className="flex flex-wrap gap-2">
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

            {/* Portfolio Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedPortfolio}
                onChange={(e) => setSelectedPortfolio(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">All Portfolios</option>
                {portfolios
                  .filter((p) => p.has_transactions)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                min={dateConstraints.minStartDate}
                max={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={dateRange.end}
                min={dateRange.start}
                max={dateConstraints.maxEndDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange(getDefaultDateRange(period))}
            >
              Reset
            </Button>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            {PERIODS.find(p => p.value === period)?.description}
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {performance && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Start Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(performance.start_value, 'GBP')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Current Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(performance.end_value, 'GBP')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(performance.change)}`}>
                {performance.change > 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : performance.change < 0 ? (
                  <TrendingDown className="h-5 w-5" />
                ) : null}
                {formatCurrency(performance.change, 'GBP')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Change %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getChangeColor(performance.change_pct)}`}>
                {formatPercentage(performance.change_pct)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-muted-foreground">Loading chart data...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-muted-foreground text-center">
                <p>No performance data available.</p>
                <p className="text-sm mt-2">Add holdings to your portfolios to see performance charts.</p>
              </div>
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                {hasMultiplePortfolios ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={yDomain}
                      ticks={yTicks}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrencyCompact(value, 'GBP')}
                      width={70}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg min-w-[200px]">
                              <p className="text-sm font-medium mb-2">{data.date}</p>
                              {payload.map((entry: any, index: number) => (
                                <div key={index} className="flex justify-between items-center gap-4">
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm">{entry.name}</span>
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(entry.value, 'GBP')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    {/* Total line - thicker and more prominent */}
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke={performance && performance.change >= 0 ? '#22c55e' : '#ef4444'}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    {/* Individual portfolio lines */}
                    {performance?.portfolios?.map((portfolio, index) => (
                      <Line
                        key={portfolio.id}
                        type="monotone"
                        dataKey={portfolio.name}
                        name={portfolio.name}
                        stroke={PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        strokeDasharray="5 5"
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={performance && performance.change >= 0 ? '#22c55e' : '#ef4444'}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={performance && performance.change >= 0 ? '#22c55e' : '#ef4444'}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={yDomain}
                      ticks={yTicks}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrencyCompact(value, 'GBP')}
                      width={70}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="text-sm text-muted-foreground">{data.date}</p>
                              <p className="text-lg font-bold">
                                {formatCurrency(data.total, 'GBP')}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={performance && performance.change >= 0 ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holdings Price Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {holdingsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading holdings...</div>
            </div>
          ) : holdings.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">No holdings found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Asset</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Start Price</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">End Price</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price Change</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Start Value</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">End Value</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Value Change</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.holding.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{h.holding.asset?.symbol || 'N/A'}</span>
                          <span className="text-xs text-muted-foreground">{h.holding.portfolio_name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">{h.holding.quantity.toLocaleString()}</td>
                      <td className="text-right py-3 px-2">
                        {h.startPrice !== null ? formatCurrency(h.startPrice, 'GBP') : '-'}
                      </td>
                      <td className="text-right py-3 px-2">
                        {h.endPrice !== null ? formatCurrency(h.endPrice, 'GBP') : '-'}
                      </td>
                      <td className="text-right py-3 px-2">
                        {h.priceChangePct !== null ? (
                          <div className={`flex items-center justify-end gap-1 ${getChangeColor(h.priceChangePct)}`}>
                            {h.priceChangePct > 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : h.priceChangePct < 0 ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                            {formatPercentage(h.priceChangePct)}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-right py-3 px-2">
                        {h.startValue !== null ? formatCurrency(h.startValue, 'GBP') : '-'}
                      </td>
                      <td className="text-right py-3 px-2">
                        {h.endValue !== null ? formatCurrency(h.endValue, 'GBP') : '-'}
                      </td>
                      <td className="text-right py-3 px-2">
                        {h.valueChange !== null && h.valueChangePct !== null ? (
                          <div className={`flex flex-col items-end ${getChangeColor(h.valueChangePct)}`}>
                            <span>{formatCurrency(h.valueChange, 'GBP')}</span>
                            <span className="text-xs">{formatPercentage(h.valueChangePct)}</span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </FinanceLayout>
  );
}
