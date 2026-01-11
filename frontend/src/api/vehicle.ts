import api from './client';
import { Vehicle, VehicleUser, VehicleServiceRecord, VehicleType, FuelType, ServiceType } from '@/types';

interface CreateVehicleRequest {
  name: string;
  vehicle_type: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  registration?: string;
  vin?: string;
  color?: string;
  fuel_type?: FuelType;
  transmission?: string;
  engine_size?: string;
  mileage?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  currency?: string;
  mot_expiry?: string;
  tax_expiry?: string;
  insurance_expiry?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  finance_provider?: string;
  finance_end_date?: string;
  finance_monthly_payment?: number;
  finance_balance?: number;
  notes?: string;
}

interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> {}

interface AddVehicleUserRequest {
  person_id: string;
  is_primary_driver?: boolean;
  is_named_on_insurance?: boolean;
}

interface AddServiceRecordRequest {
  service_type: ServiceType;
  service_date: string;
  mileage?: number;
  provider?: string;
  description?: string;
  cost?: number;
  currency?: string;
  next_service_date?: string;
  next_service_mileage?: number;
  notes?: string;
}

export const vehicleApi = {
  list: async (): Promise<Vehicle[]> => {
    const response = await api.get<Vehicle[]>('/vehicles');
    return response.data;
  },

  get: async (id: string): Promise<Vehicle> => {
    const response = await api.get<Vehicle>(`/vehicles/${id}`);
    return response.data;
  },

  create: async (data: CreateVehicleRequest): Promise<Vehicle> => {
    const response = await api.post<Vehicle>('/vehicles', data);
    return response.data;
  },

  update: async (id: string, data: UpdateVehicleRequest): Promise<Vehicle> => {
    const response = await api.put<Vehicle>(`/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`);
  },

  // Vehicle users
  addUser: async (vehicleId: string, data: AddVehicleUserRequest): Promise<VehicleUser> => {
    const response = await api.post<VehicleUser>(`/vehicles/${vehicleId}/users`, data);
    return response.data;
  },

  removeUser: async (vehicleId: string, personId: string): Promise<void> => {
    await api.delete(`/vehicles/${vehicleId}/users/${personId}`);
  },

  // Service records
  getServiceRecords: async (vehicleId: string, limit?: number): Promise<VehicleServiceRecord[]> => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get<VehicleServiceRecord[]>(`/vehicles/${vehicleId}/service-records${params}`);
    return response.data;
  },

  addServiceRecord: async (vehicleId: string, data: AddServiceRecordRequest): Promise<VehicleServiceRecord> => {
    const response = await api.post<VehicleServiceRecord>(`/vehicles/${vehicleId}/service-records`, data);
    return response.data;
  },

  deleteServiceRecord: async (vehicleId: string, recordId: string): Promise<void> => {
    await api.delete(`/vehicles/${vehicleId}/service-records/${recordId}`);
  },

  // Upcoming MOTs
  getUpcomingMOTs: async (days?: number): Promise<Vehicle[]> => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get<Vehicle[]>(`/vehicles/upcoming-mots${params}`);
    return response.data;
  },
};
