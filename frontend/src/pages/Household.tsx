import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import {
  Home,
  LayoutDashboard,
  Receipt,
  CreditCard,
  Shield,
  Wrench,
  Plus,
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { householdApi } from '@/api/household';
import { calendarApi } from '@/api/calendar';
import { HouseholdSummary, Bill, MaintenanceTask } from '@/types';
import { formatCurrency } from '@/utils/format';

const householdNavItems = [
  { label: 'Overview', href: '/household', icon: LayoutDashboard },
  { label: 'Bills', href: '/household/bills', icon: Receipt },
  { label: 'Subscriptions', href: '/household/subscriptions', icon: CreditCard },
  { label: 'Insurance', href: '/household/insurance', icon: Shield },
  { label: 'Maintenance', href: '/household/maintenance', icon: Wrench },
];

const HouseholdLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Household"
    description="Manage bills, subscriptions, insurance & maintenance"
    icon={Home}
    color="household"
    navItems={householdNavItems}
  >
    {children}
  </HubLayout>
);

export function Household() {
  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [overdueBills, setOverdueBills] = useState<Bill[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    try {
      const [summaryData, billsData, maintenanceData] = await Promise.all([
        householdApi.getSummary(),
        householdApi.listBills(),
        householdApi.listMaintenanceTasks(),
      ]);
      setSummary(summaryData);

      const overdue = billsData.filter((b) => b.is_overdue);
      const upcoming = billsData
        .filter((b) => !b.is_overdue && b.days_until_due !== undefined && b.days_until_due <= 7)
        .sort((a, b) => (a.days_until_due ?? 0) - (b.days_until_due ?? 0));
      setOverdueBills(overdue);
      setUpcomingBills(upcoming.slice(0, 5));

      const upcomingMaint = maintenanceData
        .filter((t) => t.days_until_due !== undefined && t.days_until_due <= 14)
        .sort((a, b) => (a.days_until_due ?? 0) - (b.days_until_due ?? 0));
      setUpcomingMaintenance(upcomingMaint.slice(0, 5));
    } catch (error) {
      console.error('Failed to load household data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncToCalendar = async () => {
    setSyncing(true);
    try {
      await calendarApi.generateReminders({ domain: 'household' });
    } catch (error) {
      console.error('Failed to sync reminders:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <HouseholdLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Household</h1>
            <p className="text-muted-foreground">Bills, subscriptions, insurance & maintenance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncToCalendar} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync to Calendar'}
            </Button>
            <Button asChild variant="outline">
              <Link to="/household/bills/new">
                <Receipt className="mr-2 h-4 w-4" />
                Add Bill
              </Link>
            </Button>
            <Button asChild className="bg-household hover:bg-household/90">
              <Link to="/household/subscriptions/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Subscription
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Monthly Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '--' : formatCurrency(summary?.monthly_spending ?? 0, 'GBP')}
              </div>
              <p className="text-xs text-muted-foreground">Bills + subscriptions + insurance</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.bills_count ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary?.monthly_bills ?? 0, 'GBP')}/month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.subscriptions_count ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary?.monthly_subscriptions ?? 0, 'GBP')}/month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Insurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.insurance_count ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary?.monthly_insurance ?? 0, 'GBP')}/month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Row */}
        {!loading && (summary?.overdue_bills ?? 0) > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">
                  {summary?.overdue_bills} bill{summary?.overdue_bills !== 1 ? 's' : ''} overdue
                </p>
                <p className="text-sm text-muted-foreground">Please review and make payments</p>
              </div>
              <Button variant="destructive" asChild>
                <Link to="/household/bills">View Bills</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Bills */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-household" />
                Upcoming Bills
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/household/bills">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : upcomingBills.length === 0 ? (
                <p className="text-muted-foreground">No bills due in the next 7 days</p>
              ) : (
                <div className="space-y-3">
                  {upcomingBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{bill.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {bill.days_until_due === 0
                            ? 'Due today'
                            : bill.days_until_due === 1
                              ? 'Due tomorrow'
                              : `Due in ${bill.days_until_due} days`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(bill.amount, bill.currency)}</p>
                        {bill.auto_pay && (
                          <span className="text-xs text-muted-foreground">Auto-pay</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overdue Bills */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Overdue
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/household/bills?filter=overdue">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : overdueBills.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <p>All bills are up to date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueBills.slice(0, 5).map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                    >
                      <div>
                        <p className="font-medium">{bill.name}</p>
                        <p className="text-sm text-destructive">
                          {Math.abs(bill.days_until_due ?? 0)} days overdue
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(bill.amount, bill.currency)}</p>
                        <Button size="sm" variant="destructive" className="mt-1" asChild>
                          <Link to={`/household/bills/${bill.id}`}>Pay Now</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Maintenance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-household" />
                Upcoming Maintenance
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/household/maintenance">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : upcomingMaintenance.length === 0 ? (
                <p className="text-muted-foreground">No maintenance tasks due soon</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMaintenance.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{task.category}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm ${task.is_overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                        >
                          {task.is_overdue
                            ? `${Math.abs(task.days_until_due ?? 0)} days overdue`
                            : task.days_until_due === 0
                              ? 'Due today'
                              : `In ${task.days_until_due} days`}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full capitalize
                            ${task.priority === 'urgent' ? 'bg-destructive/20 text-destructive' : ''}
                            ${task.priority === 'high' ? 'bg-orange-500/20 text-orange-600' : ''}
                            ${task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-600' : ''}
                            ${task.priority === 'low' ? 'bg-muted text-muted-foreground' : ''}
                          `}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Annual Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-household" />
                Annual Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monthly Bills</span>
                  <span className="font-medium">
                    {formatCurrency(summary?.monthly_bills ?? 0, 'GBP')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monthly Subscriptions</span>
                  <span className="font-medium">
                    {formatCurrency(summary?.monthly_subscriptions ?? 0, 'GBP')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monthly Insurance</span>
                  <span className="font-medium">
                    {formatCurrency(summary?.monthly_insurance ?? 0, 'GBP')}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Monthly</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(summary?.monthly_spending ?? 0, 'GBP')}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-muted/50 rounded-lg p-3 -mx-1">
                  <span className="font-medium">Annual Total</span>
                  <span className="font-bold text-xl text-household">
                    {formatCurrency(summary?.annual_spending ?? 0, 'GBP')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </HouseholdLayout>
  );
}

export { HouseholdLayout, householdNavItems };
