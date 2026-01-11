import api from './client';
import type {
  PaperlessConfig,
  PaperlessSearchResult,
  PaperlessDocument,
  PaperlessCorrespondent,
  PaperlessDocumentType,
  PaperlessTag,
  TestConnectionResponse,
} from '../types/paperless';

export const paperlessApi = {
  // Get Paperless configuration
  getConfig: async (): Promise<PaperlessConfig> => {
    const response = await api.get<PaperlessConfig>('/paperless/config');
    return response.data;
  },

  // Test Paperless connection
  testConnection: async (): Promise<TestConnectionResponse> => {
    const response = await api.post<TestConnectionResponse>('/paperless/config/test');
    return response.data;
  },

  // Search documents in Paperless
  searchDocuments: async (query: string = '', page: number = 1): Promise<PaperlessSearchResult> => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    params.set('page', page.toString());
    const response = await api.get<PaperlessSearchResult>(`/paperless/documents?${params.toString()}`);
    return response.data;
  },

  // Get a single document from Paperless
  getDocument: async (id: number): Promise<PaperlessDocument> => {
    const response = await api.get<PaperlessDocument>(`/paperless/documents/${id}`);
    return response.data;
  },

  // Get thumbnail URL for a document (proxied through backend)
  getThumbnailUrl: (id: number): string => {
    const baseURL = import.meta.env.VITE_API_URL || '';
    return `${baseURL}/api/v1/paperless/documents/${id}/thumb`;
  },

  // Get preview URL for a document (proxied through backend)
  getPreviewUrl: (id: number): string => {
    const baseURL = import.meta.env.VITE_API_URL || '';
    return `${baseURL}/api/v1/paperless/documents/${id}/preview`;
  },

  // Get download URL for a document (proxied through backend)
  getDownloadUrl: (id: number): string => {
    const baseURL = import.meta.env.VITE_API_URL || '';
    return `${baseURL}/api/v1/paperless/documents/${id}/download`;
  },

  // Get all correspondents from Paperless
  getCorrespondents: async (): Promise<PaperlessCorrespondent[]> => {
    const response = await api.get<PaperlessCorrespondent[]>('/paperless/correspondents');
    return response.data;
  },

  // Get all document types from Paperless
  getDocumentTypes: async (): Promise<PaperlessDocumentType[]> => {
    const response = await api.get<PaperlessDocumentType[]>('/paperless/document-types');
    return response.data;
  },

  // Get all tags from Paperless
  getTags: async (): Promise<PaperlessTag[]> => {
    const response = await api.get<PaperlessTag[]>('/paperless/tags');
    return response.data;
  },
};
