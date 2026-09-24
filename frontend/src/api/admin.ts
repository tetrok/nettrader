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

  // Suivi des Cotations & Marché
  getMarketSyncOverview: async (): Promise<{
    overview: import('../types').MarketSyncOverview;
    recentLogs: import('../types').MarketSyncLogItem[];
  }> => {
    return apiClient('admin/market-sync/overview');
  },

  getMarketSyncStocks: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort?: string;
    order?: string;
  } = {}): Promise<{
    items: import('../types').MarketSyncStockItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.search) q.append('search', params.search);
    if (params.status && params.status !== 'all') q.append('status', params.status);
    if (params.sort) q.append('sort', params.sort);
    if (params.order) q.append('order', params.order);
    return apiClient(`admin/market-sync/stocks?${q.toString()}`);
  },

  toggleStockTracking: async (codesico: number): Promise<{ codesico: number; isTracked: boolean }> => {
    return apiClient(`admin/market-sync/stocks/${codesico}/toggle-track`, {
      method: 'POST',
    });
  },

  resetStockErrors: async (codesico: number): Promise<{ codesico: number }> => {
    return apiClient(`admin/market-sync/stocks/${codesico}/reset-errors`, {
      method: 'POST',
    });
  },

  resetAllStockErrors: async (): Promise<void> => {
    await apiClient('admin/market-sync/reset-all-errors', {
      method: 'POST',
    });
  },

  // Catalogue & Gestion des Actions Boursières
  getAdminStocks: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    sectorId?: number;
    marketId?: number;
    authBuy?: string;
    isTracked?: string;
    isArchived?: string;
    sort?: string;
    order?: string;
  } = {}): Promise<{
    items: import('../types').AdminStockItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.search) q.append('search', params.search);
    if (params.sectorId && params.sectorId > 0) q.append('sectorId', params.sectorId.toString());
    if (params.marketId && params.marketId > 0) q.append('marketId', params.marketId.toString());
    if (params.authBuy && params.authBuy !== 'all') q.append('authBuy', params.authBuy);
    if (params.isTracked && params.isTracked !== 'all') q.append('isTracked', params.isTracked);
    if (params.isArchived !== undefined && params.isArchived !== '') q.append('isArchived', params.isArchived);
    if (params.sort) q.append('sort', params.sort);
    if (params.order) q.append('order', params.order);
    return apiClient(`admin/stocks?${q.toString()}`);
  },

  getStockMetadata: async (): Promise<import('../types').AdminStockMetadata> => {
    return apiClient('admin/stocks/metadata');
  },

  createStock: async (payload: import('../types').CreateStockPayload): Promise<{ codesico: number }> => {
    return apiClient('admin/stocks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStock: async (codesico: number, payload: import('../types').UpdateStockPayload): Promise<{ codesico: number }> => {
    return apiClient(`admin/stocks/${codesico}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteStock: async (codesico: number): Promise<void> => {
    await apiClient(`admin/stocks/${codesico}`, {
      method: 'DELETE',
    });
  },

  archiveStock: async (codesico: number): Promise<import('../types').ArchiveStockResult> => {
    return apiClient(`admin/stocks/${codesico}/archive`, {
      method: 'POST',
    });
  },

  unarchiveStock: async (codesico: number): Promise<{ success: boolean; codesico: number }> => {
    return apiClient(`admin/stocks/${codesico}/unarchive`, {
      method: 'POST',
    });
  },

  archiveBulkStocks: async (codes: number[]): Promise<import('../types').ArchiveStockResult> => {
    return apiClient('admin/stocks/archive-bulk', {
      method: 'POST',
      body: JSON.stringify({ codes }),
    });
  },

  toggleStockAuthBuy: async (codesico: number): Promise<{ codesico: number; authBuy: boolean }> => {
    return apiClient(`admin/stocks/${codesico}/toggle-buy`, {
      method: 'POST',
    });
  },

  splitStock: async (payload: import('../types').SplitStockPayload): Promise<{ success: boolean; newPrice: number }> => {
    return apiClient('admin/stocks/split', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Yahoo Finance Discovery & Index Sync
  discoverYahooMarket: async (params: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<{
    total: number;
    limit: number;
    offset: number;
    items: import('../types').YahooStockCandidate[];
  }> => {
    const q = new URLSearchParams();
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.offset !== undefined) q.append('offset', params.offset.toString());
    if (params.search) q.append('search', params.search);
    return apiClient(`admin/yahoo/discover?${q.toString()}`);
  },

  getYahooIndex: async (indexName: string): Promise<import('../types').YahooIndexOverview> => {
    return apiClient(`admin/yahoo/index/${encodeURIComponent(indexName)}`);
  },

  syncYahooIndex: async (indexName: string): Promise<import('../types').YahooSyncResult> => {
    return apiClient(`admin/yahoo/sync-index/${encodeURIComponent(indexName)}`, {
      method: 'POST',
    });
  },

  importYahooStocks: async (items: Array<{
    symbol?: string;
    yahooname?: string;
    name?: string;
    nom?: string;
    price?: number;
    valeur?: number;
  }>): Promise<import('../types').YahooSyncResult> => {
    return apiClient('admin/yahoo/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
};

