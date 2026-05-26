'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  X,
  Link as LinkIcon,
  User,
  Calendar,
  MonitorPlay,
  FileText,
  Printer,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import AdvancedDicomViewer from '../../../components/advanced-dicom-viewer';
import { useTranslations } from '../../../hooks/useTranslations';

interface IncomingImage {
  _id: string;
  imageNumber: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  receivedAt: string;
  patientId: string;
  patientName: string;
  patientBirthDate: string;
  patientSex: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  accessionNumber: string;
  modality: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  seriesDescription: string;
  seriesNumber: number;
  instanceNumber: number;
  bodyPartExamined: string;
  rows: number;
  columns: number;
  bitsAllocated: number;
  photometricInterpretation: string;
  windowCenter: number;
  windowWidth: number;
  filePath: string;
  fileSize: number;
  matchedStudyId: string;
  matchedStudyNumber: string;
  matchStatus: string;
  matchConfidence: number;
  possibleMatches: Array<{
    studyId: string;
    studyNumber: string;
    patientName: string;
    studyType: string;
    confidence: number;
  }>;
  status: string;
  reviewedBy: string;
  reviewedAt: string;
  appliedAt: string;
  rejectionReason: string;
  notes: string;
  requiresAttention: boolean;
}

interface MatchedStudy {
  _id: string;
  studyNumber: string;
  studyType: string;
  scheduledDate: string;
  status: string;
  patientId: {
    firstName: string;
    lastName: string;
    patientId: string;
  };
  referringDoctorId: {
    name: string;
  };
}

interface RelatedImage {
  _id: string;
  imageNumber: string;
  seriesInstanceUID: string;
  instanceNumber: number;
  modality: string;
  status: string;
}

const MODALITY_NAMES: Record<string, string> = {
  CT: 'CT Scan',
  MR: 'MRI',
  US: 'Ultrasound',
  DX: 'Digital X-Ray',
  CR: 'Computed Radiography',
  MG: 'Mammography',
  XA: 'X-Ray Angiography',
  NM: 'Nuclear Medicine',
  PT: 'PET Scan',
  RF: 'Fluoroscopy',
};

export default function ImageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [image, setImage] = useState<IncomingImage | null>(null);
  const [matchedStudy, setMatchedStudy] = useState<MatchedStudy | null>(null);
  const [relatedImages, setRelatedImages] = useState<RelatedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [searchStudies, setSearchStudies] = useState<MatchedStudy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchImage();
  }, [id]);

  const fetchImage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/imaging/incoming/${id}`);
      if (response.ok) {
        const data = await response.json();
        setImage(data.image);
        setMatchedStudy(data.matchedStudy);
        setRelatedImages(data.relatedImages || []);
      }
    } catch (error) {
      console.error('Error fetching image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this image and apply to the matched study?')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/imaging/incoming/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', applyToStudy: true }),
      });
      if (response.ok) {
        fetchImage();
      }
    } catch (error) {
      console.error('Error approving image:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (reason === null) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/imaging/incoming/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes: reason }),
      });
      if (response.ok) {
        router.push('/imaging/incoming');
      }
    } catch (error) {
      console.error('Error rejecting image:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualMatch = async (studyId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/imaging/incoming/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'match', studyId }),
      });
      if (response.ok) {
        setShowMatchModal(false);
        fetchImage();
      }
    } catch (error) {
      console.error('Error matching image:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const searchForStudies = async () => {
    try {
      const response = await fetch(`/api/radiology?search=${encodeURIComponent(searchTerm)}&status=ordered,scheduled,in-progress`);
      if (response.ok) {
        const data = await response.json();
        setSearchStudies(data.studies || []);
      }
    } catch (error) {
      console.error('Error searching studies:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      applied: 'bg-green-100 text-green-800',
    };
    return styles[status] || styles.pending;
  };

  const getMatchBadge = (status: string) => {
    const styles: Record<string, string> = {
      matched: 'bg-green-100 text-green-800',
      unmatched: 'bg-red-100 text-red-800',
      multiple: 'bg-yellow-100 text-yellow-800',
      manual: 'bg-blue-100 text-blue-800',
    };
    return styles[status] || styles.unmatched;
  };

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute requiredRoles={['admin', 'staff']}>
        <SidebarLayout dense>
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!image) {
    return (
      <ProtectedRoute requiredRoles={['admin', 'staff']}>
        <SidebarLayout dense>
          <div className="p-6 text-center">
            <p className="text-gray-500">Image not found</p>
            <Link href="/imaging/incoming" className="text-blue-600 hover:underline mt-2 inline-block">
              Back to Incoming Images
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff']}>
      <SidebarLayout dense>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/imaging/incoming"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="h-6 w-6" />
                  {image.imageNumber}
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(image.status)}`}>
                    {image.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMatchBadge(image.matchStatus)}`}>
                    {image.matchStatus}
                  </span>
                  {image.matchConfidence > 0 && (
                    <span className="text-gray-400">({image.matchConfidence}% confidence)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              {image.status === 'pending' && (
                <>
                  {image.matchStatus === 'unmatched' && (
                    <button
                      onClick={() => setShowMatchModal(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Match to Study
                    </button>
                  )}
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading || image.matchStatus === 'unmatched'}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Approve & Apply
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Attention Warning */}
          {image.requiresAttention && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Requires Attention</p>
                <p className="text-sm text-yellow-700">
                  {image.matchStatus === 'unmatched' 
                    ? 'This image could not be automatically matched to a radiology study.' 
                    : 'Multiple possible matches found. Please review and select the correct study.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DICOM Viewer */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-[600px]">
                  <AdvancedDicomViewer
                    imageId={image._id}
                    className="w-full h-full"
                    showToolbar={true}
                    showOverlay={true}
                    initialTool="WindowLevel"
                  />
                </div>
              </div>

              {/* Related Images in Series */}
              {relatedImages.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Related Images in Study</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedImages.map((relImg) => (
                      <Link
                        key={relImg._id}
                        href={`/imaging/incoming/${relImg._id}`}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          relImg._id === image._id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        #{relImg.instanceNumber || '-'}
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${getStatusBadge(relImg.status)}`}>
                          {relImg.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details Sidebar */}
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  Patient Information
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="text-gray-900 font-medium">{image.patientName || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Patient ID</dt>
                    <dd className="text-gray-900">{image.patientId || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Birth Date</dt>
                    <dd className="text-gray-900">{formatDate(image.patientBirthDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Sex</dt>
                    <dd className="text-gray-900">{image.patientSex || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Study Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" />
                  Study Information
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Modality</dt>
                    <dd className="text-gray-900">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {image.modality} - {MODALITY_NAMES[image.modality] || image.modality}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Study Date</dt>
                    <dd className="text-gray-900">{formatDate(image.studyDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Description</dt>
                    <dd className="text-gray-900 text-right max-w-[150px] truncate">{image.studyDescription || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Body Part</dt>
                    <dd className="text-gray-900">{image.bodyPartExamined || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Accession #</dt>
                    <dd className="text-gray-900 font-mono text-xs">{image.accessionNumber || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Series</dt>
                    <dd className="text-gray-900">#{image.seriesNumber || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Instance</dt>
                    <dd className="text-gray-900">#{image.instanceNumber || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Image Technical Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <ImageIcon className="h-4 w-4" />
                  Technical Details
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Dimensions</dt>
                    <dd className="text-gray-900">{image.columns} x {image.rows}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Bits Allocated</dt>
                    <dd className="text-gray-900">{image.bitsAllocated || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Photometric</dt>
                    <dd className="text-gray-900 text-xs">{image.photometricInterpretation || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Window</dt>
                    <dd className="text-gray-900">W:{image.windowWidth || '-'} L:{image.windowCenter || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">File Size</dt>
                    <dd className="text-gray-900">{formatFileSize(image.fileSize)}</dd>
                  </div>
                </dl>
              </div>

              {/* Device Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <MonitorPlay className="h-4 w-4" />
                  Source Device
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Device</dt>
                    <dd className="text-gray-900">{image.deviceName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Code</dt>
                    <dd className="text-gray-900 font-mono">{image.deviceCode}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Received</dt>
                    <dd className="text-gray-900">{formatDateTime(image.receivedAt)}</dd>
                  </div>
                </dl>
              </div>

              {/* Matched Study */}
              {matchedStudy && (
                <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                  <h3 className="font-medium text-green-800 flex items-center gap-2 mb-3">
                    <LinkIcon className="h-4 w-4" />
                    Matched Study
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-green-600">Study #</dt>
                      <dd className="text-green-900 font-medium">
                        <Link href={`/radiology/${matchedStudy._id}`} className="hover:underline">
                          {matchedStudy.studyNumber}
                        </Link>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-green-600">Patient</dt>
                      <dd className="text-green-900">
                        {matchedStudy.patientId?.firstName} {matchedStudy.patientId?.lastName}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-green-600">Type</dt>
                      <dd className="text-green-900">{matchedStudy.studyType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-green-600">Referring</dt>
                      <dd className="text-green-900">{matchedStudy.referringDoctorId?.name || '-'}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Possible Matches */}
              {image.possibleMatches && image.possibleMatches.length > 1 && (
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                  <h3 className="font-medium text-yellow-800 mb-3">Possible Matches</h3>
                  <div className="space-y-2">
                    {image.possibleMatches.map((match) => (
                      <div key={match.studyId} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-yellow-900">{match.studyNumber}</p>
                          <p className="text-yellow-600 text-xs">{match.patientName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-700">{match.confidence}%</span>
                          <button
                            onClick={() => handleManualMatch(match.studyId)}
                            className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow Info */}
              {(image.reviewedBy || image.rejectionReason) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4" />
                    Workflow
                  </h3>
                  <dl className="space-y-2 text-sm">
                    {image.reviewedBy && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Reviewed By</dt>
                        <dd className="text-gray-900">{image.reviewedBy}</dd>
                      </div>
                    )}
                    {image.reviewedAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Reviewed At</dt>
                        <dd className="text-gray-900">{formatDateTime(image.reviewedAt)}</dd>
                      </div>
                    )}
                    {image.appliedAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Applied At</dt>
                        <dd className="text-gray-900">{formatDateTime(image.appliedAt)}</dd>
                      </div>
                    )}
                    {image.rejectionReason && (
                      <div>
                        <dt className="text-gray-500 mb-1">Rejection Reason</dt>
                        <dd className="text-red-600">{image.rejectionReason}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Match Modal */}
        {showMatchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg m-4 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Match to Study</h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by patient name or study number..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={searchForStudies}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {searchStudies.map((study) => (
                  <div 
                    key={study._id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleManualMatch(study._id)}
                  >
                    <p className="font-medium text-gray-900">{study.studyNumber}</p>
                    <p className="text-sm text-gray-500">
                      {study.patientId?.firstName} {study.patientId?.lastName} • {study.studyType}
                    </p>
                  </div>
                ))}
                {searchStudies.length === 0 && searchTerm && (
                  <p className="text-center text-gray-500 py-4">No studies found</p>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowMatchModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
