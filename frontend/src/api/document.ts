import api from './client';
import type { Document } from '../types';

export interface CreateDocumentData {
  name: string;
  description?: string;
  category: string;
  url: string;
  file_type?: string;
  file_size?: number;
  document_date?: string;
  expiry_date?: string;
  tags?: string[];
  person_id?: string;
  property_id?: string;
  vehicle_id?: string;
  insurance_policy_id?: string;
  notes?: string;
}

export interface UpdateDocumentData extends Partial<CreateDocumentData> {}

export const documentApi = {
  // Get all documents for the user's household
  list: async (category?: string): Promise<Document[]> => {
    const params = category ? `?category=${category}` : '';
    const response = await api.get<Document[]>(`/documents${params}`);
    return response.data;
  },

  // Get a single document by ID
  get: async (id: string): Promise<Document> => {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  },

  // Create a new document
  create: async (data: CreateDocumentData): Promise<Document> => {
    const response = await api.post<Document>('/documents', data);
    return response.data;
  },

  // Update a document
  update: async (id: string, data: UpdateDocumentData): Promise<Document> => {
    const response = await api.put<Document>(`/documents/${id}`, data);
    return response.data;
  },

  // Delete a document
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  // Get expiring documents
  getExpiring: async (days: number = 30): Promise<Document[]> => {
    const response = await api.get<Document[]>(`/documents/expiring?days=${days}`);
    return response.data;
  },

  // Get documents by person
  getByPerson: async (personId: string): Promise<Document[]> => {
    const response = await api.get<Document[]>(`/documents/person/${personId}`);
    return response.data;
  },

  // Get category statistics
  getCategoryStats: async (): Promise<Record<string, number>> => {
    const response = await api.get<Record<string, number>>('/documents/stats');
    return response.data;
  },
};
