import api from './client';
import type { Reminder, CalendarEvent, ReminderSummary } from '../types';

export const reminderApi = {
  // Get all upcoming reminders
  list: async (days: number = 90): Promise<Reminder[]> => {
    const response = await api.get<Reminder[]>(`/reminders?days=${days}`);
    return response.data;
  },

  // Get reminder summary statistics
  getSummary: async (days: number = 90): Promise<ReminderSummary> => {
    const response = await api.get<ReminderSummary>(`/reminders/summary?days=${days}`);
    return response.data;
  },

  // Get calendar events for a date range
  getCalendarEvents: async (startDate: string, endDate: string): Promise<CalendarEvent[]> => {
    const response = await api.get<CalendarEvent[]>(`/reminders/calendar?start=${startDate}&end=${endDate}`);
    return response.data;
  },
};
