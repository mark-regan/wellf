import { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  FileText,
  Car,
  Shield,
  Home,
  Bell,
  Filter,
} from 'lucide-react';
import { reminderApi } from '../api/reminder';
import type { Reminder, CalendarEvent, ReminderSummary, ReminderType, ReminderPriority, EntityType } from '../types';

const REMINDER_TYPE_CONFIG: Record<ReminderType, { label: string; icon: React.ReactNode; color: string }> = {
  DOCUMENT_EXPIRY: { label: 'Document Expiry', icon: <FileText className="h-4 w-4" />, color: 'blue' },
  VEHICLE_MOT: { label: 'Vehicle MOT', icon: <Car className="h-4 w-4" />, color: 'orange' },
  VEHICLE_TAX: { label: 'Vehicle Tax', icon: <Car className="h-4 w-4" />, color: 'yellow' },
  VEHICLE_INSURANCE: { label: 'Vehicle Insurance', icon: <Car className="h-4 w-4" />, color: 'cyan' },
  VEHICLE_SERVICE: { label: 'Vehicle Service', icon: <Car className="h-4 w-4" />, color: 'gray' },
  INSURANCE_RENEWAL: { label: 'Insurance Renewal', icon: <Shield className="h-4 w-4" />, color: 'purple' },
  MORTGAGE_END: { label: 'Mortgage End', icon: <Home className="h-4 w-4" />, color: 'green' },
};

const PRIORITY_COLORS: Record<ReminderPriority, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ENTITY_ROUTES: Record<EntityType, string> = {
  document: '/documents',
  vehicle: '/vehicles',
  insurance: '/insurance',
  property: '/properties',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedTypes, setSelectedTypes] = useState<ReminderType[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    try {
      setLoading(true);
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const [remindersList, events, summaryData] = await Promise.all([
        reminderApi.list(180),
        reminderApi.getCalendarEvents(startDate, endDate),
        reminderApi.getSummary(90),
      ]);

      setReminders(remindersList);
      setCalendarEvents(events);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const filteredReminders = useMemo(() => {
    if (selectedTypes.length === 0) return reminders;
    return reminders.filter((r) => selectedTypes.includes(r.type));
  }, [reminders, selectedTypes]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    calendarEvents.forEach((event) => {
      if (selectedTypes.length === 0 || selectedTypes.includes(event.type)) {
        if (!map[event.date]) map[event.date] = [];
        map[event.date].push(event);
      }
    });
    return map;
  }, [calendarEvents, selectedTypes]);

  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    return filteredReminders.filter((r) => r.due_date.startsWith(selectedDate));
  }, [filteredReminders, selectedDate]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const toggleType = (type: ReminderType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date().toISOString().split('T')[0];

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  if (loading && reminders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar & Reminders</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track upcoming events and deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Reminders</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.total_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{summary.overdue_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Urgent</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.urgent_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {Object.values(eventsByDate).reduce((sum, events) => sum + events.length, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm transition-colors ${
              showFilters || selectedTypes.length > 0
                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {selectedTypes.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                {selectedTypes.length}
              </span>
            )}
          </button>
          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Clear filters
            </button>
          )}
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REMINDER_TYPE_CONFIG) as ReminderType[]).map((type) => {
                const config = REMINDER_TYPE_CONFIG[type];
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {config.icon}
                    <span className="ml-1.5">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Today
                </button>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const events = eventsByDate[dateStr] || [];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square p-1 rounded-lg text-sm transition-colors relative ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isToday
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <span className="block">{day}</span>
                    {events.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {events.slice(0, 3).map((event, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              event.priority === 'URGENT' || event.priority === 'HIGH'
                                ? 'bg-red-500'
                                : event.priority === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                          />
                        ))}
                        {events.length > 3 && (
                          <span className="text-[10px] text-gray-500">+{events.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Events */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {selectedDate ? formatDate(selectedDate) : 'Select a date'}
            </h3>
            {selectedDate ? (
              selectedDateReminders.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateReminders.map((reminder) => {
                    const config = REMINDER_TYPE_CONFIG[reminder.type];
                    return (
                      <div
                        key={reminder.id}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {reminder.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {reminder.entity_name}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[reminder.priority]}`}>
                                {reminder.priority}
                              </span>
                              {reminder.is_overdue && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No events on this date
                </p>
              )
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Click on a date to see events
              </p>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reminders</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {selectedTypes.length > 0
                  ? 'Try adjusting your filters'
                  : 'No upcoming reminders found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReminders.map((reminder) => {
                const config = REMINDER_TYPE_CONFIG[reminder.type];
                return (
                  <div
                    key={reminder.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      reminder.is_overdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {reminder.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[reminder.priority]}`}>
                            {reminder.priority}
                          </span>
                          {reminder.is_overdue && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {reminder.entity_name}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDate(reminder.due_date)}
                          </span>
                          <span className={`${
                            reminder.days_until < 0
                              ? 'text-red-600 dark:text-red-400'
                              : reminder.days_until <= 7
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {reminder.days_until < 0
                              ? `${Math.abs(reminder.days_until)} days overdue`
                              : reminder.days_until === 0
                              ? 'Due today'
                              : `${reminder.days_until} days left`}
                          </span>
                        </div>
                      </div>
                      <a
                        href={ENTITY_ROUTES[reminder.entity_type]}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        View
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
