'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Radio, User, Calendar, FileText, AlertTriangle, CheckCircle, Upload, Printer, Edit, X, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import AdvancedDicomViewer to avoid SSR issues
const AdvancedDicomViewer = dynamic(() => import('@/app/components/advanced-dicom-viewer'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
});

interface RadiologyImage {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

interface RadiologyStudy {
  _id: string; studyNumber: string; patientId: string; patientName: string; patientAge?: number; patientGender?: string;
  referringDoctorName?: string; radiologistName?: string; studyType: string; bodyPart: string; studyDescription: string;
  clinicalHistory?: string; indication?: string; priority: string; status: string; scheduledDate?: string; performedDate?: string;
  images: RadiologyImage[];
  findings?: string; impression?: string; recommendations?: string; reportedBy?: string; reportedAt?: string;
  verifiedBy?: string; verifiedAt?: string; isCritical: boolean; criticalFindings?: string; comparisonNotes?: string;
  technicianName?: string; technicianNotes?: string; contrastUsed: boolean; contrastDetails?: string;
  radiationDose?: string; equipmentUsed?: string; notes?: string; createdAt: string;
}

export default function RadiologyStudyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, translationsLoaded } = useTranslations();
  const [study, setStudy] = useState<RadiologyStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<RadiologyImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchStudy(); }, [resolvedParams.id]);

  const fetchStudy = async () => {
    try {
      const response = await fetch(`/api/radiology/${resolvedParams.id}`);
      if (response.ok) setStudy(await response.json());
    } catch (error) { console.error('Error fetching study:', error); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    try {
      const response = await fetch(`/api/radiology/${resolvedParams.id}/verify`, { method: 'POST' });
      if (response.ok) fetchStudy();
    } catch (error) { console.error('Error verifying report:', error); }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/radiology/${resolvedParams.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, performedDate: newStatus === 'completed' ? new Date() : undefined }),
      });
      if (response.ok) fetchStudy();
    } catch (error) { console.error('Error updating status:', error); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }

      const response = await fetch(`/api/radiology/${resolvedParams.id}/images`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        fetchStudy();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to upload images');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (filename: string) => {
    if (!confirm(t('radiology.confirmDeleteImage'))) return;
    try {
      const response = await fetch(`/api/radiology/${resolvedParams.id}/images/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchStudy();
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'ordered': 'bg-gray-100 text-gray-800', 'scheduled': 'bg-blue-100 text-blue-800', 'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-purple-100 text-purple-800', 'reported': 'bg-green-100 text-green-800', 'verified': 'bg-emerald-100 text-emerald-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = { 'routine': 'bg-green-100 text-green-800', 'urgent': 'bg-orange-100 text-orange-800', 'stat': 'bg-red-100 text-red-800' };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStudyTypeLabel = (type: string) => {
    const labels: Record<string, string> = { 'x-ray': 'X-Ray', 'ct-scan': 'CT Scan', 'mri': 'MRI', 'ultrasound': 'Ultrasound', 'mammography': 'Mammography', 'fluoroscopy': 'Fluoroscopy', 'pet-scan': 'PET Scan', 'dexa-scan': 'DEXA Scan', 'other': 'Other' };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!translationsLoaded || loading) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  if (!study) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="text-center py-8"><p className="text-sm text-gray-500">{t('radiology.studyNotFound')}</p><Link href="/radiology" className="text-sm text-blue-600 hover:underline">{t('common.back')}</Link></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('radiology.studyDetails')} description={study.studyNumber} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <Link href="/radiology" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 w-fit">
              <ArrowLeft className="h-4 w-4 shrink-0" /><span>{t('common.back')}</span>
            </Link>
            <div className="flex flex-wrap gap-2">
              {study.status === 'ordered' && (
                <button onClick={() => handleStatusUpdate('in-progress')} className="h-9 px-3 text-sm font-medium bg-yellow-600 text-white rounded-md hover:bg-yellow-700">{t('radiology.startStudy')}</button>
              )}
              {study.status === 'in-progress' && (
                <button onClick={() => handleStatusUpdate('completed')} className="h-9 px-3 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700">{t('radiology.markCompleted')}</button>
              )}
              {study.status === 'completed' && (
                <Link href={`/radiology/${study._id}/report`} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700">
                  <Edit className="h-3.5 w-3.5" /><span>{t('radiology.addReport')}</span>
                </Link>
              )}
              {study.status === 'reported' && (
                <button onClick={handleVerify} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" /><span>{t('radiology.verifyReport')}</span>
                </button>
              )}
              {['reported', 'verified'].includes(study.status) && (
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  <Printer className="h-3.5 w-3.5" /><span>{t('common.print')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Critical Alert */}
          {study.isCritical && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0"><h4 className="text-sm font-semibold text-red-800">{t('radiology.criticalFindingsAlert')}</h4><p className="text-sm text-red-700">{study.criticalFindings}</p></div>
            </div>
          )}

          {/* Study Info Card */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><Radio className="h-5 w-5 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{study.studyNumber}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(study.status)}`}>{t(`radiology.statusLabels.${study.status}`)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(study.priority)}`}>{t(`radiology.priorityLabels.${study.priority}`)}</span>
                </div>
                <p className="text-sm text-gray-500">{getStudyTypeLabel(study.studyType)} - {study.bodyPart}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-sm">
              <div className="flex items-center gap-1.5 min-w-0"><User className="h-3.5 w-3.5 text-gray-400 shrink-0" /><span className="text-gray-500 shrink-0">{t('radiology.patient')}:</span><span className="font-medium truncate">{study.patientName}</span></div>
              {study.patientAge && <div><span className="text-gray-500">{t('radiology.age')}:</span> <span className="font-medium">{study.patientAge} years</span></div>}
              {study.patientGender && <div><span className="text-gray-500">{t('radiology.gender')}:</span> <span className="font-medium">{study.patientGender}</span></div>}
              {study.referringDoctorName && <div className="md:col-span-2"><span className="text-gray-500">{t('radiology.referringDoctor')}:</span> <span className="font-medium">{study.referringDoctorName}</span></div>}
              <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" /><span className="text-gray-500">{t('radiology.ordered')}:</span><span className="font-medium">{formatDate(study.createdAt)}</span></div>
              {study.performedDate && <div><span className="text-gray-500">{t('radiology.performed')}:</span> <span className="font-medium">{formatDate(study.performedDate)}</span></div>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Clinical Information */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('radiology.clinicalInfo')}</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-xs text-gray-500">{t('radiology.studyDescription')}</p><p className="font-medium">{study.studyDescription}</p></div>
                {study.indication && <div><p className="text-xs text-gray-500">{t('radiology.indication')}</p><p>{study.indication}</p></div>}
                {study.clinicalHistory && <div><p className="text-xs text-gray-500">{t('radiology.clinicalHistory')}</p><p>{study.clinicalHistory}</p></div>}
                {study.contrastUsed && <div><p className="text-xs text-gray-500">{t('radiology.contrastUsed')}</p><p>{study.contrastDetails || 'Yes'}</p></div>}
                {study.notes && <div><p className="text-xs text-gray-500">{t('radiology.notes')}</p><p>{study.notes}</p></div>}
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('radiology.technicalDetails')}</h3>
              <div className="space-y-2 text-sm">
                {study.technicianName && <div><p className="text-xs text-gray-500">{t('radiology.technician')}</p><p>{study.technicianName}</p></div>}
                {study.technicianNotes && <div><p className="text-xs text-gray-500">{t('radiology.technicianNotes')}</p><p>{study.technicianNotes}</p></div>}
                {study.equipmentUsed && <div><p className="text-xs text-gray-500">{t('radiology.equipment')}</p><p>{study.equipmentUsed}</p></div>}
                {study.radiationDose && <div><p className="text-xs text-gray-500">{t('radiology.radiationDose')}</p><p>{study.radiationDose}</p></div>}
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
              <h3 className="text-base font-semibold">{t('radiology.images')} {study.images?.length > 0 && `(${study.images.length})`}</h3>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*,.dcm,.dicom"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{uploading ? t('common.uploading') : t('radiology.uploadImages')}</span>
                </button>
              </div>
            </div>
            {study.images && study.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {study.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-100 rounded-md p-1.5 cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all"
                    onClick={() => setSelectedImage(img)}
                  >
                    {img.mimeType?.startsWith('image/') ? (
                      <div className="h-24 sm:h-28 bg-gray-100 rounded overflow-hidden mb-1">
                        <img src={img.url} alt={img.originalName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-24 sm:h-28 bg-gray-100 rounded flex items-center justify-center mb-1">
                        <FileText className="h-7 w-7 text-gray-400" />
                      </div>
                    )}
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate text-center">{img.originalName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-md">
                <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t('radiology.noImages')}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  {t('radiology.clickToUpload')}
                </button>
              </div>
            )}
          </div>

          {/* Image Preview Modal */}
          {selectedImage && (
            <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
              <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <h3 className="text-sm font-semibold truncate pr-2">{selectedImage.originalName}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDeleteImage(selectedImage.filename)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                      title={t('common.delete')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button onClick={() => setSelectedImage(null)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  {selectedImage.originalName?.toLowerCase().endsWith('.dcm') || selectedImage.originalName?.toLowerCase().endsWith('.dicom') ? (
                    <div className="h-[65vh] sm:h-[70vh]">
                      <AdvancedDicomViewer
                        sopInstanceUID={selectedImage.filename.replace(/\.(dcm|dicom)$/i, '')}
                        className="w-full h-full"
                        showToolbar={true}
                        showOverlay={true}
                        onError={(error) => console.error('DICOM viewer error:', error)}
                      />
                    </div>
                  ) : selectedImage.mimeType?.startsWith('image/') ? (
                    <img src={selectedImage.url} alt={selectedImage.originalName} className="max-w-full max-h-[65vh] sm:max-h-[70vh] mx-auto" />
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-500">{t('radiology.previewNotAvailable')}</p>
                      <a href={selectedImage.url} download={selectedImage.originalName} className="mt-3 inline-block h-9 px-4 text-sm leading-9 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        {t('common.download')}
                      </a>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border-t text-xs text-gray-500">
                  <p>{t('radiology.uploadedAt')}: {new Date(selectedImage.uploadedAt).toLocaleString()}</p>
                  <p>{t('radiology.fileSize')}: {(selectedImage.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </div>
          )}

          {/* Report Section */}
          {['reported', 'verified'].includes(study.status) && (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 radiology-report-document">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">{t('radiology.report')}</h3>
                {study.status === 'verified' && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle className="h-3.5 w-3.5" />{t('radiology.verified')}</span>}
              </div>
              <div className="space-y-3 text-sm">
                {study.findings && <div><h4 className="text-xs font-medium text-gray-700 mb-0.5">{t('radiology.findings')}</h4><p className="whitespace-pre-wrap">{study.findings}</p></div>}
                {study.impression && <div><h4 className="text-xs font-medium text-gray-700 mb-0.5">{t('radiology.impression')}</h4><p className="whitespace-pre-wrap">{study.impression}</p></div>}
                {study.recommendations && <div><h4 className="text-xs font-medium text-gray-700 mb-0.5">{t('radiology.recommendations')}</h4><p className="whitespace-pre-wrap">{study.recommendations}</p></div>}
                {study.comparisonNotes && <div><h4 className="text-xs font-medium text-gray-700 mb-0.5">{t('radiology.comparisonNotes')}</h4><p className="whitespace-pre-wrap">{study.comparisonNotes}</p></div>}
                <div className="pt-3 border-t text-xs text-gray-500">
                  {study.reportedBy && <p>{t('radiology.reportedBy')}: {study.reportedBy} {study.reportedAt && `on ${formatDate(study.reportedAt)}`}</p>}
                  {study.verifiedBy && <p>{t('radiology.verifiedBy')}: {study.verifiedBy} {study.verifiedAt && `on ${formatDate(study.verifiedAt)}`}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
