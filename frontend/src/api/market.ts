import { apiClient } from './client';
import { MarketSummary, Stock, StockDetail } from '../types';

export const marketApi = {
  getSummary: async (): Promise<MarketSummary> => {
    return apiClient<MarketSummary>('market/summary');
  },

  getStocks: async (search = ''): Promise<Stock[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient<Stock[]>(`market/stocks${query}`);
  },

  getStock: async (code: number): Promise<StockDetail> => {
    return apiClient<StockDetail>(`market/stocks/${code}`);
  },
};
