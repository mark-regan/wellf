import api from './client';
import { Property, PropertyOwner, PropertyType, OwnershipType } from '@/types';

interface CreatePropertyRequest {
  name: string;
  property_type: PropertyType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  land_registry_title?: string;
  epc_rating?: string;
  council_tax_band?: string;
  is_primary_residence?: boolean;
  is_rental?: boolean;
  rental_income?: number;
  mortgage_provider?: string;
  mortgage_account_number?: string;
  mortgage_balance?: number;
  mortgage_rate?: number;
  mortgage_end_date?: string;
  mortgage_monthly_payment?: number;
  notes?: string;
}

interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {}

interface AddOwnerRequest {
  person_id: string;
  ownership_percentage: number;
  ownership_type?: OwnershipType;
}

export const propertyApi = {
  list: async (): Promise<Property[]> => {
    const response = await api.get<Property[]>('/properties');
    return response.data;
  },

  get: async (id: string): Promise<Property> => {
    const response = await api.get<Property>(`/properties/${id}`);
    return response.data;
  },

  create: async (data: CreatePropertyRequest): Promise<Property> => {
    const response = await api.post<Property>('/properties', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePropertyRequest): Promise<Property> => {
    const response = await api.put<Property>(`/properties/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/properties/${id}`);
  },

  // Owners
  addOwner: async (propertyId: string, data: AddOwnerRequest): Promise<PropertyOwner> => {
    const response = await api.post<PropertyOwner>(`/properties/${propertyId}/owners`, data);
    return response.data;
  },

  removeOwner: async (propertyId: string, personId: string): Promise<void> => {
    await api.delete(`/properties/${propertyId}/owners/${personId}`);
  },
};
