import api from './client';
import { AssetSearchResult, AssetDetails, PriceHistory, FixedAsset } from '@/types';

interface CreateFixedAssetRequest {
  name: string;
  category: string;
  description?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value: number;
  currency?: string;
  valuation_date?: string;
  valuation_notes?: string;
}

export interface HistoricalPriceResponse {
  symbol: string;
  date: string;
  price: number;
}

export const assetApi = {
  search: async (query: string): Promise<AssetSearchResult[]> => {
    const response = await api.get<AssetSearchResult[]>(`/assets/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getDetails: async (symbol: string): Promise<AssetDetails> => {
    const response = await api.get<AssetDetails>(`/assets/${encodeURIComponent(symbol)}`);
    return response.data;
  },

  getHistory: async (symbol: string, period = '1y'): Promise<PriceHistory[]> => {
    const response = await api.get<PriceHistory[]>(`/assets/${encodeURIComponent(symbol)}/history?period=${period}`);
    return response.data;
  },

  getHistoricalPrice: async (symbol: string, date: string): Promise<HistoricalPriceResponse> => {
    const response = await api.get<HistoricalPriceResponse>(
      `/assets/historical-price?symbol=${encodeURIComponent(symbol)}&date=${date}`
    );
    return response.data;
  },

  refreshPrices: async (): Promise<{ message: string; count: number }> => {
    const response = await api.post<{ message: string; count: number }>('/assets/refresh');
    return response.data;
  },
};

export const fixedAssetApi = {
  list: async (): Promise<FixedAsset[]> => {
    const response = await api.get<FixedAsset[]>('/fixed-assets');
    return response.data;
  },

  get: async (id: string): Promise<FixedAsset> => {
    const response = await api.get<FixedAsset>(`/fixed-assets/${id}`);
    return response.data;
  },

  create: async (data: CreateFixedAssetRequest): Promise<FixedAsset> => {
    const response = await api.post<FixedAsset>('/fixed-assets', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateFixedAssetRequest>): Promise<FixedAsset> => {
    const response = await api.put<FixedAsset>(`/fixed-assets/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/fixed-assets/${id}`);
  },
};
