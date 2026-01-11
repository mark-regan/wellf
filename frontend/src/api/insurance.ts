import api from './client';
import {
  InsurancePolicy,
  InsuranceCoveredPerson,
  InsuranceClaim,
  InsurancePolicyType,
  PremiumFrequency,
  CoverageType,
  InsuranceClaimType,
  InsuranceClaimStatus,
} from '@/types';

interface CreatePolicyRequest {
  policy_name: string;
  policy_type: InsurancePolicyType;
  provider?: string;
  policy_number?: string;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  premium_amount?: number;
  premium_frequency?: PremiumFrequency;
  excess_amount?: number;
  cover_amount?: number;
  currency?: string;
  auto_renewal?: boolean;
  property_id?: string;
  vehicle_id?: string;
  broker_name?: string;
  broker_phone?: string;
  broker_email?: string;
  notes?: string;
}

interface UpdatePolicyRequest extends Partial<CreatePolicyRequest> {}

interface AddCoveredPersonRequest {
  person_id: string;
  coverage_type?: CoverageType;
  notes?: string;
}

interface CreateClaimRequest {
  claim_reference?: string;
  claim_date: string;
  incident_date?: string;
  claim_type?: InsuranceClaimType;
  description?: string;
  claim_amount?: number;
  currency?: string;
  status?: InsuranceClaimStatus;
}

interface UpdateClaimRequest {
  claim_reference?: string;
  claim_date?: string;
  incident_date?: string;
  claim_type?: InsuranceClaimType;
  description?: string;
  claim_amount?: number;
  settled_amount?: number;
  excess_paid?: number;
  currency?: string;
  status?: InsuranceClaimStatus;
  resolution_date?: string;
  resolution_notes?: string;
}

export const insuranceApi = {
  // Policies
  list: async (): Promise<InsurancePolicy[]> => {
    const response = await api.get<InsurancePolicy[]>('/insurance');
    return response.data;
  },

  get: async (id: string): Promise<InsurancePolicy> => {
    const response = await api.get<InsurancePolicy>(`/insurance/${id}`);
    return response.data;
  },

  create: async (data: CreatePolicyRequest): Promise<InsurancePolicy> => {
    const response = await api.post<InsurancePolicy>('/insurance', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePolicyRequest): Promise<InsurancePolicy> => {
    const response = await api.put<InsurancePolicy>(`/insurance/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/insurance/${id}`);
  },

  getUpcomingRenewals: async (days?: number): Promise<InsurancePolicy[]> => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get<InsurancePolicy[]>(`/insurance/upcoming-renewals${params}`);
    return response.data;
  },

  // Covered people
  getCoveredPeople: async (policyId: string): Promise<InsuranceCoveredPerson[]> => {
    const response = await api.get<InsuranceCoveredPerson[]>(`/insurance/${policyId}/covered-people`);
    return response.data;
  },

  addCoveredPerson: async (policyId: string, data: AddCoveredPersonRequest): Promise<InsuranceCoveredPerson> => {
    const response = await api.post<InsuranceCoveredPerson>(`/insurance/${policyId}/covered-people`, data);
    return response.data;
  },

  removeCoveredPerson: async (policyId: string, personId: string): Promise<void> => {
    await api.delete(`/insurance/${policyId}/covered-people/${personId}`);
  },

  // Claims
  getClaims: async (policyId: string): Promise<InsuranceClaim[]> => {
    const response = await api.get<InsuranceClaim[]>(`/insurance/${policyId}/claims`);
    return response.data;
  },

  addClaim: async (policyId: string, data: CreateClaimRequest): Promise<InsuranceClaim> => {
    const response = await api.post<InsuranceClaim>(`/insurance/${policyId}/claims`, data);
    return response.data;
  },

  updateClaim: async (policyId: string, claimId: string, data: UpdateClaimRequest): Promise<InsuranceClaim> => {
    const response = await api.put<InsuranceClaim>(`/insurance/${policyId}/claims/${claimId}`, data);
    return response.data;
  },

  deleteClaim: async (policyId: string, claimId: string): Promise<void> => {
    await api.delete(`/insurance/${policyId}/claims/${claimId}`);
  },
};
