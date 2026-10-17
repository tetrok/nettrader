/**
 * NetTrader 2 — Client API d'Analytique Administrateur
 *
 * Usage:
 *   Récupère les métriques de synthèse, les statistiques de trading et le journal des problèmes
 *   depuis l'endpoint /api/admin/analytics/overview.
 */

import { apiClient } from './client';

export interface AnalyticsOverviewData {
  periodDays: number;
  kpis: {
    totalEvents: number;
    uniqueSessions: number;
    activeUsers: number;
    totalErrors: number;
  };
  usages: {
    topPages: Array<{
      path: string;
      views: number;
    }>;
  };
  trading: {
    summary: {
      modalOpened: number;
      submitted: number;
      success: number;
      failed: number;
      blocked: number;
    };
    sens: Array<{
      sens: string;
      count: number;
    }>;
  };
  errors: {
    total: number;
    breakdown: Array<{
      type: string;
      count: number;
    }>;
    recent: Array<{
      id: number;
      type: string;
      message: string;
      route: string | null;
      statusCode: number | null;
      stackTrace: string | null;
      context: Record<string, any> | null;
      createdAt: string;
      userId: number | null;
    }>;
  };
}

export const adminAnalyticsApi = {
  getOverview: async (days = 7): Promise<AnalyticsOverviewData> => {
    return apiClient<AnalyticsOverviewData>(`admin/analytics/overview?days=${days}`);
  },
};
