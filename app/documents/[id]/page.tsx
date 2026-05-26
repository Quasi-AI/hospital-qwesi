'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import SearchablePatientSelect from '../../components/SearchablePatientSelect';
import { 
  FileText, 
  Download, 
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  User,
  Tag,
  Shield,
  Calendar,
  Upload,
  History,
  CheckCircle,
  AlertCircle,
  Archive,
  X,
  Plus,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IDocumentVersion {
  versionNumber: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
}

interface IDocument {
  _id: string;
  documentNumber: string;
  title: string;
  description?: string;
  category: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  status: string;
  priority: string;
  expiryDate?: string;
  tags: string[];
  accessControl: {
    isPublic: boolean;
    allowedRoles: string[];
    allowedUsers: string[];
  };
  currentVersion: number;
  versions: IDocumentVersion[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [document, setDocument] = useState<IDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingNewVersion, setUploadingNewVersion] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState('');
  const [showVersionModal, setShowVersionModal] = useState(false);
  
  // Edit form state
  const [editData, setEditData] = useState<{
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    expiryDate: string;
    tags: string[];
    notes: string;
    patientId: string;
    patientName: string;
    accessControl: {
      isPublic: boolean;
      allowedRoles: string[];
      allowedUsers: string[];
    };
  }>({
    title: '',
    description: '',
    category: '',
    status: '',
    priority: '',
    expiryDate: '',
    tags: [],
    notes: '',
    patientId: '',
    patientName: '',
    accessControl: {
      isPublic: false,
      allowedRoles: [],
      allowedUsers: [],
    },
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchDocument();
  }, [resolvedParams.id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('documents.notFound') || 'Document not found');
          router.push('/documents');
          return;
        }
        throw new Error('Failed to fetch document');
      }
      const data = await response.json();
      setDocument(data);
      setEditData({
        title: data.title,
        description: data.description || '',
        category: data.category,
        status: data.status,
        priority: data.priority,
        expiryDate: data.expiryDate ? data.expiryDate.split('T')[0] : '',
        tags: data.tags || [],
        notes: data.notes || '',
        patientId: data.patientId || '',
        patientName: data.patientName || '',
        accessControl: data.accessControl || { isPublic: false, allowedRoles: [], allowedUsers: [] },
      });
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error(t('documents.fetchError') || 'Failed to fetch document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (version?: number) => {
    const url = version 
      ? `/api/documents/${resolvedParams.id}/download?version=${version}`
      : `/api/documents/${resolvedParams.id}/download`;
    window.open(url, '_blank');
  };

  const handleDelete = async () => {
    if (!confirm(t('documents.confirmDelete') || 'Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');
      
      toast.success(t('documents.deleteSuccess') || 'Document deleted successfully');
      router.push('/documents');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(t('documents.deleteError') || 'Failed to delete document');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editData.title);
      formData.append('description', editData.description);
      formData.append('category', editData.category);
      formData.append('status', editData.status);
      formData.append('priority', editData.priority);
      formData.append('expiryDate', editData.expiryDate);
      formData.append('tags', JSON.stringify(editData.tags));
      formData.append('notes', editData.notes);
      formData.append('patientId', editData.patientId);
      formData.append('patientName', editData.patientName);
      formData.append('accessControl', JSON.stringify(editData.accessControl));

      const response = await fetch(`/api/documents/${resolvedParams.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to update document');
      
      const updatedDoc = await response.json();
      setDocument(updatedDoc);
      setIsEditing(false);
      toast.success(t('documents.updateSuccess') || 'Document updated successfully');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error(t('documents.updateError') || 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadNewVersion = async () => {
    if (!newFile) {
      toast.error(t('documents.selectFileError') || 'Please select a file');
      return;
    }

    setUploadingNewVersion(true);
    try {
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('versionNotes', versionNotes);

      const response = await fetch(`/api/documents/${resolvedParams.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload new version');
      
      toast.success(t('documents.versionUploadSuccess') || 'New version uploaded successfully');
      setShowVersionModal(false);
      setNewFile(null);
      setVersionNotes('');
      fetchDocument();
    } catch (error) {
      console.error('Error uploading new version:', error);
      toast.error(t('documents.versionUploadError') || 'Failed to upload new version');
    } finally {
      setUploadingNewVersion(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !editData.tags.includes(tagInput.trim())) {
      setEditData({
        ...editData,
        tags: [...editData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditData({
      ...editData,
      tags: editData.tags.filter(t => t !== tag),
    });
  };

  const handlePatientSelectFromSearch = (patient: {
    _id: string;
    patientId: string;
    name: string;
    email: string;
    phone: string;
  } | null) => {
    if (patient) {
      setEditData((prev) => ({
        ...prev,
        patientId: patient._id,
        patientName: patient.name,
      }));
    } else {
      setEditData((prev) => ({
        ...prev,
        patientId: '',
        patientName: '',
      }));
    }
  };

  const handleRoleToggle = (role: string) => {
    const roles = editData.accessControl.allowedRoles;
    if (roles.includes(role)) {
      setEditData({
        ...editData,
        accessControl: {
          ...editData.accessControl,
          allowedRoles: roles.filter(r => r !== role),
        },
      });
    } else {
      setEditData({
        ...editData,
        accessControl: {
          ...editData.accessControl,
          allowedRoles: [...roles, role],
        },
      });
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-blue-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('documents.title') || 'Documents'}
          description=""
          dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('documents.title') || 'Documents'}
          description=""
          dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!document) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('documents.notFound') || 'Document Not Found'} dense>
          <div className="py-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('documents.notFound') || 'Document not found'}
            </h3>
            <Link
              href="/documents"
              className="mt-4 inline-flex h-9 items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t('documents.backToDocuments') || 'Back to Documents'}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={document.title} 
        description={document.documentNumber} dense>
        <div className="mx-auto max-w-5xl space-y-3">
          {/* Back Button and Actions */}
          <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/documents"
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t('documents.backToDocuments') || 'Back to Documents'}
            </Link>
            
            <div className="flex flex-wrap items-center gap-2">
              {!isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" />
                    {t('common.edit') || 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVersionModal(true)}
                    className="inline-flex h-9 items-center rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {t('documents.uploadNewVersion') || 'Upload New Version'}
                  </button>
                  {document.versions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleDownload()}
                      className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {t('common.download') || 'Download'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('common.delete') || 'Delete'}
                  </button>
                </>
              )}
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    {t('common.cancel') || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {t('common.save') || 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-3">
            {/* Main Content */}
            <div className="space-y-3 lg:col-span-2">
              {/* Document Details */}
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <FileText className="mr-1.5 h-4 w-4 text-blue-600" />
                  {t('documents.documentDetails') || 'Document Details'}
                </h3>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('documents.title') || 'Title'}
                      </label>
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('documents.descriptionLabel') || 'Description'}
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          {t('documents.category') || 'Category'}
                        </label>
                        <select
                          value={editData.category}
                          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                          className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="consent-form">{t('documents.categories.consent-form') || 'Consent Form'}</option>
                          <option value="legal-document">{t('documents.categories.legal-document') || 'Legal Document'}</option>
                          <option value="medical-certificate">{t('documents.categories.medical-certificate') || 'Medical Certificate'}</option>
                          <option value="insurance">{t('documents.categories.insurance') || 'Insurance'}</option>
                          <option value="identification">{t('documents.categories.identification') || 'Identification'}</option>
                          <option value="referral">{t('documents.categories.referral') || 'Referral'}</option>
                          <option value="discharge-summary">{t('documents.categories.discharge-summary') || 'Discharge Summary'}</option>
                          <option value="prescription">{t('documents.categories.prescription') || 'Prescription'}</option>
                          <option value="lab-report">{t('documents.categories.lab-report') || 'Lab Report'}</option>
                          <option value="imaging-report">{t('documents.categories.imaging-report') || 'Imaging Report'}</option>
                          <option value="other">{t('documents.categories.other') || 'Other'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          {t('documents.status') || 'Status'}
                        </label>
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="draft">{t('documents.statusLabels.draft') || 'Draft'}</option>
                          <option value="active">{t('documents.statusLabels.active') || 'Active'}</option>
                          <option value="archived">{t('documents.statusLabels.archived') || 'Archived'}</option>
                          <option value="expired">{t('documents.statusLabels.expired') || 'Expired'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          {t('documents.priority') || 'Priority'}
                        </label>
                        <select
                          value={editData.priority}
                          onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                          className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">{t('documents.priorityLabels.low') || 'Low'}</option>
                          <option value="normal">{t('documents.priorityLabels.normal') || 'Normal'}</option>
                          <option value="high">{t('documents.priorityLabels.high') || 'High'}</option>
                          <option value="urgent">{t('documents.priorityLabels.urgent') || 'Urgent'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          {t('documents.expiryDate') || 'Expiry Date'}
                        </label>
                        <input
                          type="date"
                          value={editData.expiryDate}
                          onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })}
                          className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('documents.notes') || 'Notes'}
                      </label>
                      <textarea
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    {/* Patient Selection in Edit Mode */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('documents.selectPatient') || 'Select Patient'}
                      </label>
                      <SearchablePatientSelect
                        value={editData.patientName || ''}
                        onChange={handlePatientSelectFromSearch}
                        syncPatient={
                          editData.patientId
                            ? {
                                _id: editData.patientId,
                                patientId: editData.patientId,
                                name: editData.patientName,
                                email: '',
                                phone: '',
                              }
                            : null
                        }
                        placeholder={t('documents.searchPatient') || 'Search for a patient...'}
                      />
                    </div>
                    {/* Tags in Edit Mode */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">
                        {t('documents.tags') || 'Tags'}
                      </label>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {editData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          placeholder={t('documents.addTagPlaceholder') || 'Add a tag'}
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="inline-flex h-9 items-center rounded-md bg-gray-100 px-3 text-gray-700 hover:bg-gray-200"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {/* Access Control in Edit Mode */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">
                        {t('documents.accessControl') || 'Access Control'}
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isPublicEdit"
                            checked={editData.accessControl.isPublic}
                            onChange={(e) => setEditData({
                              ...editData,
                              accessControl: { ...editData.accessControl, isPublic: e.target.checked }
                            })}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="isPublicEdit" className="ml-2 text-xs text-gray-700">
                            {t('documents.isPublic') || 'Public'}
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['admin', 'doctor', 'staff', 'patient'].map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => handleRoleToggle(role)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                editData.accessControl.allowedRoles.includes(role)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{document.title}</h4>
                        <p className="text-xs text-gray-500">{document.documentNumber}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {getStatusIcon(document.status)}
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(document.status)}`}>
                          {getStatusLabel(document.status)}
                        </span>
                      </div>
                    </div>

                    {document.description && (
                      <p className="text-sm text-gray-600">{document.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 border-t pt-3">
                      <div>
                        <span className="text-xs text-gray-500">{t('documents.category') || 'Category'}</span>
                        <p className="text-sm font-medium text-purple-600">{getCategoryLabel(document.category)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">{t('documents.priority') || 'Priority'}</span>
                        <p>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getPriorityColor(document.priority)}`}>
                            {t(`documents.priorityLabels.${document.priority}`) || document.priority}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">{t('documents.createdAt') || 'Created'}</span>
                        <p className="text-sm font-medium">{new Date(document.createdAt).toLocaleDateString()}</p>
                      </div>
                      {document.expiryDate && (
                        <div>
                          <span className="text-xs text-gray-500">{t('documents.expiryDate') || 'Expires'}</span>
                          <p className="text-sm font-medium">{new Date(document.expiryDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {document.notes && (
                      <div className="border-t pt-3">
                        <span className="text-xs text-gray-500">{t('documents.notes') || 'Notes'}</span>
                        <p className="mt-1 text-sm text-gray-700">{document.notes}</p>
                      </div>
                    )}

                    {document.tags && document.tags.length > 0 && (
                      <div className="border-t pt-3">
                        <span className="mb-1.5 flex items-center text-xs text-gray-500">
                          <Tag className="mr-1 h-3.5 w-3.5" />
                          {t('documents.tags') || 'Tags'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {document.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Version History */}
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <History className="mr-1.5 h-4 w-4 text-blue-600" />
                  {t('documents.versionHistory') || 'Version History'}
                </h3>
                
                {document.versions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">
                    <FileText className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2">{t('documents.noVersions') || 'No file versions available'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {document.versions
                      .sort((a, b) => b.versionNumber - a.versionNumber)
                      .map((version) => (
                        <div
                          key={version.versionNumber}
                          className={`flex items-center justify-between rounded-md border p-3 ${
                            version.versionNumber === document.currentVersion
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                              version.versionNumber === document.currentVersion
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              v{version.versionNumber}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">{version.originalName}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(version.size)} • {new Date(version.uploadedAt).toLocaleString()}
                              </p>
                              {version.notes && (
                                <p className="mt-1 text-xs text-gray-600">{version.notes}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-400">
                                {t('documents.uploadedBy') || 'Uploaded by'}: {version.uploadedBy}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownload(version.versionNumber)}
                            className="shrink-0 rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                            title={t('common.download') || 'Download'}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-3">
              {/* Patient Info */}
              {document.patientName && (
                <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                    <User className="mr-1.5 h-4 w-4 text-blue-600" />
                    {t('documents.patientInfo') || 'Patient'}
                  </h3>
                  <p className="text-sm font-medium text-gray-900">{document.patientName}</p>
                </div>
              )}

              {/* Access Control Info */}
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                  <Shield className="mr-1.5 h-4 w-4 text-blue-600" />
                  {t('documents.accessControl') || 'Access Control'}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={`mr-2 h-2.5 w-2.5 rounded-full ${
                      document.accessControl?.isPublic ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-xs text-gray-600">
                      {document.accessControl?.isPublic 
                        ? (t('documents.publicAccess') || 'Public Access') 
                        : (t('documents.restrictedAccess') || 'Restricted Access')}
                    </span>
                  </div>
                  {document.accessControl?.allowedRoles && document.accessControl.allowedRoles.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">{t('documents.allowedRoles') || 'Allowed Roles'}:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {document.accessControl.allowedRoles.map((role) => (
                          <span
                            key={role}
                            className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                  <Calendar className="mr-1.5 h-4 w-4 text-blue-600" />
                  {t('documents.metadata') || 'Metadata'}
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">{t('documents.createdBy') || 'Created By'}</span>
                    <span className="text-right text-gray-900">{document.createdBy}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">{t('documents.createdAt') || 'Created'}</span>
                    <span className="text-gray-900">{new Date(document.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">{t('documents.updatedAt') || 'Updated'}</span>
                    <span className="text-gray-900">{new Date(document.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">{t('documents.currentVersion') || 'Current Version'}</span>
                    <span className="text-gray-900">v{document.currentVersion}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload New Version Modal */}
        {showVersionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('documents.uploadNewVersion') || 'Upload New Version'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('documents.selectFile') || 'Select File'}
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-0.5 file:text-xs"
                  />
                  {newFile && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      {newFile.name} ({formatFileSize(newFile.size)})
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('documents.versionNotes') || 'Version Notes'}
                  </label>
                  <textarea
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={t('documents.versionNotesPlaceholder') || 'Describe what changed in this version...'}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowVersionModal(false)}
                    className="h-9 rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200"
                  >
                    {t('common.cancel') || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadNewVersion}
                    disabled={uploadingNewVersion || !newFile}
                    className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadingNewVersion ? (
                      <span className="flex items-center">
                        <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white" />
                        {t('common.uploading') || 'Uploading...'}
                      </span>
                    ) : (
                      t('documents.upload') || 'Upload'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
