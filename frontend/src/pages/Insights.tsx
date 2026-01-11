import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Home,
  Car,
  Shield,
  FileText,
  AlertTriangle,
  PieChart,
  DollarSign,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { reportApi } from '../api/report';
import type {
  HouseholdOverview,
  NetWorthBreakdown,
  InsuranceCoverageReport,
  AssetAllocationReport,
  UpcomingEventsReport,
} from '../types';

const ALLOCATION_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
];

export default function Insights() {
  const [overview, setOverview] = useState<HouseholdOverview | null>(null);
  const [netWorth, setNetWorth] = useState<NetWorthBreakdown | null>(null);
  const [insurance, setInsurance] = useState<InsuranceCoverageReport | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocationReport | null>(null);
  const [events, setEvents] = useState<UpcomingEventsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, netWorthData, insuranceData, allocationData, eventsData] = await Promise.all([
        reportApi.getHouseholdOverview(),
        reportApi.getNetWorthBreakdown(),
        reportApi.getInsuranceCoverage(),
        reportApi.getAssetAllocation(),
        reportApi.getUpcomingEvents(),
      ]);
      setOverview(overviewData);
      setNetWorth(netWorthData);
      setInsurance(insuranceData);
      setAllocation(allocationData);
      setEvents(eventsData);
      setError(null);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Failed to load insights data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string, currency: string = 'GBP') => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insights</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive view of your household finances and assets
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Net Worth Summary */}
      {netWorth && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Net Worth</h2>
          </div>
          <div className="text-4xl font-bold mb-4">
            {formatCurrency(netWorth.net_worth, netWorth.currency)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-blue-200 text-sm">Total Assets</p>
              <p className="text-xl font-semibold flex items-center gap-1">
                <ArrowUp className="h-4 w-4" />
                {formatCurrency(netWorth.total_assets, netWorth.currency)}
              </p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Total Liabilities</p>
              <p className="text-xl font-semibold flex items-center gap-1">
                <ArrowDown className="h-4 w-4" />
                {formatCurrency(netWorth.total_liabilities, netWorth.currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Household Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Family</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview.member_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Properties</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview.property_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Car className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vehicles</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview.vehicle_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Policies</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview.insurance_policy_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Documents</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview.document_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                overview.expiring_doc_count > 0
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  overview.expiring_doc_count > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-400'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expiring</p>
                <p className={`text-xl font-bold ${
                  overview.expiring_doc_count > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}>{overview.expiring_doc_count}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation */}
        {allocation && allocation.by_category.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Asset Allocation</h3>
            </div>
            <div className="space-y-4">
              {/* Progress bar representation */}
              <div className="h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700">
                {allocation.by_category.map((cat, index) => (
                  <div
                    key={cat.category}
                    className={`${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                    style={{ width: `${cat.percentage}%` }}
                    title={`${cat.category}: ${formatPercentage(cat.percentage)}`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-3">
                {allocation.by_category.map((cat, index) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{cat.category}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(cat.value, allocation.currency)} ({formatPercentage(cat.percentage)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(allocation.total, allocation.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Net Worth Breakdown */}
        {netWorth && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Net Worth Breakdown</h3>
            </div>
            <div className="space-y-4">
              {/* Assets */}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Assets</p>
                <div className="space-y-2">
                  {[
                    { label: 'Investments', value: netWorth.investments },
                    { label: 'Cash', value: netWorth.cash },
                    { label: 'Properties', value: netWorth.properties },
                    { label: 'Vehicles', value: netWorth.vehicles },
                    { label: 'Other Assets', value: netWorth.other_assets },
                  ].filter(item => parseFloat(item.value) > 0).map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        +{formatCurrency(item.value, netWorth.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities */}
              {parseFloat(netWorth.total_liabilities) > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Liabilities</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Mortgages', value: netWorth.mortgages },
                      { label: 'Vehicle Finance', value: netWorth.vehicle_finance },
                    ].filter(item => parseFloat(item.value) > 0).map((item) => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          -{formatCurrency(item.value, netWorth.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Net Worth</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(netWorth.net_worth, netWorth.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insurance Coverage */}
        {insurance && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Insurance Coverage</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Coverage</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(insurance.total_coverage, insurance.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Annual Premiums</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(insurance.annual_premiums, insurance.currency)}
                  </p>
                </div>
              </div>

              {insurance.by_type.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">By Type</p>
                  <div className="space-y-2">
                    {insurance.by_type.map((type) => (
                      <div key={type.policy_type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {type.policy_type} ({type.count})
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(type.total_coverage, insurance.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insurance.upcoming_renewals > 0 && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {insurance.upcoming_renewals} policy renewal{insurance.upcoming_renewals > 1 ? 's' : ''} due soon
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {events && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Events</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{events.next_seven_days}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Next 7 Days</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{events.next_thirty_days}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Next 30 Days</p>
                </div>
              </div>

              {events.overdue_events > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{events.overdue_events} overdue event{events.overdue_events > 1 ? 's' : ''}</span>
                </div>
              )}

              {Object.keys(events.by_type).length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">By Type</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(events.by_type).map(([type, count]) => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm"
                      >
                        {type.replace(/_/g, ' ')}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Property & Vehicle Values */}
      {overview && (parseFloat(overview.property_value) > 0 || parseFloat(overview.vehicle_value) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parseFloat(overview.property_value) > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Home className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Property Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(overview.property_value, overview.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Mortgage Balance</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(overview.mortgage_balance, overview.currency)}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Equity</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(overview.property_equity, overview.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {parseFloat(overview.vehicle_value) > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Car className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Vehicle Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(overview.vehicle_value, overview.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Vehicle Count</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {overview.vehicle_count}
                  </span>
                </div>
                {netWorth && parseFloat(netWorth.vehicle_finance) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Finance Balance</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(netWorth.vehicle_finance, netWorth.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
