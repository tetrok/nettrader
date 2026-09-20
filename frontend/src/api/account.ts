import { apiClient } from './client';

export interface ProfileData {
  id: number;
  pseudo: string;
  email: string;
  level: number;
  cashback: number;
  mailDaily: boolean;
  mailWeekly: boolean;
  skin: string;
  dateRegistered: number;
  totalTransactions: number;
}

export const accountApi = {
  getProfile: async (): Promise<ProfileData> => {
    return apiClient<ProfileData>('account/profile');
  },

  updateProfile: async (payload: {
    email: string;
    level: number;
    mailDaily: boolean;
    mailWeekly: boolean;
  }): Promise<void> => {
    await apiClient('account/profile', {
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        mailDaily: payload.mailDaily ? 1 : 0,
        mailWeekly: payload.mailWeekly ? 1 : 0,
      }),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
    await apiClient('account/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },

  resetAccount: async (password: string, confirmText = 'OK'): Promise<{ cashback: number }> => {
    return apiClient('account/reset', {
      method: 'POST',
      body: JSON.stringify({ password, confirmText }),
    });
  },
};
