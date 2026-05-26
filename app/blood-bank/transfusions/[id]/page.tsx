'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { 
  Activity, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Droplets,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface IBloodTransfusion {
  _id: string;
  requestNumber: string;
  patientId: string;
  patientName: string;
  patientBloodGroup: string;
  patientAge?: number;
  patientGender?: string;
  requestedBloodGroup: string;
  requestedComponent: string;
  unitsRequested: number;
  urgency: string;
  reason: string;
  diagnosis?: string;
  hemoglobinLevel?: number;
  plateletCount?: number;
  previousTransfusions: number;
  previousReactions: boolean;
  reactionHistory?: string;
  crossmatchStatus: string;
  crossmatchDate?: string;
  crossmatchPerformedBy?: string;
  antibodyScreening?: string;
  bloodUnits: any[];
  status: string;
  rejectionReason?: string;
  requestedBy: string;
  requestedByDepartment: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  transfusionStartedAt?: string;
  transfusionCompletedAt?: string;
  transfusedBy?: string;
  supervisingDoctor?: string;
  location?: string;
  hasAdverseReaction: boolean;
  adverseReaction?: any;
  postTransfusionHemoglobin?: number;
  effectivenessAssessment?: string;
  notes?: string;
  createdAt: string;
}

export default function TransfusionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, translationsLoaded } = useTranslations();
  const router = useRouter();
  const [transfusion, setTransfusion] = useState<IBloodTransfusion | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTransfusion();
  }, [id]);

  const fetchTransfusion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blood-bank/transfusions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch transfusion');
      const data = await response.json();
      setTransfusion(data);
    } catch (error) {
      console.error('Error fetching transfusion:', error);
      toast.error(t('bloodBank.fetchError') || 'Failed to fetch transfusion details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, additionalData?: Record<string, any>) => {
    if (!transfusion) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/blood-bank/transfusions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalData })
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success(`Status updated to ${newStatus}`);
      fetchTransfusion();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('bloodBank.updateError') || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'cross-matching': return 'bg-indigo-100 text-indigo-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'life-threatening': return 'bg-red-100 text-red-800 border-red-300';
      case 'emergency': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'urgent': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getBloodGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      'A+': 'bg-red-100 text-red-700',
      'A-': 'bg-red-50 text-red-600',
      'B+': 'bg-blue-100 text-blue-700',
      'B-': 'bg-blue-50 text-blue-600',
      'AB+': 'bg-purple-100 text-purple-700',
      'AB-': 'bg-purple-50 text-purple-600',
      'O+': 'bg-green-100 text-green-700',
      'O-': 'bg-green-50 text-green-600',
    };
    return colors[group] || 'bg-gray-100 text-gray-700';
  };

  const getComponentLabel = (component: string) => {
    const labels: Record<string, string> = {
      'whole-blood': 'Whole Blood',
      'packed-rbc': 'Packed RBC',
      'platelets': 'Platelets',
      'plasma': 'Fresh Frozen Plasma',
      'cryoprecipitate': 'Cryoprecipitate',
    };
    return labels[component] || component;
  };

  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.transfusions') || 'Blood Transfusions'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.transfusionDetails') || 'Transfusion'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!transfusion) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Transfusion Not Found" description="" dense>
          <div className="text-center py-12">
            <p className="text-gray-600">Transfusion request not found</p>
            <Link href="/blood-bank/transfusions" className="text-red-600 hover:text-red-700 mt-4 inline-block">
              Back to Transfusions
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={transfusion.requestNumber} 
        description={t('bloodBank.transfusionDetails') || 'Transfusion Request Details'} dense>
        <div className="max-w-4xl mx-auto">
          <Link
            href="/blood-bank/transfusions"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t('common.back') || 'Back to Transfusions'}
          </Link>

          {/* Header Card */}
          <div className={`mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm ${
            ['life-threatening', 'emergency'].includes(transfusion.urgency) 
              ? 'border-l-4 border-l-red-500' 
              : ''
          }`}>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-base font-bold ${getBloodGroupColor(transfusion.requestedBloodGroup)}`}>
                  {transfusion.requestedBloodGroup}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{transfusion.requestNumber}</h2>
                  <p className="text-xs text-gray-600">{transfusion.patientName}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase ${getUrgencyColor(transfusion.urgency)}`}>
                  {transfusion.urgency}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${getStatusColor(transfusion.status)}`}>
                  {transfusion.status.replace(/-/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Patient Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <User className="mr-1.5 h-4 w-4 text-gray-500" />
                {t('bloodBank.patientInfo') || 'Patient Information'}
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium">{transfusion.patientName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Blood Group</dt>
                  <dd className={`px-2 py-0.5 rounded font-bold ${getBloodGroupColor(transfusion.patientBloodGroup)}`}>
                    {transfusion.patientBloodGroup}
                  </dd>
                </div>
                {transfusion.patientAge && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Age</dt>
                    <dd className="font-medium">{transfusion.patientAge} years</dd>
                  </div>
                )}
                {transfusion.patientGender && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gender</dt>
                    <dd className="font-medium capitalize">{transfusion.patientGender}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Request Details */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Droplets className="mr-1.5 h-4 w-4 text-red-500" />
                {t('bloodBank.requestDetails') || 'Request Details'}
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Requested</dt>
                  <dd className="font-medium">
                    {transfusion.unitsRequested} units of {getComponentLabel(transfusion.requestedComponent)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Reason</dt>
                  <dd className="font-medium">{transfusion.reason}</dd>
                </div>
                {transfusion.diagnosis && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Diagnosis</dt>
                    <dd className="font-medium">{transfusion.diagnosis}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Requested By</dt>
                  <dd className="font-medium">{transfusion.requestedBy}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Department</dt>
                  <dd className="font-medium">{transfusion.requestedByDepartment}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Requested At</dt>
                  <dd className="font-medium">{formatDateTime(transfusion.requestedAt)}</dd>
                </div>
              </dl>
            </div>

            {/* Clinical Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Activity className="mr-1.5 h-4 w-4 text-purple-500" />
                {t('bloodBank.clinicalInfo') || 'Clinical Information'}
              </h3>
              <dl className="space-y-3">
                {transfusion.hemoglobinLevel && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Hemoglobin</dt>
                    <dd className="font-medium">{transfusion.hemoglobinLevel} g/dL</dd>
                  </div>
                )}
                {transfusion.plateletCount && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Platelet Count</dt>
                    <dd className="font-medium">{transfusion.plateletCount.toLocaleString()}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Previous Transfusions</dt>
                  <dd className="font-medium">{transfusion.previousTransfusions}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Previous Reactions</dt>
                  <dd className={`font-medium ${transfusion.previousReactions ? 'text-red-600' : 'text-green-600'}`}>
                    {transfusion.previousReactions ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Crossmatch Status</dt>
                  <dd className={`font-medium ${
                    transfusion.crossmatchStatus === 'compatible' ? 'text-green-600' :
                    transfusion.crossmatchStatus === 'incompatible' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {transfusion.crossmatchStatus}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Blood Units Issued */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Droplets className="mr-1.5 h-4 w-4 text-red-500" />
                {t('bloodBank.issuedUnits') || 'Issued Blood Units'}
              </h3>
              {transfusion.bloodUnits && transfusion.bloodUnits.length > 0 ? (
                <div className="space-y-2">
                  {transfusion.bloodUnits.map((unit, index) => (
                    <div key={index} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50/80 p-2.5">
                      <div>
                        <p className="text-sm font-medium">{unit.unitNumber}</p>
                        <p className="text-xs text-gray-500">{unit.bloodGroup} - {getComponentLabel(unit.component)}</p>
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        unit.status === 'transfused' ? 'bg-green-100 text-green-800' :
                        unit.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {unit.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-gray-500">No blood units issued yet</p>
              )}
            </div>
          </div>

          {/* Adverse Reaction Warning */}
          {transfusion.hasAdverseReaction && transfusion.adverseReaction && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50/80 p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Adverse Reaction Reported</h3>
                  <p className="mt-0.5 text-xs text-red-700">
                    Type: <span className="font-medium">{transfusion.adverseReaction.type}</span>
                  </p>
                  {transfusion.adverseReaction.symptoms && (
                    <p className="text-xs text-red-700">
                      Symptoms: {transfusion.adverseReaction.symptoms.join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-red-700">
                    Actions Taken: {transfusion.adverseReaction.actionsTaken}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!['completed', 'cancelled', 'rejected'].includes(transfusion.status) && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {transfusion.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={updating}
                      className="inline-flex h-9 items-center rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve Request
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) handleStatusUpdate('rejected', { rejectionReason: reason });
                      }}
                      disabled={updating}
                      className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject Request
                    </button>
                  </>
                )}
                {transfusion.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('cross-matching')}
                    disabled={updating}
                    className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Start Cross-matching
                  </button>
                )}
                {transfusion.status === 'cross-matching' && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('ready', { crossmatchStatus: 'compatible' })}
                    disabled={updating}
                    className="inline-flex h-9 items-center rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark as Compatible & Ready
                  </button>
                )}
                {transfusion.status === 'ready' && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('in-progress')}
                    disabled={updating}
                    className="inline-flex h-9 items-center rounded-md bg-purple-600 px-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    Start Transfusion
                  </button>
                )}
                {transfusion.status === 'in-progress' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate('completed')}
                      disabled={updating}
                      className="inline-flex h-9 items-center rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Complete Transfusion
                    </button>
                    {!transfusion.hasAdverseReaction && (
                      <button
                        type="button"
                        onClick={() => {
                          const type = prompt('Reaction type (mild/moderate/severe/life-threatening):');
                          const symptoms = prompt('Symptoms (comma-separated):');
                          const actions = prompt('Actions taken:');
                          if (type && symptoms && actions) {
                            fetch(`/api/blood-bank/transfusions/${id}/reaction`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                type,
                                symptoms: symptoms.split(',').map(s => s.trim()),
                                actionsTaken: actions
                              })
                            }).then(() => {
                              toast.success('Adverse reaction reported');
                              fetchTransfusion();
                            });
                          }
                        }}
                        disabled={updating}
                        className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Report Reaction
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={updating}
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel Request
                </button>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
