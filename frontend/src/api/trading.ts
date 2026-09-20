import { apiClient } from './client';
import { Portfolio, Order, HistoryItem, SimulationResult } from '../types';

export interface PlaceOrderPayload {
  sens: 'achat' | 'vente';
  codesicav: number;
  quantity: number;
  valmin?: number;
  valmax?: number;
  validity?: number;
  select?: string;
  seuil?: string;
  nb2?: string;
}

export const tradingApi = {
  getPortfolio: async (): Promise<Portfolio> => {
    return apiClient<Portfolio>('trading/portfolio');
  },

  getOrders: async (): Promise<Order[]> => {
    return apiClient<Order[]>('trading/orders');
  },

  placeOrder: async (payload: PlaceOrderPayload): Promise<{ message: string }> => {
    return apiClient<{ message: string }>('trading/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelOrder: async (id: string): Promise<void> => {
    await apiClient(`trading/orders/${id}`, {
      method: 'DELETE',
    });
  },

  cancelAllOrders: async (): Promise<void> => {
    await apiClient('trading/orders', {
      method: 'DELETE',
    });
  },

  getHistory: async (page = 1, limit = 20): Promise<{
    items: HistoryItem[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    return apiClient(`trading/history?page=${page}&limit=${limit}`);
  },

  simulate: async (code: number, quantity = 1): Promise<SimulationResult> => {
    return apiClient<SimulationResult>(`trading/simulate?codesico=${code}&quantity=${quantity}`);
  },
};
