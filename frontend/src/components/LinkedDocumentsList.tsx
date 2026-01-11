import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Calendar,
  User,
  Tag,
  Loader2,
  AlertCircle,
  Link2Off,
} from 'lucide-react';
import { Button } from './ui/button';
import { PaperlessDocumentPicker } from './PaperlessDocumentPicker';
import { documentLinksApi } from '../api/documentLinks';
import { paperlessApi } from '../api/paperless';
import type { DocumentLink, DocumentLinkCategory, PaperlessDocument, PaperlessConfig } from '../types/paperless';

type EntityType = 'person' | 'property' | 'vehicle' | 'policy';

interface LinkedDocumentsListProps {
  entityType: EntityType;
  entityId: string;
  category?: DocumentLinkCategory;
}

const CATEGORY_LABELS: Record<DocumentLinkCategory, string> = {
  IDENTITY: 'Identity',
  INSURANCE: 'Insurance',
  PROPERTY: 'Property',
  VEHICLE: 'Vehicle',
  FINANCIAL: 'Financial',
  MEDICAL: 'Medical',
  LEGAL: 'Legal',
  OTHER: 'Other',
};

export function LinkedDocumentsList({
  entityType,
  entityId,
  category,
}: LinkedDocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PaperlessConfig | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadConfig();
    loadDocuments();
  }, [entityType, entityId]);

  const loadConfig = async () => {
    try {
      const cfg = await paperlessApi.getConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed to load Paperless config:', err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      let docs: DocumentLink[];
      switch (entityType) {
        case 'person':
          docs = await documentLinksApi.getByPerson(entityId);
          break;
        case 'property':
          docs = await documentLinksApi.getByProperty(entityId);
          break;
        case 'vehicle':
          docs = await documentLinksApi.getByVehicle(entityId);
          break;
        case 'policy':
          docs = await documentLinksApi.getByPolicy(entityId);
          break;
        default:
          docs = [];
      }
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setError(err.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocument = async (doc: PaperlessDocument) => {
    setLinking(true);
    try {
      const linkData: any = {
        paperless_document_id: doc.id,
        category: category,
      };

      // Set the appropriate linked entity ID
      switch (entityType) {
        case 'person':
          linkData.linked_person_id = entityId;
          break;
        case 'property':
          linkData.linked_property_id = entityId;
          break;
        case 'vehicle':
          linkData.linked_vehicle_id = entityId;
          break;
        case 'policy':
          linkData.linked_policy_id = entityId;
          break;
      }

      await documentLinksApi.create(linkData);
      await loadDocuments();
    } catch (err: any) {
      console.error('Failed to link document:', err);
      setError(err.response?.data?.error || 'Failed to link document');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (linkId: string) => {
    if (!confirm('Are you sure you want to unlink this document?')) {
      return;
    }

    setDeleting(linkId);
    try {
      await documentLinksApi.delete(linkId);
      setDocuments(docs => docs.filter(d => d.id !== linkId));
    } catch (err: any) {
      console.error('Failed to unlink document:', err);
      setError(err.response?.data?.error || 'Failed to unlink document');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  // Don't show anything if Paperless is not configured
  if (config && !config.is_configured) {
    return null;
  }

  const linkedDocIds = documents.map(d => d.paperless_document_id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Linked Documents
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPicker(true)}
          disabled={linking || !config?.is_configured}
        >
          {linking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Link Document
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Link2Off className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No documents linked</p>
          {config?.is_configured && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowPicker(true)}
              className="mt-2"
            >
              Link a document from Paperless
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-12 h-16 bg-muted rounded overflow-hidden">
                <img
                  src={doc.thumbnail_url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {doc.paperless_title || `Document #${doc.paperless_document_id}`}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {doc.paperless_correspondent && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {doc.paperless_correspondent}
                    </span>
                  )}
                  {doc.paperless_document_type && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {doc.paperless_document_type}
                    </span>
                  )}
                  {doc.paperless_created && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(doc.paperless_created)}
                    </span>
                  )}
                  {doc.category && (
                    <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(doc.preview_url, '_blank')}
                  title="View document"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(doc.download_url, '_blank')}
                  title="Download document"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleUnlink(doc.id)}
                  disabled={deleting === doc.id}
                  title="Unlink document"
                >
                  {deleting === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Picker Modal */}
      <PaperlessDocumentPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectDocument}
        excludeDocumentIds={linkedDocIds}
      />
    </div>
  );
}
