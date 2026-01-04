import api from './client';
import { NetWorthSummary, AssetAllocation, TopMover, PerformanceData, PerformancePeriod } from '@/types';

export const dashboardApi = {
  getSummary: async (): Promise<NetWorthSummary> => {
    const response = await api.get<NetWorthSummary>('/dashboard/summary');
    return response.data;
  },

  getAllocation: async (): Promise<AssetAllocation> => {
    const response = await api.get<AssetAllocation>('/dashboard/allocation');
    return response.data;
  },

  getTopMovers: async (): Promise<{ gainers: TopMover[]; losers: TopMover[] }> => {
    const response = await api.get<{ gainers: TopMover[]; losers: TopMover[] }>('/dashboard/top-movers');
    return response.data;
  },

  getPerformance: async (
    period: PerformancePeriod,
    portfolioId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PerformanceData> => {
    const params = new URLSearchParams({ period });
    if (portfolioId) {
      params.append('portfolio_id', portfolioId);
    }
    if (startDate) {
      params.append('start_date', startDate);
    }
    if (endDate) {
      params.append('end_date', endDate);
    }
    const response = await api.get<PerformanceData>(`/dashboard/performance?${params.toString()}`);
    return response.data;
  },
};
