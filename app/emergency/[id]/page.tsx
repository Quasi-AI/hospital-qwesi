'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  Siren, 
  ArrowLeft,
  User,
  AlertTriangle,
  Activity,
  Pill,
  Stethoscope,
  Heart,
  Plus,
  X,
  ArrowRight,
  Building2,
  LogOut,
  Thermometer,
  Wind
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IVitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painLevel?: number;
  recordedAt: string;
  recordedBy: string;
}

interface IProcedure {
  procedureName: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
  outcome?: string;
}

interface IMedication {
  medicationName: string;
  dosage: string;
  route: string;
  administeredBy: string;
  administeredAt: string;
  notes?: string;
}

interface IEmergencyCase {
  _id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  triageLevel: string;
  triageNotes?: string;
  triagedBy?: string;
  triagedAt?: string;
  chiefComplaint: string;
  arrivalMode: string;
  arrivalTime: string;
  injuryType?: string;
  symptoms: string[];
  allergies: string[];
  currentMedications: string[];
  vitalSigns: IVitalSigns[];
  diagnosis?: string;
  procedures: IProcedure[];
  medications: IMedication[];
  treatmentNotes?: string;
  attendingDoctorId?: string;
  attendingDoctorName?: string;
  nurseInCharge?: string;
  status: string;
  disposition?: string;
  transferTo?: string;
  transferReason?: string;
  transferredAt?: string;
  admissionId?: string;
  admittedToWard?: string;
  dischargedAt?: string;
  dischargedBy?: string;
  dischargeInstructions?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  waitingStartTime?: string;
  treatmentStartTime?: string;
  treatmentEndTime?: string;
  totalWaitingTime?: number;
  totalTreatmentTime?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function EmergencyCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [emergencyCase, setEmergencyCase] = useState<IEmergencyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Form states
  const [newVitals, setNewVitals] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    painLevel: '',
  });
  
  const [newProcedure, setNewProcedure] = useState({
    procedureName: '',
    notes: '',
    outcome: '',
  });
  
  const [newMedication, setNewMedication] = useState({
    medicationName: '',
    dosage: '',
    route: 'iv',
    notes: '',
  });
  
  const [dischargeData, setDischargeData] = useState({
    dischargeInstructions: '',
    followUpRequired: false,
    followUpDate: '',
  });
  
  const [transferData, setTransferData] = useState({
    transferTo: '',
    transferReason: '',
  });

  useEffect(() => {
    fetchCase();
  }, [resolvedParams.id]);

  const fetchCase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/emergency/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('emergency.notFound') || 'Emergency case not found');
          router.push('/emergency');
          return;
        }
        throw new Error('Failed to fetch case');
      }
      const data = await response.json();
      setEmergencyCase(data);
    } catch (error) {
      console.error('Error fetching emergency case:', error);
      toast.error(t('emergency.fetchError') || 'Failed to fetch emergency case');
    } finally {
      setLoading(false);
    }
  };

  const updateCase = async (updates: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/emergency/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update case');
      
      const data = await response.json();
      setEmergencyCase(data);
      toast.success(t('emergency.updateSuccess') || 'Updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error(t('emergency.updateError') || 'Failed to update');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateCase({ status: newStatus });
  };

  const handleAddVitals = async () => {
    const vitals = {
      bloodPressure: newVitals.bloodPressure || undefined,
      heartRate: newVitals.heartRate ? parseInt(newVitals.heartRate) : undefined,
      temperature: newVitals.temperature ? parseFloat(newVitals.temperature) : undefined,
      respiratoryRate: newVitals.respiratoryRate ? parseInt(newVitals.respiratoryRate) : undefined,
      oxygenSaturation: newVitals.oxygenSaturation ? parseInt(newVitals.oxygenSaturation) : undefined,
      painLevel: newVitals.painLevel ? parseInt(newVitals.painLevel) : undefined,
    };

    await updateCase({ newVitalSigns: vitals });
    setShowVitalsModal(false);
    setNewVitals({ bloodPressure: '', heartRate: '', temperature: '', respiratoryRate: '', oxygenSaturation: '', painLevel: '' });
  };

  const handleAddProcedure = async () => {
    if (!newProcedure.procedureName.trim()) {
      toast.error(t('emergency.procedureNameRequired') || 'Procedure name is required');
      return;
    }

    await updateCase({ newProcedure });
    setShowProcedureModal(false);
    setNewProcedure({ procedureName: '', notes: '', outcome: '' });
  };

  const handleAddMedication = async () => {
    if (!newMedication.medicationName.trim() || !newMedication.dosage.trim()) {
      toast.error(t('emergency.medicationFieldsRequired') || 'Medication name and dosage are required');
      return;
    }

    await updateCase({ newMedication });
    setShowMedicationModal(false);
    setNewMedication({ medicationName: '', dosage: '', route: 'iv', notes: '' });
  };

  const handleDischarge = async () => {
    await updateCase({
      status: 'discharged',
      dischargeInstructions: dischargeData.dischargeInstructions,
      followUpRequired: dischargeData.followUpRequired,
      followUpDate: dischargeData.followUpDate || undefined,
    });
    setShowDischargeModal(false);
  };

  const handleTransfer = async () => {
    if (!transferData.transferTo.trim()) {
      toast.error(t('emergency.transferToRequired') || 'Transfer destination is required');
      return;
    }

    await updateCase({
      transferTo: transferData.transferTo,
      transferReason: transferData.transferReason,
    });
    setShowTransferModal(false);
  };

  const getTriageColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-600 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-white';
      case 'minor': return 'bg-green-500 text-white';
      case 'non-urgent': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'in-triage': return 'bg-blue-100 text-blue-800';
      case 'in-treatment': return 'bg-purple-100 text-purple-800';
      case 'under-observation': return 'bg-indigo-100 text-indigo-800';
      case 'ready-for-discharge': return 'bg-green-100 text-green-800';
      case 'discharged': return 'bg-gray-100 text-gray-800';
      case 'admitted': return 'bg-blue-100 text-blue-800';
      case 'transferred': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getWaitingTime = (arrivalTime: string) => {
    const arrival = new Date(arrivalTime);
    const now = new Date();
    const diffMs = now.getTime() - arrival.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('emergency.title') || 'Emergency'} description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('emergency.title') || 'Emergency'} description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!emergencyCase) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('emergency.notFound') || 'Case Not Found'} dense>
          <div className="py-8 text-center">
            <Siren className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('emergency.notFound') || 'Emergency case not found'}
            </h3>
            <Link href="/emergency" className="mt-4 inline-flex h-9 items-center text-sm text-red-600 hover:text-red-800">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t('emergency.backToEmergency') || 'Back to Emergency'}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  const isActiveCase = ['waiting', 'in-triage', 'in-treatment', 'under-observation', 'ready-for-discharge'].includes(emergencyCase.status);

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={`${t('emergency.case') || 'Case'} ${emergencyCase.caseNumber}`}
        description={emergencyCase.patientName} dense>
        <div className="mx-auto max-w-6xl space-y-3">
          <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <Link href="/emergency" className="inline-flex items-center text-xs text-red-600 hover:text-red-800">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t('emergency.backToEmergency') || 'Back to Emergency'}
            </Link>
            
            {isActiveCase && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(true)}
                  className="inline-flex h-9 items-center rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700"
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  {t('emergency.discharge') || 'Discharge'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(true)}
                  className="inline-flex h-9 items-center rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
                >
                  <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                  {t('emergency.transfer') || 'Transfer'}
                </button>
                <Link
                  href="/inpatient/admissions/new"
                  className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('emergency.admit') || 'Admit'}
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${getTriageColor(emergencyCase.triageLevel)}`}>
                  <span className="text-lg font-bold">
                    {emergencyCase.triageLevel === 'critical' ? '1' :
                     emergencyCase.triageLevel === 'urgent' ? '2' :
                     emergencyCase.triageLevel === 'moderate' ? '3' :
                     emergencyCase.triageLevel === 'minor' ? '4' : '5'}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{emergencyCase.patientName}</h2>
                  <p className="text-sm text-gray-600">
                    {emergencyCase.patientAge && `${emergencyCase.patientAge} yrs`}
                    {emergencyCase.patientGender && ` • ${emergencyCase.patientGender}`}
                    {emergencyCase.patientPhone && ` • ${emergencyCase.patientPhone}`}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getTriageColor(emergencyCase.triageLevel)}`}>
                      {t(`emergency.triageLabels.${emergencyCase.triageLevel}`) || emergencyCase.triageLevel}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(emergencyCase.status)}`}>
                      {t(`emergency.statusLabels.${emergencyCase.status}`) || emergencyCase.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">{t('emergency.arrivalTime') || 'Arrival Time'}</span>
                  <p className="text-sm font-medium">{formatTime(emergencyCase.arrivalTime)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('emergency.timeInER') || 'Time in ER'}</span>
                  <p className="text-sm font-medium text-red-600">{getWaitingTime(emergencyCase.arrivalTime)}</p>
                </div>
                {emergencyCase.attendingDoctorName && (
                  <div>
                    <span className="text-gray-500">{t('emergency.attendingDoctor') || 'Doctor'}</span>
                    <p className="text-sm font-medium">{emergencyCase.attendingDoctorName}</p>
                  </div>
                )}
                {emergencyCase.nurseInCharge && (
                  <div>
                    <span className="text-gray-500">{t('emergency.nurseInCharge') || 'Nurse'}</span>
                    <p className="text-sm font-medium">{emergencyCase.nurseInCharge}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 border-t pt-3">
              <h4 className="mb-0.5 text-xs font-medium text-gray-500">{t('emergency.chiefComplaint') || 'Chief Complaint'}</h4>
              <p className="text-sm text-gray-900">{emergencyCase.chiefComplaint}</p>
            </div>

            {isActiveCase && (
              <div className="mt-3 border-t pt-3">
                <span className="mb-1.5 block text-xs font-medium text-gray-500">{t('emergency.updateStatus') || 'Update Status'}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['waiting', 'in-triage', 'in-treatment', 'under-observation', 'ready-for-discharge'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(status)}
                      disabled={updating || emergencyCase.status === status}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        emergencyCase.status === status
                          ? getStatusColor(status)
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t(`emergency.statusLabels.${status}`) || status.replace(/-/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Vital Signs */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center text-sm font-semibold text-gray-900">
                  <Activity className="mr-1.5 h-4 w-4 text-red-600" />
                  {t('emergency.vitalSigns') || 'Vital Signs'}
                </h3>
                {isActiveCase && (
                  <button
                    type="button"
                    onClick={() => setShowVitalsModal(true)}
                    className="inline-flex h-8 items-center rounded-md bg-red-50 px-2 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('emergency.addVitals') || 'Add'}
                  </button>
                )}
              </div>
              
              {emergencyCase.vitalSigns.length === 0 ? (
                <p className="py-3 text-center text-sm text-gray-500">{t('emergency.noVitals') || 'No vital signs recorded'}</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {emergencyCase.vitalSigns.slice().reverse().map((vitals, idx) => (
                    <div key={idx} className="rounded-md bg-gray-50 p-2.5">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>{formatTime(vitals.recordedAt)}</span>
                        <span>{vitals.recordedBy}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {vitals.bloodPressure && (
                          <div><Heart className="h-4 w-4 inline text-red-500" /> {vitals.bloodPressure}</div>
                        )}
                        {vitals.heartRate && (
                          <div>HR: {vitals.heartRate} bpm</div>
                        )}
                        {vitals.temperature && (
                          <div><Thermometer className="h-4 w-4 inline text-orange-500" /> {vitals.temperature}°C</div>
                        )}
                        {vitals.respiratoryRate && (
                          <div><Wind className="h-4 w-4 inline text-blue-500" /> {vitals.respiratoryRate}/min</div>
                        )}
                        {vitals.oxygenSaturation && (
                          <div>SpO2: {vitals.oxygenSaturation}%</div>
                        )}
                        {vitals.painLevel !== undefined && (
                          <div>Pain: {vitals.painLevel}/10</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Procedures */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center text-sm font-semibold text-gray-900">
                  <Stethoscope className="mr-1.5 h-4 w-4 text-red-600" />
                  {t('emergency.procedures') || 'Procedures'}
                </h3>
                {isActiveCase && (
                  <button
                    type="button"
                    onClick={() => setShowProcedureModal(true)}
                    className="inline-flex h-8 items-center rounded-md bg-red-50 px-2 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('emergency.addProcedure') || 'Add'}
                  </button>
                )}
              </div>
              
              {emergencyCase.procedures.length === 0 ? (
                <p className="py-3 text-center text-sm text-gray-500">{t('emergency.noProcedures') || 'No procedures performed'}</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {emergencyCase.procedures.map((proc, idx) => (
                    <div key={idx} className="rounded-md bg-gray-50 p-2.5">
                      <p className="font-medium text-gray-900">{proc.procedureName}</p>
                      <p className="text-sm text-gray-600">
                        {proc.performedBy} • {formatTime(proc.performedAt)}
                      </p>
                      {proc.notes && <p className="text-sm text-gray-500 mt-1">{proc.notes}</p>}
                      {proc.outcome && (
                        <p className="text-sm mt-1">
                          <span className="text-gray-500">Outcome:</span> {proc.outcome}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medications */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center text-sm font-semibold text-gray-900">
                  <Pill className="mr-1.5 h-4 w-4 text-red-600" />
                  {t('emergency.medications') || 'Medications'}
                </h3>
                {isActiveCase && (
                  <button
                    type="button"
                    onClick={() => setShowMedicationModal(true)}
                    className="inline-flex h-8 items-center rounded-md bg-red-50 px-2 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('emergency.addMedication') || 'Add'}
                  </button>
                )}
              </div>
              
              {emergencyCase.medications.length === 0 ? (
                <p className="py-3 text-center text-sm text-gray-500">{t('emergency.noMedications') || 'No medications administered'}</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {emergencyCase.medications.map((med, idx) => (
                    <div key={idx} className="rounded-md bg-gray-50 p-2.5">
                      <p className="font-medium text-gray-900">{med.medicationName}</p>
                      <p className="text-sm text-gray-600">
                        {med.dosage} • {med.route.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {med.administeredBy} • {formatTime(med.administeredAt)}
                      </p>
                      {med.notes && <p className="text-sm text-gray-500 mt-1">{med.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Info & Allergies */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <User className="mr-1.5 h-4 w-4 text-red-600" />
                {t('emergency.patientInfo') || 'Patient Information'}
              </h3>
              
              <div className="space-y-3">
                {emergencyCase.allergies.length > 0 && (
                  <div>
                    <span className="mb-1 flex items-center text-xs font-medium text-red-600">
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      {t('emergency.allergies') || 'Allergies'}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {emergencyCase.allergies.map((allergy, idx) => (
                        <span key={idx} className="rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {emergencyCase.currentMedications.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-700">{t('emergency.currentMeds') || 'Current Medications'}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {emergencyCase.currentMedications.map((med, idx) => (
                        <span key={idx} className="rounded-md bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {emergencyCase.symptoms.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-700">{t('emergency.symptoms') || 'Symptoms'}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {emergencyCase.symptoms.map((symptom, idx) => (
                        <span key={idx} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {emergencyCase.triageNotes && (
                  <div>
                    <span className="text-xs font-medium text-gray-700">{t('emergency.triageNotes') || 'Triage Notes'}</span>
                    <p className="mt-1 text-sm text-gray-600">{emergencyCase.triageNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Vitals Modal */}
        {showVitalsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t('emergency.addVitals') || 'Add Vital Signs'}</h3>
                <button type="button" onClick={() => setShowVitalsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">BP</label>
                  <input
                    type="text"
                    value={newVitals.bloodPressure}
                    onChange={(e) => setNewVitals({ ...newVitals, bloodPressure: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">HR (bpm)</label>
                  <input
                    type="number"
                    value={newVitals.heartRate}
                    onChange={(e) => setNewVitals({ ...newVitals, heartRate: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="72"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newVitals.temperature}
                    onChange={(e) => setNewVitals({ ...newVitals, temperature: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="37.0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">RR</label>
                  <input
                    type="number"
                    value={newVitals.respiratoryRate}
                    onChange={(e) => setNewVitals({ ...newVitals, respiratoryRate: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="16"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">SpO2 (%)</label>
                  <input
                    type="number"
                    value={newVitals.oxygenSaturation}
                    onChange={(e) => setNewVitals({ ...newVitals, oxygenSaturation: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="98"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Pain (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newVitals.painLevel}
                    onChange={(e) => setNewVitals({ ...newVitals, painLevel: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowVitalsModal(false)} className="h-9 rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button type="button" onClick={handleAddVitals} disabled={updating} className="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  {t('common.save') || 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Procedure Modal */}
        {showProcedureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t('emergency.addProcedure') || 'Add Procedure'}</h3>
                <button type="button" onClick={() => setShowProcedureModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.procedureName') || 'Procedure Name'} *</label>
                  <input
                    type="text"
                    value={newProcedure.procedureName}
                    onChange={(e) => setNewProcedure({ ...newProcedure, procedureName: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="e.g., IV insertion, Wound suturing"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.notes') || 'Notes'}</label>
                  <textarea
                    value={newProcedure.notes}
                    onChange={(e) => setNewProcedure({ ...newProcedure, notes: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.outcome') || 'Outcome'}</label>
                  <input
                    type="text"
                    value={newProcedure.outcome}
                    onChange={(e) => setNewProcedure({ ...newProcedure, outcome: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="e.g., Successful, Complications"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowProcedureModal(false)} className="h-9 rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button type="button" onClick={handleAddProcedure} disabled={updating} className="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  {t('common.save') || 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Medication Modal */}
        {showMedicationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t('emergency.addMedication') || 'Add Medication'}</h3>
                <button type="button" onClick={() => setShowMedicationModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.medicationName') || 'Medication'} *</label>
                  <input
                    type="text"
                    value={newMedication.medicationName}
                    onChange={(e) => setNewMedication({ ...newMedication, medicationName: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.dosage') || 'Dosage'} *</label>
                    <input
                      type="text"
                      value={newMedication.dosage}
                      onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.route') || 'Route'}</label>
                    <select
                      value={newMedication.route}
                      onChange={(e) => setNewMedication({ ...newMedication, route: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm"
                    >
                      <option value="iv">IV</option>
                      <option value="im">IM</option>
                      <option value="sc">SC</option>
                      <option value="topical">Topical</option>
                      <option value="inhalation">Inhalation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.notes') || 'Notes'}</label>
                  <textarea
                    value={newMedication.notes}
                    onChange={(e) => setNewMedication({ ...newMedication, notes: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowMedicationModal(false)} className="h-9 rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button type="button" onClick={handleAddMedication} disabled={updating} className="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  {t('common.save') || 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discharge Modal */}
        {showDischargeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t('emergency.dischargePatient') || 'Discharge Patient'}</h3>
                <button type="button" onClick={() => setShowDischargeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.dischargeInstructions') || 'Discharge Instructions'}</label>
                  <textarea
                    value={dischargeData.dischargeInstructions}
                    onChange={(e) => setDischargeData({ ...dischargeData, dischargeInstructions: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Post-discharge care instructions..."
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="followUpRequired"
                    checked={dischargeData.followUpRequired}
                    onChange={(e) => setDischargeData({ ...dischargeData, followUpRequired: e.target.checked })}
                    className="rounded border-gray-300 text-red-600"
                  />
                  <label htmlFor="followUpRequired" className="ml-2 text-sm text-gray-700">
                    {t('emergency.followUpRequired') || 'Follow-up Required'}
                  </label>
                </div>
                {dischargeData.followUpRequired && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.followUpDate') || 'Follow-up Date'}</label>
                    <input
                      type="date"
                      value={dischargeData.followUpDate}
                      onChange={(e) => setDischargeData({ ...dischargeData, followUpDate: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowDischargeModal(false)} className="h-9 rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button type="button" onClick={handleDischarge} disabled={updating} className="h-9 rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  {t('emergency.confirmDischarge') || 'Confirm Discharge'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t('emergency.transferPatient') || 'Transfer Patient'}</h3>
                <button type="button" onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.transferTo') || 'Transfer To'} *</label>
                  <input
                    type="text"
                    value={transferData.transferTo}
                    onChange={(e) => setTransferData({ ...transferData, transferTo: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="e.g., ICU, Surgery, Another Hospital"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('emergency.transferReason') || 'Reason for Transfer'}</label>
                  <textarea
                    value={transferData.transferReason}
                    onChange={(e) => setTransferData({ ...transferData, transferReason: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="h-9 rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button type="button" onClick={handleTransfer} disabled={updating} className="h-9 rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                  {t('emergency.confirmTransfer') || 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
