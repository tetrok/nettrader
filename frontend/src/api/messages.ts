import { apiClient } from './client';
import { Message } from '../types';

export const messagesApi = {
  getInbox: async (page = 1, limit = 20): Promise<{
    items: Message[];
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
  }> => {
    return apiClient(`messages?page=${page}&limit=${limit}`);
  },

  sendMessage: async (payload: {
    recipient: string;
    title: string;
    content: string;
  }): Promise<void> => {
    await apiClient('messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteMessage: async (id: number): Promise<void> => {
    await apiClient(`messages/${id}`, {
      method: 'DELETE',
    });
  },
};
