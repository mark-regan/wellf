import api from './client';
import { Household, HouseholdMember, HouseholdRole } from '@/types';

interface CreateHouseholdRequest {
  name: string;
}

interface InviteMemberRequest {
  email: string;
  role?: HouseholdRole;
}

export const householdApi = {
  list: async (): Promise<Household[]> => {
    const response = await api.get<Household[]>('/households');
    return response.data;
  },

  get: async (id: string): Promise<Household> => {
    const response = await api.get<Household>(`/households/${id}`);
    return response.data;
  },

  getDefault: async (): Promise<Household> => {
    const response = await api.get<Household>('/households/default');
    return response.data;
  },

  create: async (data: CreateHouseholdRequest): Promise<Household> => {
    const response = await api.post<Household>('/households', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateHouseholdRequest>): Promise<Household> => {
    const response = await api.put<Household>(`/households/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/households/${id}`);
  },

  // Members
  getMembers: async (householdId: string): Promise<HouseholdMember[]> => {
    const response = await api.get<HouseholdMember[]>(`/households/${householdId}/members`);
    return response.data;
  },

  inviteMember: async (householdId: string, data: InviteMemberRequest): Promise<HouseholdMember> => {
    const response = await api.post<HouseholdMember>(`/households/${householdId}/members`, data);
    return response.data;
  },

  removeMember: async (householdId: string, memberId: string): Promise<void> => {
    await api.delete(`/households/${householdId}/members/${memberId}`);
  },
};
