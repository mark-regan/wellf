import api from './client';
import { Person, FamilyRelationship, RelationshipType, Gender, PersonMetadata } from '@/types';

interface CreatePersonRequest {
  household_id: string;
  first_name: string;
  last_name?: string;
  nickname?: string;
  date_of_birth?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  national_insurance_number?: string;
  passport_number?: string;
  driving_licence_number?: string;
  blood_type?: string;
  medical_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  avatar_url?: string;
  is_primary_account_holder?: boolean;
  metadata?: PersonMetadata;
}

interface UpdatePersonRequest {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  date_of_birth?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  national_insurance_number?: string;
  passport_number?: string;
  driving_licence_number?: string;
  blood_type?: string;
  medical_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  avatar_url?: string;
  is_primary_account_holder?: boolean;
  metadata?: PersonMetadata;
}

interface AddRelationshipRequest {
  related_person_id: string;
  relationship_type: RelationshipType;
}

export const personApi = {
  list: async (householdId?: string): Promise<Person[]> => {
    const params = householdId ? `?household_id=${householdId}` : '';
    const response = await api.get<Person[]>(`/people${params}`);
    return response.data;
  },

  get: async (id: string): Promise<Person> => {
    const response = await api.get<Person>(`/people/${id}`);
    return response.data;
  },

  create: async (data: CreatePersonRequest): Promise<Person> => {
    const response = await api.post<Person>('/people', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePersonRequest): Promise<Person> => {
    const response = await api.put<Person>(`/people/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/people/${id}`);
  },

  // Relationships
  getRelationships: async (personId: string): Promise<FamilyRelationship[]> => {
    const response = await api.get<FamilyRelationship[]>(`/people/${personId}/relationships`);
    return response.data;
  },

  addRelationship: async (personId: string, data: AddRelationshipRequest): Promise<FamilyRelationship> => {
    const response = await api.post<FamilyRelationship>(`/people/${personId}/relationships`, data);
    return response.data;
  },

  removeRelationship: async (personId: string, relationshipId: string): Promise<void> => {
    await api.delete(`/people/${personId}/relationships/${relationshipId}`);
  },
};
