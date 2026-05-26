'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import SearchablePatientSelect from '../../../components/SearchablePatientSelect';
import { 
  Ambulance, 
  ArrowLeft,
  MapPin,
  User,
  Phone,
  AlertTriangle,
  Truck
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Patient {
  _id: string;
  patientId: string;
  name: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string | Date;
  gender?: string;
}

interface IAmbulance {
  _id: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  driverName?: string;
  driverPhone?: string;
  status: string;
  baseCharge: number;
  hasOxygen: boolean;
  hasDefibrillator: boolean;
  hasStretcher: boolean;
  hasVentilator: boolean;
}

export default function NewAmbulanceBookingPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <SidebarLayout title="New Ambulance Booking" dense>
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            </div>
          </SidebarLayout>
        </ProtectedRoute>
      }
    >
      <NewAmbulanceBookingPageContent />
    </Suspense>
  );
}

function NewAmbulanceBookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(false);
  const [ambulances, setAmbulances] = useState<IAmbulance[]>([]);
  const [loadingAmbulances, setLoadingAmbulances] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientPhone: '',
    patientAge: '',
    patientGender: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    pickupAddress: '',
    pickupLandmark: '',
    destinationAddress: '',
    destinationType: 'hospital',
    bookingType: 'emergency',
    scheduledDateTime: '',
    priority: 'normal',
    medicalCondition: '',
    requiresOxygen: false,
    requiresStretcher: true,
    requiresWheelchair: false,
    ambulanceId: '',
    notes: '',
  });

  useEffect(() => {
    fetchAvailableAmbulances();
  }, []);

  const fetchAvailableAmbulances = async () => {
    try {
      setLoadingAmbulances(true);
      const response = await fetch('/api/ambulance?availableOnly=true');
      if (!response.ok) throw new Error('Failed to fetch ambulances');
      const data = await response.json();
      setAmbulances(data);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
    } finally {
      setLoadingAmbulances(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      const dateOfBirth = patient.dateOfBirth ? 
        (typeof patient.dateOfBirth === 'string' ? patient.dateOfBirth : patient.dateOfBirth.toISOString()) 
        : '';
      const age = dateOfBirth ? calculateAge(dateOfBirth) : '';
      
      setFormData({
        ...formData,
        patientId: patient._id,
        patientName: patient.name,
        patientPhone: patient.phone || '',
        patientAge: age.toString(),
        patientGender: patient.gender || '',
      });
    } else {
      setFormData({
        ...formData,
        patientId: '',
        patientName: '',
        patientPhone: '',
        patientAge: '',
        patientGender: '',
      });
    }
  };

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
          email: p.email,
          phone: p.phone,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
        };
        handlePatientSelect(mapped);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientName || !formData.patientPhone) {
      toast.error(t('ambulance.validation.patientRequired') || 'Patient name and phone are required');
      return;
    }

    if (!formData.pickupAddress || !formData.destinationAddress) {
      toast.error(t('ambulance.validation.addressRequired') || 'Pickup and destination addresses are required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ambulance/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: formData.patientId || undefined,
          patientName: formData.patientName,
          patientPhone: formData.patientPhone,
          patientAge: formData.patientAge ? parseInt(formData.patientAge) : undefined,
          patientGender: formData.patientGender || undefined,
          emergencyContact: formData.emergencyContact || undefined,
          emergencyContactPhone: formData.emergencyContactPhone || undefined,
          pickupAddress: formData.pickupAddress,
          pickupLandmark: formData.pickupLandmark || undefined,
          destinationAddress: formData.destinationAddress,
          destinationType: formData.destinationType,
          bookingType: formData.bookingType,
          scheduledDateTime: formData.scheduledDateTime ? new Date(formData.scheduledDateTime) : undefined,
          priority: formData.priority,
          medicalCondition: formData.medicalCondition || undefined,
          requiresOxygen: formData.requiresOxygen,
          requiresStretcher: formData.requiresStretcher,
          requiresWheelchair: formData.requiresWheelchair,
          ambulanceId: formData.ambulanceId || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      const data = await response.json();
      toast.success(t('ambulance.bookingSuccess') || 'Ambulance booked successfully');
      router.push(`/ambulance/bookings/${data._id}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const selectedAmbulance = ambulances.find(a => a._id === formData.ambulanceId);

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('ambulance.newBooking') || 'New Ambulance Booking'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('ambulance.newBooking') || 'New Ambulance Booking'} 
        description={t('ambulance.newBookingDesc') || 'Book an ambulance for patient transport'} dense>
        <div className="mx-auto max-w-4xl">
          {/* Back Button */}
          <Link href="/ambulance" className="mb-4 inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t('ambulance.backToBookings') || 'Back to Bookings'}
          </Link>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Booking Type & Priority */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <AlertTriangle className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.bookingDetails') || 'Booking Details'}
              </h3>
              
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('ambulance.bookingType') || 'Booking Type'} *
                  </label>
                  <select
                    value={formData.bookingType}
                    onChange={(e) => setFormData({ ...formData, bookingType: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="emergency">{t('ambulance.typeLabels.emergency') || 'Emergency'}</option>
                    <option value="scheduled">{t('ambulance.typeLabels.scheduled') || 'Scheduled'}</option>
                    <option value="transfer">{t('ambulance.typeLabels.transfer') || 'Transfer'}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('ambulance.priority') || 'Priority'} *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="critical">{t('ambulance.priorityLabels.critical') || 'Critical'}</option>
                    <option value="urgent">{t('ambulance.priorityLabels.urgent') || 'Urgent'}</option>
                    <option value="normal">{t('ambulance.priorityLabels.normal') || 'Normal'}</option>
                  </select>
                </div>

                {formData.bookingType === 'scheduled' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('ambulance.scheduledTime') || 'Scheduled Date/Time'}
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledDateTime}
                      onChange={(e) => setFormData({ ...formData, scheduledDateTime: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Patient Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <User className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.patientInfo') || 'Patient Information'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('ambulance.searchPatient') || 'Search Existing Patient (Optional)'}
                  </label>
                  <SearchablePatientSelect
                    value={selectedPatient?.name || ''}
                    onChange={handlePatientSelect}
                    syncPatient={selectedPatient}
                    placeholder={t('ambulance.searchPatientPlaceholder') || 'Search by name, phone...'}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('ambulance.patientName') || 'Patient Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('ambulance.patientPhone') || 'Patient Phone'} *
                    </label>
                    <input
                      type="tel"
                      value={formData.patientPhone}
                      onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('ambulance.emergencyContact') || 'Emergency Contact'}
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('ambulance.emergencyPhone') || 'Emergency Contact Phone'}
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('ambulance.medicalCondition') || 'Medical Condition / Reason'}
                  </label>
                  <textarea
                    value={formData.medicalCondition}
                    onChange={(e) => setFormData({ ...formData, medicalCondition: e.target.value })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder={t('ambulance.medicalConditionPlaceholder') || 'Describe the medical condition or reason for transport...'}
                  />
                </div>
              </div>
            </div>

            {/* Pickup & Destination */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <MapPin className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.locations') || 'Pickup & Destination'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3.5 w-3.5 text-green-500" />
                      {t('ambulance.pickupAddress') || 'Pickup Address'} *
                    </span>
                  </label>
                  <textarea
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    required
                    placeholder={t('ambulance.pickupPlaceholder') || 'Enter complete pickup address...'}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('ambulance.pickupLandmark') || 'Pickup Landmark'}
                  </label>
                  <input
                    type="text"
                    value={formData.pickupLandmark}
                    onChange={(e) => setFormData({ ...formData, pickupLandmark: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('ambulance.landmarkPlaceholder') || 'Near landmark or building...'}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3.5 w-3.5 text-red-500" />
                      {t('ambulance.destinationAddress') || 'Destination Address'} *
                    </span>
                  </label>
                  <textarea
                    value={formData.destinationAddress}
                    onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    required
                    placeholder={t('ambulance.destinationPlaceholder') || 'Enter destination address...'}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('ambulance.destinationType') || 'Destination Type'}
                  </label>
                  <select
                    value={formData.destinationType}
                    onChange={(e) => setFormData({ ...formData, destinationType: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="hospital">{t('ambulance.destTypes.hospital') || 'Hospital'}</option>
                    <option value="clinic">{t('ambulance.destTypes.clinic') || 'Clinic'}</option>
                    <option value="home">{t('ambulance.destTypes.home') || 'Home'}</option>
                    <option value="other">{t('ambulance.destTypes.other') || 'Other'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Special Requirements */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                {t('ambulance.specialRequirements') || 'Special Requirements'}
              </h3>
              
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={formData.requiresOxygen}
                    onChange={(e) => setFormData({ ...formData, requiresOxygen: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs">{t('ambulance.requiresOxygen') || 'Requires Oxygen'}</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={formData.requiresStretcher}
                    onChange={(e) => setFormData({ ...formData, requiresStretcher: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs">{t('ambulance.requiresStretcher') || 'Requires Stretcher'}</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={formData.requiresWheelchair}
                    onChange={(e) => setFormData({ ...formData, requiresWheelchair: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs">{t('ambulance.requiresWheelchair') || 'Requires Wheelchair'}</span>
                </label>
              </div>
            </div>

            {/* Ambulance Selection */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Truck className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.selectAmbulance') || 'Select Ambulance (Optional)'}
              </h3>
              
              {loadingAmbulances ? (
                <div className="flex h-24 items-center justify-center">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                </div>
              ) : ambulances.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500">
                  {t('ambulance.noAmbulancesAvailable') || 'No ambulances currently available'}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {ambulances.map((ambulance) => (
                    <button
                      key={ambulance._id}
                      type="button"
                      onClick={() => setFormData({ ...formData, ambulanceId: ambulance._id })}
                      className={`rounded-md border-2 p-2.5 text-left transition-all ${
                        formData.ambulanceId === ambulance._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{ambulance.vehicleNumber}</span>
                        <span className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
                          {t(`ambulance.vehicleTypes.${ambulance.vehicleType}`) || ambulance.vehicleType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{ambulance.model}</p>
                      {ambulance.driverName && (
                        <p className="mt-1 text-[10px] text-gray-500">
                          {t('ambulance.driver') || 'Driver'}: {ambulance.driverName}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-0.5">
                        {ambulance.hasOxygen && <span className="rounded bg-blue-100 px-1 text-[10px]">O₂</span>}
                        {ambulance.hasDefibrillator && <span className="rounded bg-red-100 px-1 text-[10px]">AED</span>}
                        {ambulance.hasVentilator && <span className="rounded bg-purple-100 px-1 text-[10px]">Vent</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedAmbulance && (
                <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/80 p-2.5">
                  <p className="text-xs text-blue-900">
                    <strong>{t('ambulance.selectedAmbulance') || 'Selected'}:</strong> {selectedAmbulance.vehicleNumber} - {selectedAmbulance.model}
                    {selectedAmbulance.driverName && ` (${selectedAmbulance.driverName})`}
                    <br />
                    <strong>{t('ambulance.baseCharge') || 'Base Charge'}:</strong> {formatCurrency(selectedAmbulance.baseCharge)}
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                {t('ambulance.additionalNotes') || 'Additional Notes'}
              </h3>
              
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                placeholder={t('ambulance.notesPlaceholder') || 'Any additional information...'}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2">
              <Link
                href="/ambulance"
                className="inline-flex h-9 items-center rounded-md border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Ambulance className="mr-1.5 h-4 w-4" />
                    {t('ambulance.bookAmbulance') || 'Book Ambulance'}
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
