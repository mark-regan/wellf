import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  LayoutDashboard,
  List,
  Bell,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Leaf,
  TrendingUp,
  ChefHat,
  BookOpen,
  Code,
  Home,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { calendarApi, getDomainColor, getDomainBgColor, REMINDER_DOMAINS } from '@/api/calendar';
import { Reminder, ReminderSummary } from '@/types';
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';

type ViewMode = 'list' | 'day' | 'week' | 'month';

const calendarNavItems = [
  { label: 'Overview', href: '/calendar', icon: LayoutDashboard },
  { label: 'All Reminders', href: '/calendar/reminders', icon: List },
  { label: 'Settings', href: '/calendar/settings', icon: Settings },
];

const CalendarLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Calendar"
    description="Manage reminders & schedules across all modules"
    icon={CalendarIcon}
    color="calendar"
    navItems={calendarNavItems}
  >
    {children}
  </HubLayout>
);

const getDomainIcon = (domain: string) => {
  const icons: Record<string, typeof Leaf> = {
    plants: Leaf,
    finance: TrendingUp,
    cooking: ChefHat,
    reading: BookOpen,
    coding: Code,
    household: Home,
    custom: Bell,
  };
  return icons[domain] || Bell;
};

const formatReminderDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isPast(date)) return format(date, 'MMM d');
  return format(date, 'MMM d');
};

export function Calendar() {
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadData = async () => {
    try {
      // Get reminders for a wider date range for calendar views
      const [summaryData, remindersData] = await Promise.all([
        calendarApi.getSummary(),
        calendarApi.listReminders({ limit: 500 }),
      ]);
      setSummary(summaryData);
      setAllReminders(remindersData);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleComplete = async (id: string) => {
    try {
      await calendarApi.completeReminder(id);
      await loadData();
    } catch (error) {
      console.error('Failed to complete reminder:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await calendarApi.dismissReminder(id);
      await loadData();
    } catch (error) {
      console.error('Failed to dismiss reminder:', error);
    }
  };

  const handleGenerateReminders = async () => {
    setGenerating(true);
    try {
      await calendarApi.generateReminders();
      await loadData();
    } catch (error) {
      console.error('Failed to generate reminders:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Navigation handlers
  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get reminders for a specific date
  const getRemindersForDate = (date: Date): Reminder[] => {
    return allReminders.filter((r) => {
      const reminderDate = parseISO(r.reminder_date);
      return isSameDay(reminderDate, date);
    });
  };

  // Filter reminders by status
  const upcomingReminders = allReminders.filter(
    (r) => !r.is_completed && !r.is_dismissed && !isPast(parseISO(r.reminder_date))
  );
  const overdueReminders = allReminders.filter(
    (r) => !r.is_completed && !r.is_dismissed && isPast(parseISO(r.reminder_date)) && !isToday(parseISO(r.reminder_date))
  );

  const ReminderItem = ({ reminder, compact = false }: { reminder: Reminder; compact?: boolean }) => {
    const DomainIcon = getDomainIcon(reminder.domain);
    const isOverdue = !reminder.is_completed && isPast(parseISO(reminder.reminder_date)) && !isToday(parseISO(reminder.reminder_date));

    if (compact) {
      return (
        <div
          className={`text-xs p-1 rounded truncate ${getDomainBgColor(reminder.domain)} ${
            isOverdue ? 'border-l-2 border-red-500' : ''
          }`}
          title={reminder.title}
        >
          <span className={getDomainColor(reminder.domain)}>{reminder.title}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
        <div className={`p-2 rounded-full ${getDomainBgColor(reminder.domain)}`}>
          <DomainIcon className={`h-4 w-4 ${getDomainColor(reminder.domain)}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{reminder.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
              {formatReminderDate(reminder.reminder_date)}
            </span>
            {reminder.entity_name && (
              <>
                <span>-</span>
                <span className="truncate">{reminder.entity_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => handleComplete(reminder.id)}
            title="Mark complete"
          >
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => handleDismiss(reminder.id)}
            title="Dismiss"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    );
  };

  // Navigate to a specific date in day view
  const goToDate = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  // Month View Component
  const MonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayReminders = getRemindersForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => goToDate(day)}
                className={`min-h-[100px] border-t border-l p-1 cursor-pointer hover:bg-muted/70 transition-colors ${
                  !isCurrentMonth ? 'bg-muted/50' : ''
                } ${isDayToday ? 'bg-calendar/5 hover:bg-calendar/10' : ''}`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    !isCurrentMonth ? 'text-muted-foreground' : ''
                  } ${isDayToday ? 'text-calendar' : ''}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isDayToday ? 'bg-calendar text-white' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayReminders.slice(0, 3).map((r) => (
                    <ReminderItem key={r.id} reminder={r} compact />
                  ))}
                  {dayReminders.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{dayReminders.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Week View Component
  const WeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayReminders = getRemindersForDate(day);
            const isDayToday = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[300px] border-l first:border-l-0 ${
                  isDayToday ? 'bg-calendar/5' : ''
                }`}
              >
                <div
                  onClick={() => goToDate(day)}
                  className={`p-2 text-center border-b cursor-pointer transition-colors ${
                    isDayToday ? 'bg-calendar/10 hover:bg-calendar/20' : 'bg-muted hover:bg-muted/70'
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isDayToday ? 'text-calendar' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="p-1 space-y-1">
                  {dayReminders.map((r) => (
                    <ReminderItem key={r.id} reminder={r} compact />
                  ))}
                  {dayReminders.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No reminders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Day View Component
  const DayView = () => {
    const dayReminders = getRemindersForDate(currentDate);
    const isDayToday = isToday(currentDate);

    return (
      <Card>
        <CardHeader className={isDayToday ? 'bg-calendar/5' : ''}>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className={`h-5 w-5 ${isDayToday ? 'text-calendar' : ''}`} />
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
            {isDayToday && (
              <Badge variant="secondary" className="ml-2">
                Today
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {dayReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-calendar/30 mb-4" />
              <h3 className="font-medium mb-2">No reminders for this day</h3>
              <p className="text-sm text-muted-foreground">
                Add a reminder or navigate to another day
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayReminders.map((r) => (
                <ReminderItem key={r.id} reminder={r} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // List View Component (original)
  const ListView = () => (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Total Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '--' : summary?.total_reminders ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active reminders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '--' : summary?.upcoming_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">Due today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '--' : summary?.upcoming_week ?? 0}</div>
            <p className="text-xs text-muted-foreground">Due this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{loading ? '--' : summary?.overdue ?? 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue */}
        {overdueReminders.length > 0 && (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Overdue
              </CardTitle>
              <Badge variant="destructive">{overdueReminders.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {overdueReminders.slice(0, 5).map((reminder) => (
                  <ReminderItem key={reminder.id} reminder={reminder} />
                ))}
                {overdueReminders.length > 5 && (
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link to="/calendar/reminders?filter=overdue">
                      View all {overdueReminders.length} overdue
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming */}
        <Card className={overdueReminders.length === 0 ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-calendar" />
              Upcoming This Week
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/calendar/reminders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : upcomingReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-calendar/30 mb-4" />
                <h3 className="font-medium mb-2">All caught up!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No reminders for this week. Add a new reminder or sync from other modules.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingReminders.slice(0, 8).map((reminder) => (
                  <ReminderItem key={reminder.id} reminder={reminder} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By Domain */}
      {summary?.by_domain && summary.by_domain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-calendar" />
              By Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {summary.by_domain.map(({ domain, count }) => {
                const DomainIcon = getDomainIcon(domain);
                const domainInfo = REMINDER_DOMAINS.find((d) => d.value === domain);
                return (
                  <Link
                    key={domain}
                    to={`/calendar/reminders?domain=${domain}`}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-calendar hover:bg-calendar/5 transition-colors"
                  >
                    <div className={`p-3 rounded-full ${getDomainBgColor(domain)}`}>
                      <DomainIcon className={`h-6 w-6 ${getDomainColor(domain)}`} />
                    </div>
                    <div>
                      <h4 className="font-medium capitalize">{domainInfo?.label || domain}</h4>
                      <p className="text-sm text-muted-foreground">
                        {count} {count === 1 ? 'reminder' : 'reminders'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              to="/calendar/reminders/new"
              className="flex items-center gap-4 p-4 rounded-lg border hover:border-calendar hover:bg-calendar/5 transition-colors"
            >
              <div className="p-3 rounded-full bg-calendar/10">
                <Plus className="h-6 w-6 text-calendar" />
              </div>
              <div>
                <h4 className="font-medium">Add Reminder</h4>
                <p className="text-sm text-muted-foreground">Create a new reminder</p>
              </div>
            </Link>
            <Link
              to="/calendar/reminders"
              className="flex items-center gap-4 p-4 rounded-lg border hover:border-calendar hover:bg-calendar/5 transition-colors"
            >
              <div className="p-3 rounded-full bg-calendar/10">
                <List className="h-6 w-6 text-calendar" />
              </div>
              <div>
                <h4 className="font-medium">All Reminders</h4>
                <p className="text-sm text-muted-foreground">View and manage all</p>
              </div>
            </Link>
            <Link
              to="/calendar/settings"
              className="flex items-center gap-4 p-4 rounded-lg border hover:border-calendar hover:bg-calendar/5 transition-colors"
            >
              <div className="p-3 rounded-full bg-calendar/10">
                <Settings className="h-6 w-6 text-calendar" />
              </div>
              <div>
                <h4 className="font-medium">Calendar Settings</h4>
                <p className="text-sm text-muted-foreground">Configure sync options</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );

  // Get the navigation label based on view mode
  const getNavigationLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    if (viewMode === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    return 'Reminders';
  };

  return (
    <CalendarLayout>
      <div className="space-y-6">
        {/* Header with View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {viewMode === 'list' ? 'Reminders' : getNavigationLabel()}
            </h1>
            <p className="text-muted-foreground">Manage tasks & reminders across all modules</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                className="h-8 px-3"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                className="h-8 px-3"
                onClick={() => setViewMode('day')}
                title="Day view"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                className="h-8 px-3"
                onClick={() => setViewMode('week')}
                title="Week view"
              >
                <CalendarRange className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                className="h-8 px-3"
                onClick={() => setViewMode('month')}
                title="Month view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleGenerateReminders}
              disabled={generating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button asChild className="bg-calendar hover:bg-calendar/90">
              <Link to="/calendar/reminders/new">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Link>
            </Button>
          </div>
        </div>

        {/* Date Navigation for Calendar Views */}
        {viewMode !== 'list' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={navigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-lg font-semibold">{getNavigationLabel()}</div>
          </div>
        )}

        {/* Content based on view mode */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <>
            {viewMode === 'list' && <ListView />}
            {viewMode === 'day' && <DayView />}
            {viewMode === 'week' && <WeekView />}
            {viewMode === 'month' && <MonthView />}
          </>
        )}
      </div>
    </CalendarLayout>
  );
}

export { CalendarLayout, calendarNavItems };
