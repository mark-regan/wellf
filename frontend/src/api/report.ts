import api from './client';
import type {
  HouseholdOverview,
  NetWorthBreakdown,
  InsuranceCoverageReport,
  AssetAllocationReport,
  UpcomingEventsReport,
} from '../types';

export const reportApi = {
  // Get household overview
  getHouseholdOverview: async (): Promise<HouseholdOverview> => {
    const response = await api.get<HouseholdOverview>('/reports/household-overview');
    return response.data;
  },

  // Get net worth breakdown
  getNetWorthBreakdown: async (): Promise<NetWorthBreakdown> => {
    const response = await api.get<NetWorthBreakdown>('/reports/net-worth');
    return response.data;
  },

  // Get insurance coverage report
  getInsuranceCoverage: async (): Promise<InsuranceCoverageReport> => {
    const response = await api.get<InsuranceCoverageReport>('/reports/insurance-coverage');
    return response.data;
  },

  // Get asset allocation report
  getAssetAllocation: async (): Promise<AssetAllocationReport> => {
    const response = await api.get<AssetAllocationReport>('/reports/asset-allocation');
    return response.data;
  },

  // Get upcoming events report
  getUpcomingEvents: async (): Promise<UpcomingEventsReport> => {
    const response = await api.get<UpcomingEventsReport>('/reports/upcoming-events');
    return response.data;
  },
};
