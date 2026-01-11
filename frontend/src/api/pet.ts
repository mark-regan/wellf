import api from './client';
import { Pet, PetType, PetGender } from '@/types';

interface CreatePetRequest {
  household_id: string;
  name: string;
  pet_type: PetType;
  breed?: string;
  date_of_birth?: string;
  gender?: PetGender;
  microchip_number?: string;
  vet_name?: string;
  vet_phone?: string;
  vet_address?: string;
  insurance_policy_id?: string;
  notes?: string;
}

interface UpdatePetRequest {
  name?: string;
  pet_type?: PetType;
  breed?: string;
  date_of_birth?: string;
  gender?: PetGender;
  microchip_number?: string;
  vet_name?: string;
  vet_phone?: string;
  vet_address?: string;
  insurance_policy_id?: string;
  notes?: string;
}

export const petApi = {
  list: async (householdId?: string): Promise<Pet[]> => {
    const params = householdId ? `?household_id=${householdId}` : '';
    const response = await api.get<Pet[]>(`/pets${params}`);
    return response.data;
  },

  get: async (id: string): Promise<Pet> => {
    const response = await api.get<Pet>(`/pets/${id}`);
    return response.data;
  },

  create: async (data: CreatePetRequest): Promise<Pet> => {
    const response = await api.post<Pet>('/pets', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePetRequest): Promise<Pet> => {
    const response = await api.put<Pet>(`/pets/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/pets/${id}`);
  },
};
