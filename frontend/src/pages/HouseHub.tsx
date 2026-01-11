import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Calendar,
  PawPrint,
  ChevronRight,
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

export default function HouseHub() {
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
      console.error('Failed to load HouseHub data:', err);
      setError('Failed to load data');
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HouseHub</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your household at a glance
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Net Worth Summary - Links to Finance Hub */}
      {netWorth && (
        <Link to="/finance" className="block group">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6" />
                <h2 className="text-lg font-semibold">Net Worth</h2>
              </div>
              <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        </Link>
      )}

      {/* Quick Stats Cards - Each links to its section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Family Members Card */}
        <Link to="/people" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">People</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview?.member_count || 0}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Pets Card */}
        <Link to="/pets" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-pink-300 dark:hover:border-pink-600 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg group-hover:bg-pink-200 dark:group-hover:bg-pink-900/50 transition-colors">
                <PawPrint className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pets</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview?.pet_count || 0}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Properties Card */}
        <Link to="/properties" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-green-300 dark:hover:border-green-600 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Properties</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview?.property_count || 0}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Vehicles Card */}
        <Link to="/vehicles" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                <Car className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vehicles</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview?.vehicle_count || 0}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Insurance Policies Card */}
        <Link to="/insurance" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Policies</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview?.insurance_policy_count || 0}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Documents Card */}
        <Link to="/documents" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/50 transition-colors">
                <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Documents</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{overview?.document_count || 0}</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming Events Card - Links to Calendar */}
      {events && (
        <Link to="/calendar" className="block group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Events</h3>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{events.next_seven_days}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Next 7 Days</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{events.next_thirty_days}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Next 30 Days</p>
              </div>
              {events.overdue_events > 0 && (
                <div className="col-span-2 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{events.overdue_events} overdue</span>
                </div>
              )}
              {overview && overview.expiring_doc_count > 0 && (
                <div className="col-span-2 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{overview.expiring_doc_count} expiring soon</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation - Links to Finance */}
        {allocation && allocation.by_category.length > 0 && (
          <Link to="/finance" className="block group">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-full transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <PieChart className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Asset Allocation</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          </Link>
        )}

        {/* Insurance Coverage - Links to Insurance */}
        {insurance && (
          <Link to="/insurance" className="block group">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-full transition-all hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Insurance Coverage</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          </Link>
        )}

        {/* Net Worth Breakdown - Links to Finance */}
        {netWorth && (
          <Link to="/finance" className="block group">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-full transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Net Worth Breakdown</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          </Link>
        )}

        {/* Property Summary - Links to Properties */}
        {overview && parseFloat(overview.property_value) > 0 && (
          <Link to="/properties" className="block group">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-full transition-all hover:border-green-300 dark:hover:border-green-600 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Property Summary</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          </Link>
        )}
      </div>

      {/* Vehicle Summary - Links to Vehicles */}
      {overview && parseFloat(overview.vehicle_value) > 0 && (
        <Link to="/vehicles" className="block group">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Vehicle Summary</h3>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Value</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(overview.vehicle_value, overview.currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Vehicle Count</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {overview.vehicle_count}
                </p>
              </div>
              {netWorth && parseFloat(netWorth.vehicle_finance) > 0 && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Finance Balance</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(netWorth.vehicle_finance, netWorth.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
