import api from './client';
import { AdminUser } from '../types';

export const adminApi = {
  listUsers: async (): Promise<AdminUser[]> => {
    const response = await api.get<AdminUser[]>('/admin/users');
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  lockUser: async (id: string): Promise<void> => {
    await api.put(`/admin/users/${id}/lock`);
  },

  unlockUser: async (id: string): Promise<void> => {
    await api.put(`/admin/users/${id}/unlock`);
  },

  setAdmin: async (id: string, isAdmin: boolean): Promise<void> => {
    await api.put(`/admin/users/${id}/admin`, { is_admin: isAdmin });
  },

  resetPassword: async (id: string): Promise<{ password: string }> => {
    const response = await api.post<{ password: string }>(`/admin/users/${id}/reset-password`);
    return response.data;
  },
};
