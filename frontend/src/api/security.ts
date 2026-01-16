import api from './client';

// 2FA Setup response
interface TOTPSetup {
  secret: string;
  otp_auth_url: string;
}

// 2FA Enable response
interface Enable2FAResponse {
  success: boolean;
  message: string;
  backup_codes: string[];
}

// 2FA Status response
interface TOTPStatus {
  enabled: boolean;
}

export const securityApi = {
  // =============================================================================
  // Data Export
  // =============================================================================

  exportData: async (): Promise<Record<string, unknown>> => {
    const response = await api.get<Record<string, unknown>>('/security/export');
    return response.data;
  },

  downloadExport: async (): Promise<Blob> => {
    const response = await api.get('/security/export/download', {
      responseType: 'blob',
    });
    return response.data;
  },

  // =============================================================================
  // Two-Factor Authentication
  // =============================================================================

  get2FAStatus: async (): Promise<TOTPStatus> => {
    const response = await api.get<TOTPStatus>('/security/2fa/status');
    return response.data;
  },

  setup2FA: async (): Promise<TOTPSetup> => {
    const response = await api.post<TOTPSetup>('/security/2fa/setup');
    return response.data;
  },

  enable2FA: async (secret: string, code: string): Promise<Enable2FAResponse> => {
    const response = await api.post<Enable2FAResponse>('/security/2fa/enable', { secret, code });
    return response.data;
  },

  disable2FA: async (code: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/security/2fa/disable', { code });
    return response.data;
  },

  verify2FA: async (code: string): Promise<{ valid: boolean }> => {
    const response = await api.post<{ valid: boolean }>('/security/2fa/verify', { code });
    return response.data;
  },

  generateBackupCodes: async (code: string): Promise<{ backup_codes: string[] }> => {
    const response = await api.post<{ backup_codes: string[] }>('/security/2fa/backup-codes', { code });
    return response.data;
  },

  // =============================================================================
  // Account Management
  // =============================================================================

  requestAccountDeletion: async (password: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/security/delete-account', { password });
    return response.data;
  },

  confirmAccountDeletion: async (password: string, confirmation: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/security/delete-account/confirm', {
      password,
      confirmation,
    });
    return response.data;
  },
};
