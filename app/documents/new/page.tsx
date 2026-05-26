'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import SearchablePatientSelect from '../../components/SearchablePatientSelect';
import { 
  FileText, 
  Upload, 
  X, 
  ArrowLeft,
  Plus,
  Tag,
  User,
  Shield,
  FileUp,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Patient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
}

export default function NewDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewDocumentPageContent />
    </Suspense>
  );
}

function NewDocumentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const { t, translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    patientId: '',
    patientName: '',
    status: 'active',
    priority: 'normal',
    expiryDate: '',
    tags: [] as string[],
    notes: '',
    accessControl: {
      isPublic: false,
      allowedRoles: ['admin', 'doctor', 'staff'] as string[],
      allowedUsers: [] as string[],
    },
  });
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!patientIdFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/patients/${patientIdFromUrl}`);
        if (!res.ok || cancelled) return;
        const p = await res.json();
        if (cancelled) return;
        const mapped: Patient = {
          _id: p._id,
          patientId: p.patientId || p._id,
          name: p.name,
          email: p.email || '',
          phone: p.phone || '',
        };
        setSelectedPatient(mapped);
        setFormData((prev) => ({
          ...prev,
          patientId: mapped._id,
          patientName: mapped.name,
        }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      setFormData((prev) => ({
        ...prev,
        patientId: patient._id,
        patientName: patient.name,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        patientId: '',
        patientName: '',
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const handleRoleToggle = (role: string) => {
    const roles = formData.accessControl.allowedRoles;
    if (roles.includes(role)) {
      setFormData({
        ...formData,
        accessControl: {
          ...formData.accessControl,
          allowedRoles: roles.filter(r => r !== role),
        },
      });
    } else {
      setFormData({
        ...formData,
        accessControl: {
          ...formData.accessControl,
          allowedRoles: [...roles, role],
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error(t('documents.validation.titleRequired') || 'Title is required');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('status', formData.status);
      submitData.append('priority', formData.priority);
      submitData.append('notes', formData.notes);
      submitData.append('tags', JSON.stringify(formData.tags));
      submitData.append('accessControl', JSON.stringify(formData.accessControl));
      
      if (formData.patientId) {
        submitData.append('patientId', formData.patientId);
        submitData.append('patientName', formData.patientName);
      }
      
      if (formData.expiryDate) {
        submitData.append('expiryDate', formData.expiryDate);
      }
      
      if (file) {
        submitData.append('file', file);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create document');
      }

      toast.success(t('documents.createSuccess') || 'Document created successfully');
      router.push('/documents');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('documents.newDocument') || 'New Document'}
          description={t('documents.newDocumentDesc') || 'Upload and create a new document'}
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
        title={t('documents.newDocument') || 'New Document'} 
        description={t('documents.newDocumentDesc') || 'Upload and create a new document'} dense>
        <div className="mx-auto max-w-4xl space-y-3">
          {/* Back Button */}
          <Link
            href="/documents"
            className="mb-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {t('documents.backToDocuments') || 'Back to Documents'}
          </Link>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* File Upload Section */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <FileUp className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('documents.fileUpload') || 'File Upload'}
              </h3>
              
              <div
                className={`relative rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : file 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                />
                
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-6 w-6 text-green-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="rounded-full p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-1.5 text-xs text-gray-600">
                      {t('documents.dragAndDrop') || 'Drag and drop a file here, or click to browse'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t('documents.supportedFormats') || 'PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF'}
                    </p>
                  </label>
                )}
              </div>
            </div>

            {/* Document Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <FileText className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('documents.documentInfo') || 'Document Information'}
              </h3>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('documents.title') || 'Title'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder={t('documents.titlePlaceholder') || 'Enter document title'}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('documents.descriptionLabel') || 'Description'}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={t('documents.descriptionPlaceholder') || 'Enter document description'}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('documents.category') || 'Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
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
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">{t('documents.statusLabels.draft') || 'Draft'}</option>
                    <option value="active">{t('documents.statusLabels.active') || 'Active'}</option>
                    <option value="archived">{t('documents.statusLabels.archived') || 'Archived'}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('documents.priority') || 'Priority'}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Patient Association */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <User className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('documents.patientAssociation') || 'Patient Association'}
              </h3>
              
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('documents.selectPatient') || 'Select Patient'} ({t('common.optional') || 'Optional'})
                </label>
                <SearchablePatientSelect
                  value={selectedPatient?.name || ''}
                  onChange={handlePatientSelect}
                  syncPatient={selectedPatient}
                  placeholder={t('documents.searchPatient') || 'Search for a patient...'}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Tag className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('documents.tags') || 'Tags'}
              </h3>
              
              <div className="mb-2 flex flex-wrap gap-1.5">
                {formData.tags.map((tag) => (
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
                  placeholder={t('documents.addTagPlaceholder') || 'Add a tag and press Enter'}
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

            {/* Access Control */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Shield className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('documents.accessControl') || 'Access Control'}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.accessControl.isPublic}
                    onChange={(e) => setFormData({
                      ...formData,
                      accessControl: { ...formData.accessControl, isPublic: e.target.checked }
                    })}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-xs text-gray-700">
                    {t('documents.isPublic') || 'Make this document publicly accessible'}
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    {t('documents.allowedRoles') || 'Allowed Roles'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['admin', 'doctor', 'staff', 'patient'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleToggle(role)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          formData.accessControl.allowedRoles.includes(role)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {t(`documents.roles.${role}`) || role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                {t('documents.notes') || 'Notes'}
              </h3>
              
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder={t('documents.notesPlaceholder') || 'Add any additional notes...'}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2">
              <Link
                href="/documents"
                className="inline-flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel') || 'Cancel'}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white" />
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    {t('documents.createDocument') || 'Create Document'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
