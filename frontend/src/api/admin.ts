import { apiClient } from './client';
import {
  AdminForumSection,
  AdminForumItem,
  AdminTopicItem,
  AdminMessageItem,
} from '../types';

export interface AdminDashboardData {
  totalPlayers: number;
  pendingOrders: number;
  activeSessions: number;
  totalStocks: number;
  pendingTeamApprovals: number;
  phpVersion: string;
  serverTime: number;
}

export const adminApi = {
  getDashboard: async (): Promise<AdminDashboardData> => {
    return apiClient<AdminDashboardData>('admin/dashboard');
  },

  getPlayers: async (page = 1, limit = 25, search = ''): Promise<{
    items: Array<{
      id: number;
      pseudo: string;
      email: string;
      cashback: number;
      registeredAt: number;
      lastActive: number;
      level: number;
      authLevel: number;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> => {
    return apiClient(`admin/players?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },

  executeOrdersJob: async (): Promise<void> => {
    await apiClient('admin/jobs/execute-orders', { method: 'POST' });
  },

  // Forum Sections
  getForumSections: async (): Promise<AdminForumSection[]> => {
    return apiClient<AdminForumSection[]>('admin/forum/sections');
  },

  createForumSection: async (name: string): Promise<{ id: number; name: string }> => {
    return apiClient<{ id: number; name: string }>('admin/forum/sections', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  // Forums
  getAdminForums: async (): Promise<AdminForumItem[]> => {
    return apiClient<AdminForumItem[]>('admin/forum/forums');
  },

  createAdminForum: async (data: {
    name: string;
    description: string;
    sectionId: number;
    authread: string;
    authwrite: string;
  }): Promise<{ id: number }> => {
    return apiClient<{ id: number }>('admin/forum/forums', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAdminForum: async (
    id: number,
    data: {
      name: string;
      description: string;
      sectionId: number;
      authread: string;
      authwrite: string;
    }
  ): Promise<void> => {
    await apiClient(`admin/forum/forums/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAdminForum: async (id: number): Promise<void> => {
    await apiClient(`admin/forum/forums/${id}`, {
      method: 'DELETE',
    });
  },

  syncAdminForum: async (id: number): Promise<void> => {
    await apiClient(`admin/forum/forums/${id}/sync`, {
      method: 'POST',
    });
  },

  // Topics
  getAdminTopics: async (
    page = 1,
    limit = 20,
    forumId = 0,
    search = ''
  ): Promise<{
    items: AdminTopicItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (forumId > 0) params.append('forumId', forumId.toString());
    if (search) params.append('search', search);
    return apiClient(`admin/forum/topics?${params.toString()}`);
  },

  updateAdminTopic: async (
    id: number,
    data: { title?: string; forumId?: number }
  ): Promise<void> => {
    await apiClient(`admin/forum/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAdminTopic: async (id: number): Promise<void> => {
    await apiClient(`admin/forum/topics/${id}`, {
      method: 'DELETE',
    });
  },

  // Messages
  getAdminMessages: async (
    page = 1,
    limit = 20,
    query = '',
    author = '',
    topicId = 0
  ): Promise<{
    items: AdminMessageItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (query) params.append('query', query);
    if (author) params.append('author', author);
    if (topicId > 0) params.append('topicId', topicId.toString());
    return apiClient(`admin/forum/messages?${params.toString()}`);
  },

  updateAdminMessage: async (id: number, content: string): Promise<void> => {
    await apiClient(`admin/forum/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  deleteAdminMessage: async (id: number): Promise<void> => {
    await apiClient(`admin/forum/messages/${id}`, {
      method: 'DELETE',
    });
  },
};
