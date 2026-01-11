// Paperless-ngx integration types

export interface PaperlessConfig {
  paperless_url: string | null;
  is_configured: boolean;
}

export interface PaperlessDocument {
  id: number;
  title: string;
  content?: string;
  created: string;
  created_date: string;
  modified: string;
  added: string;
  correspondent: number | null;
  correspondent__name?: string;
  document_type: number | null;
  document_type__name?: string;
  archive_serial_number: number | null;
  tags: number[];
  original_file_name: string;
  archived_file_name: string;
  owner: number | null;
  notes?: PaperlessNote[];
}

export interface PaperlessNote {
  id: number;
  note: string;
  created: string;
}

export interface PaperlessSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: PaperlessDocument[];
}

export interface PaperlessCorrespondent {
  id: number;
  name: string;
  document_count: number;
}

export interface PaperlessDocumentType {
  id: number;
  name: string;
  document_count: number;
}

export interface PaperlessTag {
  id: number;
  name: string;
  color: string;
  document_count: number;
}

export interface DocumentLink {
  id: string;
  household_id: string;
  paperless_document_id: number;
  paperless_title?: string;
  paperless_correspondent?: string;
  paperless_document_type?: string;
  paperless_created?: string;
  cached_at: string;
  category?: DocumentLinkCategory;
  description?: string;
  linked_person_id?: string;
  linked_property_id?: string;
  linked_vehicle_id?: string;
  linked_policy_id?: string;
  thumbnail_url: string;
  preview_url: string;
  download_url: string;
  created_at: string;
  updated_at: string;
}

export type DocumentLinkCategory =
  | 'IDENTITY'
  | 'INSURANCE'
  | 'PROPERTY'
  | 'VEHICLE'
  | 'FINANCIAL'
  | 'MEDICAL'
  | 'LEGAL'
  | 'OTHER';

export interface CreateDocumentLinkRequest {
  paperless_document_id: number;
  category?: DocumentLinkCategory;
  description?: string;
  linked_person_id?: string;
  linked_property_id?: string;
  linked_vehicle_id?: string;
  linked_policy_id?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}
