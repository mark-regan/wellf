import api from './client';
import {
  CalendarConfig,
  Reminder,
  ReminderSummary,
  UpdateCalendarConfigRequest,
  CreateReminderRequest,
  UpdateReminderRequest,
  SnoozeReminderRequest,
  GenerateRemindersRequest,
} from '@/types';

// Reminder filters
interface ReminderFilters {
  domain?: string;
  priority?: string;
  completed?: boolean;
  dismissed?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

export const calendarApi = {
  // =============================================================================
  // Calendar Config
  // =============================================================================

  getConfig: async (): Promise<CalendarConfig | null> => {
    try {
      const response = await api.get<CalendarConfig>('/calendar/config');
      return response.data;
    } catch {
      return null;
    }
  },

  updateConfig: async (data: UpdateCalendarConfigRequest): Promise<CalendarConfig> => {
    const response = await api.put<CalendarConfig>('/calendar/config', data);
    return response.data;
  },

  testConnection: async (): Promise<{ connected: boolean; error?: string }> => {
    const response = await api.post<{ connected: boolean; error?: string }>('/calendar/config/test');
    return response.data;
  },

  deleteConfig: async (): Promise<void> => {
    await api.delete('/calendar/config');
  },

  // =============================================================================
  // Reminders
  // =============================================================================

  listReminders: async (filters?: ReminderFilters): Promise<Reminder[]> => {
    const params = new URLSearchParams();
    if (filters?.domain) params.append('domain', filters.domain);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.completed !== undefined) params.append('completed', filters.completed.toString());
    if (filters?.dismissed !== undefined) params.append('dismissed', filters.dismissed.toString());
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/calendar/reminders?${queryString}` : '/calendar/reminders';
    const response = await api.get<Reminder[]>(url);
    return response.data;
  },

  getReminder: async (id: string): Promise<Reminder> => {
    const response = await api.get<Reminder>(`/calendar/reminders/${id}`);
    return response.data;
  },

  createReminder: async (data: CreateReminderRequest): Promise<Reminder> => {
    const response = await api.post<Reminder>('/calendar/reminders', data);
    return response.data;
  },

  updateReminder: async (id: string, data: UpdateReminderRequest): Promise<Reminder> => {
    const response = await api.put<Reminder>(`/calendar/reminders/${id}`, data);
    return response.data;
  },

  deleteReminder: async (id: string): Promise<void> => {
    await api.delete(`/calendar/reminders/${id}`);
  },

  // =============================================================================
  // Reminder Actions
  // =============================================================================

  completeReminder: async (id: string): Promise<Reminder> => {
    const response = await api.post<Reminder>(`/calendar/reminders/${id}/complete`);
    return response.data;
  },

  dismissReminder: async (id: string): Promise<Reminder> => {
    const response = await api.post<Reminder>(`/calendar/reminders/${id}/dismiss`);
    return response.data;
  },

  snoozeReminder: async (id: string, data: SnoozeReminderRequest): Promise<Reminder> => {
    const response = await api.post<Reminder>(`/calendar/reminders/${id}/snooze`, data);
    return response.data;
  },

  unsnoozeReminder: async (id: string): Promise<Reminder> => {
    const response = await api.post<Reminder>(`/calendar/reminders/${id}/unsnooze`);
    return response.data;
  },

  // =============================================================================
  // Specialized Queries
  // =============================================================================

  getUpcoming: async (days?: number): Promise<Reminder[]> => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get<Reminder[]>(`/calendar/reminders/upcoming${params}`);
    return response.data;
  },

  getOverdue: async (): Promise<Reminder[]> => {
    const response = await api.get<Reminder[]>('/calendar/reminders/overdue');
    return response.data;
  },

  getSummary: async (): Promise<ReminderSummary> => {
    const response = await api.get<ReminderSummary>('/calendar/reminders/summary');
    return response.data;
  },

  // =============================================================================
  // Auto-generation
  // =============================================================================

  generateReminders: async (data?: GenerateRemindersRequest): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/calendar/reminders/generate', data || {});
    return response.data;
  },
};

// Helper constants for UI
export const CALENDAR_PROVIDERS = [
  { value: 'none', label: 'None (Local Only)' },
  { value: 'icloud', label: 'Apple iCloud' },
  { value: 'google', label: 'Google Calendar' },
  { value: 'caldav', label: 'CalDAV' },
] as const;

export const REMINDER_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' },
] as const;

export const RECURRENCE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Interval' },
] as const;

export const REMINDER_DOMAINS = [
  { value: 'plants', label: 'Plants', icon: 'Leaf', color: 'emerald' },
  { value: 'finance', label: 'Finance', icon: 'TrendingUp', color: 'amber' },
  { value: 'cooking', label: 'Cooking', icon: 'ChefHat', color: 'orange' },
  { value: 'reading', label: 'Reading', icon: 'BookOpen', color: 'blue' },
  { value: 'coding', label: 'Coding', icon: 'Code', color: 'purple' },
  { value: 'household', label: 'Household', icon: 'Home', color: 'slate' },
  { value: 'custom', label: 'Custom', icon: 'Bell', color: 'gray' },
] as const;

export const getPriorityColor = (priority: string): string => {
  const colorMap: Record<string, string> = {
    low: 'text-gray-500',
    normal: 'text-blue-500',
    high: 'text-orange-500',
    urgent: 'text-red-500',
  };
  return colorMap[priority] || 'text-gray-500';
};

export const getDomainColor = (domain: string): string => {
  const colorMap: Record<string, string> = {
    plants: 'text-emerald-500',
    finance: 'text-amber-500',
    cooking: 'text-orange-500',
    reading: 'text-blue-500',
    coding: 'text-purple-500',
    household: 'text-slate-500',
    custom: 'text-gray-500',
  };
  return colorMap[domain] || 'text-gray-500';
};

export const getDomainBgColor = (domain: string): string => {
  const colorMap: Record<string, string> = {
    plants: 'bg-emerald-100 dark:bg-emerald-900/30',
    finance: 'bg-amber-100 dark:bg-amber-900/30',
    cooking: 'bg-orange-100 dark:bg-orange-900/30',
    reading: 'bg-blue-100 dark:bg-blue-900/30',
    coding: 'bg-purple-100 dark:bg-purple-900/30',
    household: 'bg-slate-100 dark:bg-slate-900/30',
    custom: 'bg-gray-100 dark:bg-gray-900/30',
  };
  return colorMap[domain] || 'bg-gray-100 dark:bg-gray-900/30';
};
