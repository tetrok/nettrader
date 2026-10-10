/**
 * NetTrader 2 — Client API des Données de Marché & Cotations
 *
 * Usage:
 *   Expose les requêtes pour consulter la synthèse du marché, le catalogue des actions et l'historique des cours.
 */

import { apiClient } from './client';
import { MarketSummary, Stock, StockDetail, StockHistoryPoint, ChartPeriod } from '../types';

export const marketApi = {
  getSummary: async (): Promise<MarketSummary> => {
    return apiClient<MarketSummary>('market/summary');
  },

  getStocks: async (search = ''): Promise<Stock[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient<Stock[]>(`market/stocks${query}`);
  },

  getStock: async (code: number, period: ChartPeriod = '1m'): Promise<StockDetail> => {
    return apiClient<StockDetail>(`market/stocks/${code}?period=${period}`);
  },

  getStockHistory: async (code: number, period: ChartPeriod = '1m'): Promise<StockHistoryPoint[]> => {
    const res = await apiClient<{ code: number; period: ChartPeriod; history: StockHistoryPoint[] }>(
      `market/stocks/${code}/history?period=${period}`
    );
    return res.history;
  },
};

