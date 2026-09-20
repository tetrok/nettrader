import { apiClient, setToken } from './client';
import { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: async (login: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient<LoginResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    if (res.token) {
      setToken(res.token);
    }
    return res;
  },

  register: async (payload: {
    pseudo: string;
    email: string;
    password: string;
    level: number;
    mailDaily?: boolean;
    mailWeekly?: boolean;
  }): Promise<{ id: number; pseudo: string; email: string }> => {
    return apiClient('auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        mailJour: payload.mailDaily ? 1 : 0,
        mailSemaine: payload.mailWeekly ? 1 : 0,
      }),
    });
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient('auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
    }
  },

  getMe: async (): Promise<User> => {
    return apiClient<User>('auth/me');
  },

  requestPasswordReset: async (login: string): Promise<void> => {
    await apiClient('auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ login }),
    });
  },
};
