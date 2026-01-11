# Prompt: Replace Document Management with Paperless-ngx Integration

## Context

I have a Go backend with React/TypeScript frontend application called "wellf" - a family life management system. I previously built document management functionality, but I want to replace it with an integration to my self-hosted Paperless-ngx server instead of storing documents directly.

## Current Tech Stack

**Backend:**
- Go with Chi Router
- PostgreSQL database
- Repository pattern (see `api/internal/repository/` for examples)
- Handlers in `api/internal/handlers/`
- Models in `api/internal/models/`
- JWT authentication middleware

**Frontend:**
- React 18 with TypeScript
- Vite build tooling
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- React Router for navigation
- Types in `frontend/src/types/`
- API clients in `frontend/src/api/`

## What I Want

Replace my existing document storage with a **Paperless-ngx integration** that:

1. Allows users to configure their Paperless-ngx server URL and API token
2. Search and browse documents from their Paperless instance
3. Create "document links" that reference Paperless documents by ID
4. Link these document references to other entities (Person, Property, Vehicle, Insurance Policy)
5. Display linked documents with thumbnails and provide links to view/download from Paperless

## Requirements

### Database Changes

Create a new migration that:

1. Adds Paperless configuration columns to the `households` table:
   - `paperless_url VARCHAR(255)` - The Paperless server URL
   - `paperless_api_token TEXT` - The API token (should be encrypted at rest)

2. Creates a `document_links` table to store references to Paperless documents:
```sql
CREATE TABLE document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Paperless reference
    paperless_document_id INT NOT NULL,
    paperless_title VARCHAR(255),
    paperless_correspondent VARCHAR(100),
    paperless_document_type VARCHAR(100),
    paperless_created DATE,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Local categorisation
    category VARCHAR(50), -- IDENTITY, INSURANCE, PROPERTY, VEHICLE, FINANCIAL, MEDICAL, LEGAL, OTHER
    description TEXT,
    
    -- Polymorphic links to entities
    linked_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    linked_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    linked_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    linked_policy_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(household_id, paperless_document_id)
);
```

3. Remove or deprecate any existing document storage tables if they exist.

### Backend Implementation

#### 1. Paperless API Client (`api/internal/paperless/client.go`)

Create a client to interact with the Paperless-ngx REST API:

- `NewClient(baseURL, apiToken string) *Client`
- `TestConnection(ctx context.Context) error` - Verify credentials work
- `SearchDocuments(ctx context.Context, query string, page int) (*DocumentList, error)`
- `GetDocument(ctx context.Context, id int) (*Document, error)`
- `GetCorrespondents(ctx context.Context) ([]Correspondent, error)`
- `GetDocumentTypes(ctx context.Context) ([]DocumentType, error)`

Paperless API details:
- Base endpoints: `/api/documents/`, `/api/correspondents/`, `/api/document_types/`
- Authentication: `Authorization: Token {api_token}` header
- Version header: `Accept: application/json; version=5`
- Thumbnail: `GET /api/documents/{id}/thumb/`
- Preview: `GET /api/documents/{id}/preview/`
- Download: `GET /api/documents/{id}/download/`
- Search: `GET /api/documents/?query={search_term}&page={page}&page_size=20`

#### 2. Models (`api/internal/models/document_link.go`)

```go
type DocumentLink struct {
    ID                     uuid.UUID  `json:"id"`
    HouseholdID            uuid.UUID  `json:"household_id"`
    PaperlessDocumentID    int        `json:"paperless_document_id"`
    PaperlessTitle         string     `json:"paperless_title"`
    PaperlessCorrespondent string     `json:"paperless_correspondent,omitempty"`
    PaperlessDocumentType  string     `json:"paperless_document_type,omitempty"`
    PaperlessCreated       *time.Time `json:"paperless_created,omitempty"`
    CachedAt               time.Time  `json:"cached_at"`
    Category               string     `json:"category,omitempty"`
    Description            string     `json:"description,omitempty"`
    LinkedPersonID         *uuid.UUID `json:"linked_person_id,omitempty"`
    LinkedPropertyID       *uuid.UUID `json:"linked_property_id,omitempty"`
    LinkedVehicleID        *uuid.UUID `json:"linked_vehicle_id,omitempty"`
    LinkedPolicyID         *uuid.UUID `json:"linked_policy_id,omitempty"`
    CreatedAt              time.Time  `json:"created_at"`
    UpdatedAt              time.Time  `json:"updated_at"`
    // Computed (not stored)
    ThumbnailURL string `json:"thumbnail_url,omitempty"`
    PreviewURL   string `json:"preview_url,omitempty"`
    DownloadURL  string `json:"download_url,omitempty"`
}

const (
    DocCategoryIdentity   = "IDENTITY"
    DocCategoryInsurance  = "INSURANCE"
    DocCategoryProperty   = "PROPERTY"
    DocCategoryVehicle    = "VEHICLE"
    DocCategoryFinancial  = "FINANCIAL"
    DocCategoryMedical    = "MEDICAL"
    DocCategoryLegal      = "LEGAL"
    DocCategoryOther      = "OTHER"
)
```

#### 3. Repository (`api/internal/repository/document_link.go`)

Standard CRUD operations following existing patterns:
- `Create(ctx, link *DocumentLink) error`
- `GetByID(ctx, id uuid.UUID) (*DocumentLink, error)`
- `GetByHouseholdID(ctx, householdID uuid.UUID) ([]*DocumentLink, error)`
- `GetByPersonID(ctx, personID uuid.UUID) ([]*DocumentLink, error)`
- `GetByPropertyID(ctx, propertyID uuid.UUID) ([]*DocumentLink, error)`
- `GetByVehicleID(ctx, vehicleID uuid.UUID) ([]*DocumentLink, error)`
- `GetByPolicyID(ctx, policyID uuid.UUID) ([]*DocumentLink, error)`
- `Delete(ctx, id uuid.UUID) error`
- `ExistsByPaperlessID(ctx, householdID uuid.UUID, paperlessDocID int) (bool, error)`

#### 4. Handlers

**Paperless Config Handler** (`api/internal/handlers/paperless_config.go`):
- `GET /api/v1/paperless/config` - Get current config (mask token)
- `PUT /api/v1/paperless/config` - Update URL and token
- `POST /api/v1/paperless/config/test` - Test connection

**Paperless Proxy Handler** (`api/internal/handlers/paperless_proxy.go`):

Proxy requests to Paperless to avoid CORS issues:
- `GET /api/v1/paperless/documents` - Search documents (proxy to Paperless)
- `GET /api/v1/paperless/documents/{id}` - Get document details
- `GET /api/v1/paperless/documents/{id}/thumb` - Proxy thumbnail
- `GET /api/v1/paperless/correspondents` - List correspondents
- `GET /api/v1/paperless/document-types` - List document types

**Document Link Handler** (`api/internal/handlers/document_link.go`):
- `GET /api/v1/document-links` - List all links for household
- `POST /api/v1/document-links` - Create a new link
- `DELETE /api/v1/document-links/{id}` - Delete a link
- `GET /api/v1/people/{id}/documents` - Get links for a person
- `GET /api/v1/properties/{id}/documents` - Get links for a property
- `GET /api/v1/vehicles/{id}/documents` - Get links for a vehicle
- `GET /api/v1/insurance/{id}/documents` - Get links for a policy

#### 5. Routes

Register in `main.go`:
```go
r.Route("/paperless", func(r chi.Router) {
    r.Use(authMiddleware.Authenticate)
    r.Get("/config", paperlessHandler.GetConfig)
    r.Put("/config", paperlessHandler.UpdateConfig)
    r.Post("/config/test", paperlessHandler.TestConnection)
    r.Get("/documents", paperlessHandler.SearchDocuments)
    r.Get("/documents/{id}", paperlessHandler.GetDocument)
    r.Get("/documents/{id}/thumb", paperlessHandler.ProxyThumbnail)
    r.Get("/correspondents", paperlessHandler.GetCorrespondents)
    r.Get("/document-types", paperlessHandler.GetDocumentTypes)
})

r.Route("/document-links", func(r chi.Router) {
    r.Use(authMiddleware.Authenticate)
    r.Get("/", documentLinkHandler.List)
    r.Post("/", documentLinkHandler.Create)
    r.Delete("/{id}", documentLinkHandler.Delete)
})

// Add to existing entity routes
r.Get("/people/{id}/documents", documentLinkHandler.GetByPerson)
r.Get("/properties/{id}/documents", documentLinkHandler.GetByProperty)
r.Get("/vehicles/{id}/documents", documentLinkHandler.GetByVehicle)
r.Get("/insurance/{id}/documents", documentLinkHandler.GetByPolicy)
```

### Frontend Implementation

#### 1. Types (`frontend/src/types/paperless.ts`)

```typescript
export interface PaperlessConfig {
  paperless_url: string;
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

export interface DocumentLink {
  id: string;
  household_id: string;
  paperless_document_id: number;
  paperless_title: string;
  paperless_correspondent?: string;
  paperless_document_type?: string;
  paperless_created?: string;
  category?: DocumentCategory;
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

export type DocumentCategory = 
  | 'IDENTITY' | 'INSURANCE' | 'PROPERTY' | 'VEHICLE' 
  | 'FINANCIAL' | 'MEDICAL' | 'LEGAL' | 'OTHER';

export interface CreateDocumentLinkRequest {
  paperless_document_id: number;
  category?: DocumentCategory;
  description?: string;
  linked_person_id?: string;
  linked_property_id?: string;
  linked_vehicle_id?: string;
  linked_policy_id?: string;
}
```

#### 2. API Clients

**`frontend/src/api/paperless.ts`**:
```typescript
export const paperlessApi = {
  getConfig: () => api.get<PaperlessConfig>('/paperless/config'),
  updateConfig: (data: { paperless_url: string; paperless_api_token: string }) => 
    api.put('/paperless/config', data),
  testConnection: () => api.post('/paperless/config/test'),
  searchDocuments: (query: string, page = 1) => 
    api.get<PaperlessSearchResult>(`/paperless/documents?query=${query}&page=${page}`),
  getDocument: (id: number) => api.get<PaperlessDocument>(`/paperless/documents/${id}`),
  getThumbnailUrl: (id: number) => `/api/v1/paperless/documents/${id}/thumb`,
  getCorrespondents: () => api.get<PaperlessCorrespondent[]>('/paperless/correspondents'),
  getDocumentTypes: () => api.get<PaperlessDocumentType[]>('/paperless/document-types'),
};
```

**`frontend/src/api/documentLinks.ts`**:
```typescript
export const documentLinksApi = {
  list: () => api.get<DocumentLink[]>('/document-links'),
  create: (data: CreateDocumentLinkRequest) => api.post<DocumentLink>('/document-links', data),
  delete: (id: string) => api.delete(`/document-links/${id}`),
  getByPerson: (personId: string) => api.get<DocumentLink[]>(`/people/${personId}/documents`),
  getByProperty: (propertyId: string) => api.get<DocumentLink[]>(`/properties/${propertyId}/documents`),
  getByVehicle: (vehicleId: string) => api.get<DocumentLink[]>(`/vehicles/${vehicleId}/documents`),
  getByPolicy: (policyId: string) => api.get<DocumentLink[]>(`/insurance/${policyId}/documents`),
};
```

#### 3. Components

**`frontend/src/components/PaperlessDocumentPicker.tsx`**:

A modal dialog that:
- Shows a search input
- Displays search results from Paperless with thumbnails
- Allows filtering by correspondent and document type
- Lets user select a document to link
- Calls `onSelect(document)` when user picks one

**`frontend/src/components/LinkedDocumentsList.tsx`**:

A component that:
- Takes `entityType` ('person' | 'property' | 'vehicle' | 'policy') and `entityId` as props
- Fetches and displays linked documents for that entity
- Shows thumbnail, title, correspondent, document type
- Provides "View in Paperless" button that opens the document
- Provides "Unlink" button to remove the link
- Has "Link Document" button that opens PaperlessDocumentPicker

**`frontend/src/components/PaperlessConfigForm.tsx`**:

A settings form that:
- Shows current Paperless URL (if configured)
- Has inputs for URL and API token
- Has "Test Connection" button
- Has "Save" button
- Shows success/error messages

#### 4. Settings Page Update

Add a new section to the Settings page (`frontend/src/pages/Settings.tsx`):
- Add 'paperless' to the NAV_ITEMS with a FileText or Cloud icon
- Create a Paperless configuration section using PaperlessConfigForm

#### 5. Entity Page Updates

On each entity detail page (Person, Property, Vehicle, Insurance Policy), add the `LinkedDocumentsList` component:

```tsx
<LinkedDocumentsList entityType="property" entityId={property.id} />
```

### Important Considerations

1. **CORS**: The Go backend must proxy all Paperless API requests since Paperless runs on a different domain. Never call Paperless directly from the frontend.

2. **Token Security**: The Paperless API token should be encrypted at rest in the database. Consider using Go's crypto packages or a secrets manager.

3. **Caching**: Cache document metadata (title, correspondent, type) in the `document_links` table to avoid hitting Paperless API for every list view. Update cache periodically or on access.

4. **Error Handling**: Handle cases where:
   - Paperless is not configured
   - Paperless is unreachable
   - Document was deleted from Paperless but link still exists
   - Invalid API token

5. **Thumbnail Proxy**: When proxying thumbnails, set appropriate cache headers so browsers cache them.

6. **URLs**: Generate `thumbnail_url`, `preview_url`, and `download_url` on the backend using the configured Paperless URL and document ID.

## Existing Files to Reference

Look at these files for patterns to follow:
- `api/internal/repository/portfolio.go` - Repository pattern example
- `api/internal/handlers/portfolio.go` - Handler pattern example
- `api/internal/models/models.go` - Model definitions
- `frontend/src/api/portfolios.ts` - API client example
- `frontend/src/pages/Settings.tsx` - Settings page with sections
- `frontend/src/components/ui/` - shadcn/ui components available

## Deliverables

1. Database migration file
2. Go Paperless client package
3. Go models for DocumentLink
4. Go repository for DocumentLink
5. Go handlers for Paperless proxy and DocumentLink CRUD
6. Route registrations
7. Frontend TypeScript types
8. Frontend API clients
9. Frontend components (PaperlessDocumentPicker, LinkedDocumentsList, PaperlessConfigForm)
10. Settings page Paperless section
11. Integration into entity detail pages

## Start With

1. First, show me the current document-related tables/models so I can understand what needs to be removed or migrated
2. Then create the database migration
3. Then implement the backend (client, models, repository, handlers)
4. Finally implement the frontend components

Let me know if you need any clarification on the existing codebase structure or requirements.
