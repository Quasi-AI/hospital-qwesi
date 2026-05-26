'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  Download,
  Calendar,
  User,
  FileCheck,
  FileWarning,
  Archive,
  File
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IDocument {
  _id: string;
  documentNumber: string;
  title: string;
  description?: string;
  category: string;
  patientId?: string;
  patientName?: string;
  doctorName?: string;
  status: string;
  priority: string;
  expiryDate?: string;
  tags: string[];
  currentVersion: number;
  versions: Array<{
    versionNumber: number;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error(t('documents.fetchError') || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('documents.confirmDelete') || 'Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');
      
      toast.success(t('documents.deleteSuccess') || 'Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(t('documents.deleteError') || 'Failed to delete document');
    }
  };

  const handleDownload = async (doc: IDocument) => {
    try {
      window.open(`/api/documents/${doc._id}/download`, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error(t('documents.downloadError') || 'Failed to download document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryLabel = (category: string) => {
    return t(`documents.categories.${category}`) || category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusLabel = (status: string) => {
    return t(`documents.statusLabels.${status}`) || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-4 w-4 text-gray-400" />;
    if (mimeType.startsWith('image/')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-4 w-4 text-blue-600" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('documents.title') || 'Document Management'}
          description={t('documents.description') || 'Manage documents, consent forms, and legal files'}
          dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('documents.title') || 'Document Management'} 
        description={t('documents.description') || 'Manage documents, consent forms, and legal files'} dense>
        <div className="space-y-3">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{t('documents.totalDocuments') || 'Total Documents'}</p>
                <p className="text-xl font-bold text-gray-900">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{t('documents.activeDocuments') || 'Active'}</p>
                <p className="text-xl font-bold text-green-600">
                  {documents.filter(d => d.status === 'active').length}
                </p>
              </div>
              <FileCheck className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{t('documents.expiringSoon') || 'Expiring Soon'}</p>
                <p className="text-xl font-bold text-orange-600">
                  {documents.filter(d => {
                    if (!d.expiryDate) return false;
                    const expiry = new Date(d.expiryDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 30;
                  }).length}
                </p>
              </div>
              <FileWarning className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{t('documents.archived') || 'Archived'}</p>
                <p className="text-xl font-bold text-gray-600">
                  {documents.filter(d => d.status === 'archived').length}
                </p>
              </div>
              <Archive className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative w-full flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('documents.searchPlaceholder') || 'Search documents...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('documents.allCategories') || 'All Categories'}</option>
                <option value="consent-form">{t('documents.categories.consent-form') || 'Consent Forms'}</option>
                <option value="legal-document">{t('documents.categories.legal-document') || 'Legal Documents'}</option>
                <option value="medical-certificate">{t('documents.categories.medical-certificate') || 'Medical Certificates'}</option>
                <option value="insurance">{t('documents.categories.insurance') || 'Insurance'}</option>
                <option value="identification">{t('documents.categories.identification') || 'Identification'}</option>
                <option value="referral">{t('documents.categories.referral') || 'Referrals'}</option>
                <option value="discharge-summary">{t('documents.categories.discharge-summary') || 'Discharge Summary'}</option>
                <option value="prescription">{t('documents.categories.prescription') || 'Prescriptions'}</option>
                <option value="lab-report">{t('documents.categories.lab-report') || 'Lab Reports'}</option>
                <option value="imaging-report">{t('documents.categories.imaging-report') || 'Imaging Reports'}</option>
                <option value="other">{t('documents.categories.other') || 'Other'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('documents.allStatuses') || 'All Statuses'}</option>
                <option value="draft">{t('documents.statusLabels.draft') || 'Draft'}</option>
                <option value="active">{t('documents.statusLabels.active') || 'Active'}</option>
                <option value="archived">{t('documents.statusLabels.archived') || 'Archived'}</option>
                <option value="expired">{t('documents.statusLabels.expired') || 'Expired'}</option>
              </select>

              <Link
                href="/documents/new"
                className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t('documents.addNew') || 'Add Document'}
              </Link>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('documents.noDocuments') || 'No documents found'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {t('documents.noDocumentsDesc') || 'Get started by uploading your first document.'}
              </p>
              <div className="mt-4">
                <Link
                  href="/documents/new"
                  className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('documents.addNew') || 'Add Document'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('documents.document') || 'Document'}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('documents.category') || 'Category'}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('documents.patient') || 'Patient'}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('documents.status') || 'Status'}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('documents.version') || 'Version'}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('documents.date') || 'Date'}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('documents.actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100">
                            {getFileIcon(doc.versions[doc.versions.length - 1]?.mimeType)}
                          </div>
                          <div className="ml-3 min-w-0">
                            <div className="truncate text-sm font-medium text-gray-900">{doc.title}</div>
                            <div className="truncate text-xs text-gray-500">{doc.documentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="inline-flex rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                          {getCategoryLabel(doc.category)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {doc.patientName ? (
                          <div className="flex items-center">
                            <User className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-900">{doc.patientName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="text-sm text-gray-900">v{doc.currentVersion}</span>
                        {doc.versions.length > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({formatFileSize(doc.versions[doc.versions.length - 1]?.size || 0)})
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="mr-1 h-3.5 w-3.5" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            href={`/documents/${doc._id}`}
                            className="rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-900"
                            title={t('common.view') || 'View'}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {doc.versions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              className="rounded-md p-1.5 text-green-600 transition-colors hover:bg-green-50 hover:text-green-900"
                              title={t('common.download') || 'Download'}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(doc._id)}
                            className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-900"
                            title={t('common.delete') || 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
