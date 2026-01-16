import api from './client';
import { HubSummary, ActivityLog, UpcomingReminder, Domain } from '@/types';

export interface ActivityResponse {
  activities: ActivityLog[];
}

export interface UpcomingResponse {
  reminders: UpcomingReminder[];
}

export interface LogActivityInput {
  domain: Domain;
  action: 'created' | 'updated' | 'deleted' | 'completed';
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export const hubApi = {
  getSummary: async (): Promise<HubSummary> => {
    const response = await api.get<HubSummary>('/hub/summary');
    return response.data;
  },

  getActivity: async (limit?: number, domain?: Domain): Promise<ActivityLog[]> => {
    const params = new URLSearchParams();
    if (limit) {
      params.append('limit', limit.toString());
    }
    if (domain) {
      params.append('domain', domain);
    }
    const queryString = params.toString();
    const url = queryString ? `/hub/activity?${queryString}` : '/hub/activity';
    const response = await api.get<ActivityResponse>(url);
    return response.data.activities;
  },

  getUpcoming: async (): Promise<UpcomingReminder[]> => {
    const response = await api.get<UpcomingResponse>('/hub/upcoming');
    return response.data.reminders;
  },

  logActivity: async (input: LogActivityInput): Promise<ActivityLog> => {
    const response = await api.post<ActivityLog>('/activity', input);
    return response.data;
  },
};
