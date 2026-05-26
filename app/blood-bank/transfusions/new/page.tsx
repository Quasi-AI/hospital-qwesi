'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { Activity, ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import SearchablePatientSelect from '../../../components/SearchablePatientSelect';

interface Patient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
}

export default function NewTransfusionRequestPage() {
  const { t, translationsLoaded } = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [compatibility, setCompatibility] = useState<any>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    patientBloodGroup: '',
    requestedBloodGroup: '',
    requestedComponent: 'packed-rbc',
    unitsRequested: 1,
    urgency: 'routine',
    reason: '',
    diagnosis: '',
    hemoglobinLevel: '',
    plateletCount: '',
    previousTransfusions: 0,
    previousReactions: false,
    reactionHistory: '',
    requestedByDepartment: 'General',
  });

  // Check compatibility
  const checkCompatibility = async (recipientGroup: string, donorGroup: string, component: string) => {
    try {
      const response = await fetch('/api/blood-bank/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientBloodGroup: recipientGroup, donorBloodGroup: donorGroup, component })
      });
      if (response.ok) {
        const data = await response.json();
        setCompatibility(data);
      }
    } catch (error) {
      console.error('Error checking compatibility:', error);
    }
  };

  useEffect(() => {
    if (formData.patientBloodGroup && formData.requestedBloodGroup) {
      checkCompatibility(formData.patientBloodGroup, formData.requestedBloodGroup, formData.requestedComponent);
    } else {
      setCompatibility(null);
    }
  }, [formData.patientBloodGroup, formData.requestedBloodGroup, formData.requestedComponent]);

  const handlePatientChange = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (!patient) {
      setFormData((prev) => ({
        ...prev,
        patientId: '',
        patientBloodGroup: '',
        requestedBloodGroup: '',
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, patientId: patient._id }));
    void (async () => {
      try {
        const res = await fetch(`/api/patients/${patient._id}`);
        if (!res.ok) return;
        const full = await res.json();
        const bg = (full.bloodType || full.bloodGroup || '') as string;
        setFormData((prev) => ({
          ...prev,
          patientBloodGroup: bg,
          requestedBloodGroup: bg || prev.requestedBloodGroup,
        }));
      } catch {
        /* ignore */
      }
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.requestedBloodGroup || !formData.requestedComponent || !formData.reason) {
      toast.error(t('bloodBank.requiredFields') || 'Please fill in all required fields');
      return;
    }

    // Warn if incompatible
    if (compatibility && !compatibility.isCompatible) {
      const confirmed = confirm('WARNING: The selected blood types are INCOMPATIBLE! Are you sure you want to proceed?');
      if (!confirmed) return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/blood-bank/transfusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          hemoglobinLevel: formData.hemoglobinLevel ? parseFloat(formData.hemoglobinLevel) : undefined,
          plateletCount: formData.plateletCount ? parseInt(formData.plateletCount) : undefined,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transfusion request');
      }

      toast.success(t('bloodBank.requestCreated') || 'Transfusion request created successfully');
      router.push('/blood-bank/transfusions');
    } catch (error: any) {
      console.error('Error creating transfusion request:', error);
      toast.error(error.message || t('bloodBank.createError') || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.newRequest') || 'New Transfusion Request'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('bloodBank.newRequest') || 'New Transfusion Request'} 
        description={t('bloodBank.newRequestDescription') || 'Create a new blood transfusion request'} dense>
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blood-bank/transfusions"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('common.back') || 'Back to Transfusions'}
          </Link>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-md bg-red-100 p-2">
                <Activity className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                {t('bloodBank.transfusionRequest') || 'Blood Transfusion Request'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Patient Selection */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('bloodBank.patientInfo') || 'Patient Information'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.selectPatient') || 'Select Patient'} *
                    </label>
                    <SearchablePatientSelect
                      value={selectedPatient?.name || ''}
                      onChange={handlePatientChange}
                      syncPatient={selectedPatient}
                      placeholder={t('bloodBank.searchPatientPlaceholder') || 'Search by name, phone, or patient ID...'}
                      className="w-full"
                    />
                  </div>

                  {selectedPatient && (
                    <div className="rounded-md border border-blue-200 bg-blue-50/80 p-3">
                      <p className="text-sm font-medium text-blue-900">{selectedPatient.name}</p>
                      <p className="text-xs text-blue-700">
                        {selectedPatient.email && <span className="block">{selectedPatient.email}</span>}
                        {selectedPatient.phone && <span className="block">{selectedPatient.phone}</span>}
                        Blood group:{' '}
                        <span className="font-bold">{formData.patientBloodGroup || '—'}</span>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('bloodBank.patientBloodGroup') || "Patient's Blood Group"} *
                      </label>
                      <select
                        value={formData.patientBloodGroup}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientBloodGroup: e.target.value }))}
                        required
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="">Select Blood Group</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('bloodBank.department') || 'Department'} *
                      </label>
                      <input
                        type="text"
                        value={formData.requestedByDepartment}
                        onChange={(e) => setFormData(prev => ({ ...prev, requestedByDepartment: e.target.value }))}
                        required
                        placeholder="e.g., Surgery, ICU, Emergency"
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Blood Request Details */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('bloodBank.requestDetails') || 'Request Details'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.requestedBloodGroup') || 'Requested Blood Group'} *
                    </label>
                    <select
                      value={formData.requestedBloodGroup}
                      onChange={(e) => setFormData(prev => ({ ...prev, requestedBloodGroup: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.component') || 'Blood Component'} *
                    </label>
                    <select
                      value={formData.requestedComponent}
                      onChange={(e) => setFormData(prev => ({ ...prev, requestedComponent: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="whole-blood">Whole Blood</option>
                      <option value="packed-rbc">Packed RBC</option>
                      <option value="platelets">Platelets</option>
                      <option value="plasma">Fresh Frozen Plasma</option>
                      <option value="cryoprecipitate">Cryoprecipitate</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.unitsRequested') || 'Units Requested'} *
                    </label>
                    <input
                      type="number"
                      value={formData.unitsRequested}
                      onChange={(e) => setFormData(prev => ({ ...prev, unitsRequested: parseInt(e.target.value) }))}
                      required
                      min="1"
                      max="10"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.urgency') || 'Urgency'} *
                    </label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="routine">Routine (24-48 hours)</option>
                      <option value="urgent">Urgent (2-4 hours)</option>
                      <option value="emergency">Emergency (30-60 minutes)</option>
                      <option value="life-threatening">Life Threatening (Immediate)</option>
                    </select>
                  </div>
                </div>

                {/* Compatibility Check */}
                {compatibility && (
                  <div className={`mt-3 rounded-md border p-3 ${
                    compatibility.isCompatible 
                      ? 'border-green-200 bg-green-50/80' 
                      : 'border-red-200 bg-red-50/80'
                  }`}>
                    <div className="flex items-start gap-2">
                      {compatibility.isCompatible ? (
                        <div className="flex-shrink-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                            <span className="text-sm text-green-600">✓</span>
                          </div>
                        </div>
                      ) : (
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
                      )}
                      <div>
                        <p className={`text-xs font-semibold ${compatibility.isCompatible ? 'text-green-800' : 'text-red-800'}`}>
                          {compatibility.compatibilityLevel.toUpperCase()}
                        </p>
                        <p className={`mt-0.5 text-xs ${compatibility.isCompatible ? 'text-green-700' : 'text-red-700'}`}>
                          {compatibility.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Clinical Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('bloodBank.clinicalInfo') || 'Clinical Information'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.reason') || 'Reason for Transfusion'} *
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      required
                      placeholder="e.g., Anemia, Surgery, Blood loss"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.diagnosis') || 'Diagnosis'}
                    </label>
                    <input
                      type="text"
                      value={formData.diagnosis}
                      onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                      placeholder="Primary diagnosis"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('bloodBank.hemoglobin') || 'Hemoglobin Level (g/dL)'}
                      </label>
                      <input
                        type="number"
                        value={formData.hemoglobinLevel}
                        onChange={(e) => setFormData(prev => ({ ...prev, hemoglobinLevel: e.target.value }))}
                        step="0.1"
                        min="0"
                        max="20"
                        placeholder="e.g., 7.5"
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('bloodBank.plateletCount') || 'Platelet Count'}
                      </label>
                      <input
                        type="number"
                        value={formData.plateletCount}
                        onChange={(e) => setFormData(prev => ({ ...prev, plateletCount: e.target.value }))}
                        min="0"
                        placeholder="e.g., 50000"
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfusion History */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('bloodBank.transfusionHistory') || 'Transfusion History'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.previousTransfusions') || 'Number of Previous Transfusions'}
                    </label>
                    <input
                      type="number"
                      value={formData.previousTransfusions}
                      onChange={(e) => setFormData(prev => ({ ...prev, previousTransfusions: parseInt(e.target.value) }))}
                      min="0"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.previousReactions}
                        onChange={(e) => setFormData(prev => ({ ...prev, previousReactions: e.target.checked }))}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-5 w-5"
                      />
                      <span className="text-sm text-gray-700">
                        {t('bloodBank.hadReactions') || 'Patient has had previous transfusion reactions'}
                      </span>
                    </label>
                  </div>
                  {formData.previousReactions && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('bloodBank.reactionHistory') || 'Reaction History'}
                      </label>
                      <textarea
                        value={formData.reactionHistory}
                        onChange={(e) => setFormData(prev => ({ ...prev, reactionHistory: e.target.value }))}
                        rows={3}
                        placeholder="Describe previous reactions..."
                        className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Link
                  href="/blood-bank/transfusions"
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel') || 'Cancel'}
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-5 w-5 mr-2" />
                  )}
                  {t('bloodBank.submitRequest') || 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
