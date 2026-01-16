import api from './client';
import {
  Bill,
  BillPayment,
  Subscription,
  InsurancePolicy,
  MaintenanceTask,
  MaintenanceLog,
  HouseholdSummary,
  CreateBillRequest,
  UpdateBillRequest,
  RecordBillPaymentRequest,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  CreateInsurancePolicyRequest,
  UpdateInsurancePolicyRequest,
  CreateMaintenanceTaskRequest,
  UpdateMaintenanceTaskRequest,
  LogMaintenanceRequest,
} from '@/types';

interface ListFilters {
  all?: boolean;
}

export const householdApi = {
  // =============================================================================
  // Summary
  // =============================================================================

  getSummary: async (currency = 'GBP'): Promise<HouseholdSummary> => {
    const response = await api.get<HouseholdSummary>(`/household/summary?currency=${currency}`);
    return response.data;
  },

  // =============================================================================
  // Bills
  // =============================================================================

  listBills: async (filters?: ListFilters): Promise<Bill[]> => {
    const params = new URLSearchParams();
    if (filters?.all) params.append('all', 'true');
    const queryString = params.toString();
    const url = queryString ? `/household/bills?${queryString}` : '/household/bills';
    const response = await api.get<Bill[]>(url);
    return response.data;
  },

  getBill: async (id: string): Promise<Bill> => {
    const response = await api.get<Bill>(`/household/bills/${id}`);
    return response.data;
  },

  createBill: async (data: CreateBillRequest): Promise<Bill> => {
    const response = await api.post<Bill>('/household/bills', data);
    return response.data;
  },

  updateBill: async (id: string, data: UpdateBillRequest): Promise<Bill> => {
    const response = await api.put<Bill>(`/household/bills/${id}`, data);
    return response.data;
  },

  deleteBill: async (id: string): Promise<void> => {
    await api.delete(`/household/bills/${id}`);
  },

  recordBillPayment: async (billId: string, data: RecordBillPaymentRequest): Promise<BillPayment> => {
    const response = await api.post<BillPayment>(`/household/bills/${billId}/pay`, data);
    return response.data;
  },

  getBillPayments: async (billId: string): Promise<BillPayment[]> => {
    const response = await api.get<BillPayment[]>(`/household/bills/${billId}/payments`);
    return response.data;
  },

  // =============================================================================
  // Subscriptions
  // =============================================================================

  listSubscriptions: async (filters?: ListFilters): Promise<Subscription[]> => {
    const params = new URLSearchParams();
    if (filters?.all) params.append('all', 'true');
    const queryString = params.toString();
    const url = queryString ? `/household/subscriptions?${queryString}` : '/household/subscriptions';
    const response = await api.get<Subscription[]>(url);
    return response.data;
  },

  getSubscription: async (id: string): Promise<Subscription> => {
    const response = await api.get<Subscription>(`/household/subscriptions/${id}`);
    return response.data;
  },

  createSubscription: async (data: CreateSubscriptionRequest): Promise<Subscription> => {
    const response = await api.post<Subscription>('/household/subscriptions', data);
    return response.data;
  },

  updateSubscription: async (id: string, data: UpdateSubscriptionRequest): Promise<Subscription> => {
    const response = await api.put<Subscription>(`/household/subscriptions/${id}`, data);
    return response.data;
  },

  deleteSubscription: async (id: string): Promise<void> => {
    await api.delete(`/household/subscriptions/${id}`);
  },

  // =============================================================================
  // Insurance
  // =============================================================================

  listInsurance: async (filters?: ListFilters): Promise<InsurancePolicy[]> => {
    const params = new URLSearchParams();
    if (filters?.all) params.append('all', 'true');
    const queryString = params.toString();
    const url = queryString ? `/household/insurance?${queryString}` : '/household/insurance';
    const response = await api.get<InsurancePolicy[]>(url);
    return response.data;
  },

  getInsurance: async (id: string): Promise<InsurancePolicy> => {
    const response = await api.get<InsurancePolicy>(`/household/insurance/${id}`);
    return response.data;
  },

  createInsurance: async (data: CreateInsurancePolicyRequest): Promise<InsurancePolicy> => {
    const response = await api.post<InsurancePolicy>('/household/insurance', data);
    return response.data;
  },

  updateInsurance: async (id: string, data: UpdateInsurancePolicyRequest): Promise<InsurancePolicy> => {
    const response = await api.put<InsurancePolicy>(`/household/insurance/${id}`, data);
    return response.data;
  },

  deleteInsurance: async (id: string): Promise<void> => {
    await api.delete(`/household/insurance/${id}`);
  },

  // =============================================================================
  // Maintenance
  // =============================================================================

  listMaintenanceTasks: async (filters?: ListFilters): Promise<MaintenanceTask[]> => {
    const params = new URLSearchParams();
    if (filters?.all) params.append('all', 'true');
    const queryString = params.toString();
    const url = queryString ? `/household/maintenance?${queryString}` : '/household/maintenance';
    const response = await api.get<MaintenanceTask[]>(url);
    return response.data;
  },

  getMaintenanceTask: async (id: string): Promise<MaintenanceTask> => {
    const response = await api.get<MaintenanceTask>(`/household/maintenance/${id}`);
    return response.data;
  },

  createMaintenanceTask: async (data: CreateMaintenanceTaskRequest): Promise<MaintenanceTask> => {
    const response = await api.post<MaintenanceTask>('/household/maintenance', data);
    return response.data;
  },

  updateMaintenanceTask: async (id: string, data: UpdateMaintenanceTaskRequest): Promise<MaintenanceTask> => {
    const response = await api.put<MaintenanceTask>(`/household/maintenance/${id}`, data);
    return response.data;
  },

  deleteMaintenanceTask: async (id: string): Promise<void> => {
    await api.delete(`/household/maintenance/${id}`);
  },

  completeMaintenanceTask: async (taskId: string, data: LogMaintenanceRequest): Promise<MaintenanceLog> => {
    const response = await api.post<MaintenanceLog>(`/household/maintenance/${taskId}/complete`, data);
    return response.data;
  },

  getMaintenanceLogs: async (taskId?: string, limit = 50): Promise<MaintenanceLog[]> => {
    const params = new URLSearchParams();
    if (taskId) params.append('task_id', taskId);
    params.append('limit', limit.toString());
    const response = await api.get<MaintenanceLog[]>(`/household/maintenance/logs?${params.toString()}`);
    return response.data;
  },
};
