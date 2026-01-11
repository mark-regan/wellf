import api from './client';
import type { DocumentLink, CreateDocumentLinkRequest } from '../types/paperless';

export const documentLinksApi = {
  // Get all document links for the household
  list: async (): Promise<DocumentLink[]> => {
    const response = await api.get<DocumentLink[]>('/document-links');
    return response.data;
  },

  // Create a new document link
  create: async (data: CreateDocumentLinkRequest): Promise<DocumentLink> => {
    const response = await api.post<DocumentLink>('/document-links', data);
    return response.data;
  },

  // Delete a document link
  delete: async (id: string): Promise<void> => {
    await api.delete(`/document-links/${id}`);
  },

  // Get document links for a specific person
  getByPerson: async (personId: string): Promise<DocumentLink[]> => {
    const response = await api.get<DocumentLink[]>(`/people/${personId}/documents`);
    return response.data;
  },

  // Get document links for a specific property
  getByProperty: async (propertyId: string): Promise<DocumentLink[]> => {
    const response = await api.get<DocumentLink[]>(`/properties/${propertyId}/documents`);
    return response.data;
  },

  // Get document links for a specific vehicle
  getByVehicle: async (vehicleId: string): Promise<DocumentLink[]> => {
    const response = await api.get<DocumentLink[]>(`/vehicles/${vehicleId}/documents`);
    return response.data;
  },

  // Get document links for a specific insurance policy
  getByPolicy: async (policyId: string): Promise<DocumentLink[]> => {
    const response = await api.get<DocumentLink[]>(`/insurance/${policyId}/documents`);
    return response.data;
  },
};
