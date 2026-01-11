import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Calendar, User, Tag, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Modal, ModalFooter } from './ui/modal';
import { Button } from './ui/button';
import { paperlessApi } from '../api/paperless';
import type { PaperlessDocument, PaperlessSearchResult, PaperlessCorrespondent, PaperlessDocumentType } from '../types/paperless';

interface PaperlessDocumentPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (document: PaperlessDocument) => void;
  excludeDocumentIds?: number[];
}

export function PaperlessDocumentPicker({
  isOpen,
  onClose,
  onSelect,
  excludeDocumentIds = [],
}: PaperlessDocumentPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PaperlessSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<PaperlessDocument | null>(null);
  const [correspondents, setCorrespondents] = useState<PaperlessCorrespondent[]>([]);
  const [documentTypes, setDocumentTypes] = useState<PaperlessDocumentType[]>([]);

  // Load metadata on mount
  useEffect(() => {
    if (isOpen) {
      loadMetadata();
      searchDocuments('', 1);
    }
  }, [isOpen]);

  const loadMetadata = async () => {
    try {
      const [corr, types] = await Promise.all([
        paperlessApi.getCorrespondents(),
        paperlessApi.getDocumentTypes(),
      ]);
      setCorrespondents(corr);
      setDocumentTypes(types);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const searchDocuments = useCallback(async (query: string, page: number) => {
    setLoading(true);
    setError(null);
    try {
      const results = await paperlessApi.searchDocuments(query, page);
      setSearchResults(results);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.response?.data?.error || 'Failed to search documents');
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setSelectedDocument(null);
    searchDocuments(searchQuery, 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    searchDocuments(searchQuery, newPage);
  };

  const handleSelectDocument = () => {
    if (selectedDocument) {
      onSelect(selectedDocument);
      onClose();
      setSelectedDocument(null);
      setSearchQuery('');
    }
  };

  const getCorrespondentName = (id: number | null): string => {
    if (!id) return '';
    const correspondent = correspondents.find(c => c.id === id);
    return correspondent?.name || '';
  };

  const getDocumentTypeName = (id: number | null): string => {
    if (!id) return '';
    const docType = documentTypes.find(t => t.id === id);
    return docType?.name || '';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  const filteredResults = searchResults?.results.filter(
    doc => !excludeDocumentIds.includes(doc.id)
  ) || [];

  const totalPages = searchResults ? Math.ceil(searchResults.count / 20) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Document from Paperless"
      description="Search and select a document from your Paperless-ngx server"
      size="xl"
    >
      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Results */}
      <div className="min-h-[400px] max-h-[400px] overflow-y-auto border rounded-lg">
        {loading && !searchResults ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="h-12 w-12 mb-2" />
            <p>No documents found</p>
            {searchQuery && (
              <p className="text-sm">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredResults.map((doc) => {
              const isSelected = selectedDocument?.id === doc.id;
              const correspondentName = getCorrespondentName(doc.correspondent);
              const docTypeName = getDocumentTypeName(doc.document_type);

              return (
                <div
                  key={doc.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDocument(doc)}
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-12 h-16 bg-muted rounded overflow-hidden">
                    <img
                      src={paperlessApi.getThumbnailUrl(doc.id)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {correspondentName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {correspondentName}
                        </span>
                      )}
                      {docTypeName && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {docTypeName}
                        </span>
                      )}
                      {doc.created_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.created_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages} ({searchResults?.count} results)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSelectDocument} disabled={!selectedDocument}>
          Select Document
        </Button>
      </ModalFooter>
    </Modal>
  );
}
