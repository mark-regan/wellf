import api from './client';
import { User, AuthTokens } from '@/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
  base_currency?: string;
}

interface LoginResponse extends AuthTokens {
  user: User;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<{ message: string; user: User }> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  updateMe: async (data: {
    display_name?: string;
    base_currency?: string;
    date_format?: string;
    locale?: string;
    fire_target?: number;
    fire_enabled?: boolean;
    theme?: string;
    phone_number?: string;
    date_of_birth?: string | null;
    notify_email?: boolean;
    notify_price_alerts?: boolean;
    notify_weekly?: boolean;
    notify_monthly?: boolean;
    watchlist?: string;
    provider_lists?: string;
  }): Promise<User> => {
    const response = await api.put<User>('/auth/me', data);
    return response.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<void> => {
    await api.put('/auth/password', data);
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await api.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
};
