import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Tag,
  User,
  Home,
  Car,
  Shield,
  Clock,
  X,
  ChevronDown,
} from 'lucide-react';
import { documentApi, CreateDocumentData, UpdateDocumentData } from '../api/document';
import { personApi } from '../api/person';
import { propertyApi } from '../api/property';
import { vehicleApi } from '../api/vehicle';
import { insuranceApi } from '../api/insurance';
import type { Document, DocumentCategory, Person, Property, Vehicle, InsurancePolicy } from '../types';

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'IDENTITY', label: 'Identity', icon: <User className="h-4 w-4" /> },
  { value: 'PROPERTY', label: 'Property', icon: <Home className="h-4 w-4" /> },
  { value: 'VEHICLE', label: 'Vehicle', icon: <Car className="h-4 w-4" /> },
  { value: 'INSURANCE', label: 'Insurance', icon: <Shield className="h-4 w-4" /> },
  { value: 'FINANCIAL', label: 'Financial', icon: <FileText className="h-4 w-4" /> },
  { value: 'MEDICAL', label: 'Medical', icon: <FileText className="h-4 w-4" /> },
  { value: 'LEGAL', label: 'Legal', icon: <FileText className="h-4 w-4" /> },
  { value: 'OTHER', label: 'Other', icon: <FileText className="h-4 w-4" /> },
];

const FILE_TYPES = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'JPG', 'PNG', 'OTHER'];

interface DocumentFormData {
  name: string;
  description: string;
  category: DocumentCategory;
  url: string;
  file_type: string;
  document_date: string;
  expiry_date: string;
  tags: string;
  person_id: string;
  property_id: string;
  vehicle_id: string;
  insurance_policy_id: string;
  notes: string;
}

const initialFormData: DocumentFormData = {
  name: '',
  description: '',
  category: 'OTHER',
  url: '',
  file_type: '',
  document_date: '',
  expiry_date: '',
  tags: '',
  person_id: '',
  property_id: '',
  vehicle_id: '',
  insurance_policy_id: '',
  notes: '',
};

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<Document[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Linked entities for dropdowns
  const [people, setPeople] = useState<Person[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, expiring, stats, peopleList, propertiesList, vehiclesList, insuranceList] = await Promise.all([
        documentApi.list(selectedCategory || undefined),
        documentApi.getExpiring(30),
        documentApi.getCategoryStats(),
        personApi.list(),
        propertyApi.list(),
        vehicleApi.list(),
        insuranceApi.list(),
      ]);
      setDocuments(docs);
      setExpiringDocuments(expiring);
      setCategoryStats(stats);
      setPeople(peopleList);
      setProperties(propertiesList);
      setVehicles(vehiclesList);
      setInsurancePolicies(insuranceList);
      setError(null);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const handleCreateDocument = async () => {
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.url.trim()) {
      setFormError('URL is required');
      return;
    }

    try {
      setSubmitting(true);
      const createData: CreateDocumentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        url: formData.url.trim(),
        file_type: formData.file_type || undefined,
        document_date: formData.document_date || undefined,
        expiry_date: formData.expiry_date || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        person_id: formData.person_id || undefined,
        property_id: formData.property_id || undefined,
        vehicle_id: formData.vehicle_id || undefined,
        insurance_policy_id: formData.insurance_policy_id || undefined,
        notes: formData.notes.trim() || undefined,
      };
      await documentApi.create(createData);
      setShowCreateModal(false);
      setFormData(initialFormData);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDocument = async () => {
    if (!selectedDocument) return;
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.url.trim()) {
      setFormError('URL is required');
      return;
    }

    try {
      setSubmitting(true);
      const updateData: UpdateDocumentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        url: formData.url.trim(),
        file_type: formData.file_type || undefined,
        document_date: formData.document_date || undefined,
        expiry_date: formData.expiry_date || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        person_id: formData.person_id || undefined,
        property_id: formData.property_id || undefined,
        vehicle_id: formData.vehicle_id || undefined,
        insurance_policy_id: formData.insurance_policy_id || undefined,
        notes: formData.notes.trim() || undefined,
      };
      await documentApi.update(selectedDocument.id, updateData);
      setShowEditModal(false);
      setSelectedDocument(null);
      setFormData(initialFormData);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to update document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;
    try {
      setSubmitting(true);
      await documentApi.delete(selectedDocument.id);
      setShowDeleteModal(false);
      setSelectedDocument(null);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (doc: Document) => {
    setSelectedDocument(doc);
    setFormData({
      name: doc.name,
      description: doc.description || '',
      category: doc.category,
      url: doc.url,
      file_type: doc.file_type || '',
      document_date: doc.document_date || '',
      expiry_date: doc.expiry_date || '',
      tags: doc.tags?.join(', ') || '',
      person_id: doc.person_id || '',
      property_id: doc.property_id || '',
      vehicle_id: doc.vehicle_id || '',
      insurance_policy_id: doc.insurance_policy_id || '',
      notes: doc.notes || '',
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const openDeleteModal = (doc: Document) => {
    setSelectedDocument(doc);
    setFormError(null);
    setShowDeleteModal(true);
  };

  const getCategoryIcon = (category: DocumentCategory) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category);
    return cat?.icon || <FileText className="h-4 w-4" />;
  };

  const getCategoryLabel = (category: DocumentCategory) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getExpiryStatus = (doc: Document) => {
    if (!doc.expiry_date) return null;
    if (doc.is_expired) return 'expired';
    if (doc.days_until_expiry !== undefined && doc.days_until_expiry <= 30) return 'expiring';
    return 'valid';
  };

  const totalDocuments = Object.values(categoryStats).reduce((a, b) => a + b, 0);

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Store links to your important documents
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setFormError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Document
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalDocuments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{expiringDocuments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <User className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Identity Docs</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{categoryStats['IDENTITY'] || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Insurance Docs</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{categoryStats['INSURANCE'] || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      {expiringDocuments.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-200">Documents Expiring Soon</h3>
              <ul className="mt-2 space-y-1">
                {expiringDocuments.slice(0, 5).map((doc) => (
                  <li key={doc.id} className="text-sm text-amber-700 dark:text-amber-300">
                    <span className="font-medium">{doc.name}</span> - expires {formatDate(doc.expiry_date)}
                    {doc.days_until_expiry !== undefined && doc.days_until_expiry >= 0 && (
                      <span className="text-amber-600 dark:text-amber-400"> ({doc.days_until_expiry} days)</span>
                    )}
                  </li>
                ))}
              </ul>
              {expiringDocuments.length > 5 && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  And {expiringDocuments.length - 5} more...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${
              showFilters || selectedCategory
                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
            {selectedCategory && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                1
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  !selectedCategory
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat.icon}
                  <span className="ml-1.5">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first document'}
            </p>
            {!searchQuery && !selectedCategory && (
              <button
                onClick={() => {
                  setFormData(initialFormData);
                  setFormError(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Document
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDocuments.map((doc) => {
              const expiryStatus = getExpiryStatus(doc);
              return (
                <div key={doc.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${
                        expiryStatus === 'expired'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : expiryStatus === 'expiring'
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {getCategoryIcon(doc.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {doc.name}
                          </h3>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                          <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            {getCategoryIcon(doc.category)}
                            {getCategoryLabel(doc.category)}
                          </span>
                          {doc.file_type && (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                              {doc.file_type}
                            </span>
                          )}
                          {doc.expiry_date && (
                            <span className={`inline-flex items-center gap-1 ${
                              expiryStatus === 'expired'
                                ? 'text-red-600 dark:text-red-400'
                                : expiryStatus === 'expiring'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              <Clock className="h-3.5 w-3.5" />
                              {expiryStatus === 'expired' ? 'Expired' : `Expires ${formatDate(doc.expiry_date)}`}
                            </span>
                          )}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="h-3.5 w-3.5 text-gray-400" />
                              {doc.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                              {doc.tags.length > 3 && (
                                <span className="text-gray-400 text-xs">+{doc.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(doc)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {showCreateModal ? 'Add Document' : 'Edit Document'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                  </div>
                )}

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Document name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category *
                      </label>
                      <div className="relative">
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                          {DOCUMENT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        File Type
                      </label>
                      <div className="relative">
                        <select
                          value={formData.file_type}
                          onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                          <option value="">Select type</option>
                          {FILE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Document Date
                      </label>
                      <input
                        type="date"
                        value={formData.document_date}
                        onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="tag1, tag2, tag3"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate tags with commas</p>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Link to Entity (optional)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Person
                        </label>
                        <div className="relative">
                          <select
                            value={formData.person_id}
                            onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                          >
                            <option value="">None</option>
                            {people.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.first_name} {p.last_name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Property
                        </label>
                        <div className="relative">
                          <select
                            value={formData.property_id}
                            onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                          >
                            <option value="">None</option>
                            {properties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Vehicle
                        </label>
                        <div className="relative">
                          <select
                            value={formData.vehicle_id}
                            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                          >
                            <option value="">None</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Insurance Policy
                        </label>
                        <div className="relative">
                          <select
                            value={formData.insurance_policy_id}
                            onChange={(e) => setFormData({ ...formData, insurance_policy_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                          >
                            <option value="">None</option>
                            {insurancePolicies.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.policy_name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={showCreateModal ? handleCreateDocument : handleUpdateDocument}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Saving...' : showCreateModal ? 'Add Document' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDeleteModal(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Delete Document
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete "{selectedDocument.name}"? This action cannot be undone.
                    </p>
                  </div>
                </div>

                {formError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteDocument}
                    disabled={submitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
