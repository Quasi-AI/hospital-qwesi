'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { 
  Ambulance, 
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrencyAmount } from '@/lib/formatCurrency';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';

interface ILocationUpdate {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: string;
  status: string;
}

interface IAmbulanceBooking {
  _id: string;
  bookingNumber: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  pickupAddress: string;
  pickupLandmark?: string;
  destinationAddress: string;
  destinationType: string;
  bookingType: string;
  scheduledDateTime?: string;
  priority: string;
  medicalCondition?: string;
  requiresOxygen: boolean;
  requiresStretcher: boolean;
  requiresWheelchair: boolean;
  ambulanceId?: string;
  ambulanceNumber?: string;
  ambulanceType?: string;
  driverName?: string;
  driverPhone?: string;
  paramedicName?: string;
  paramedicPhone?: string;
  status: string;
  trackingUpdates: ILocationUpdate[];
  requestedAt: string;
  confirmedAt?: string;
  dispatchedAt?: string;
  arrivedAtPickupAt?: string;
  patientLoadedAt?: string;
  arrivedAtDestinationAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  estimatedDistance?: number;
  actualDistance?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  baseCharge: number;
  distanceCharge: number;
  additionalCharges: number;
  totalCharge: number;
  currency: string;
  billingStatus: string;
  notes?: string;
  createdAt: string;
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
}

export default function AmbulanceBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const { currencyCode } = useFormatCurrency();
  const [booking, setBooking] = useState<IAmbulanceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [availableAmbulances, setAvailableAmbulances] = useState<IAmbulance[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchBooking();
  }, [resolvedParams.id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ambulance/bookings/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('ambulance.notFound') || 'Booking not found');
          router.push('/ambulance');
          return;
        }
        throw new Error('Failed to fetch booking');
      }
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error(t('ambulance.fetchError') || 'Failed to fetch booking');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAmbulances = async () => {
    try {
      const response = await fetch('/api/ambulance?availableOnly=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableAmbulances(data);
      }
    } catch (error) {
      console.error('Error fetching ambulances:', error);
    }
  };

  const updateBooking = async (updates: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/ambulance/bookings/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update booking');
      
      const data = await response.json();
      setBooking(data);
      toast.success(t('ambulance.updateSuccess') || 'Updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error(t('ambulance.updateError') || 'Failed to update');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateBooking({ status: newStatus });
  };

  const handleAssignAmbulance = async (ambulanceId: string) => {
    await updateBooking({ ambulanceId });
    setShowAssignModal(false);
  };

  const handleCancel = async () => {
    await updateBooking({ status: 'cancelled', cancellationReason: cancelReason });
    setShowCancelModal(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'dispatched':
      case 'en-route-pickup': return 'bg-purple-100 text-purple-800';
      case 'at-pickup':
      case 'patient-loaded': return 'bg-indigo-100 text-indigo-800';
      case 'en-route-destination': return 'bg-cyan-100 text-cyan-800';
      case 'arrived': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`ambulance.statusLabels.${status}`) || status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const statusFlow = [
    'pending', 'confirmed', 'dispatched', 'en-route-pickup', 
    'at-pickup', 'patient-loaded', 'en-route-destination', 
    'arrived', 'completed'
  ];

  const isActiveBooking = booking && !['completed', 'cancelled'].includes(booking.status);
  const currentStatusIndex = booking ? statusFlow.indexOf(booking.status) : -1;

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('ambulance.booking') || 'Booking'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!booking) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('ambulance.notFound') || 'Booking Not Found'} dense>
          <div className="py-10 text-center">
            <Ambulance className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {t('ambulance.notFound') || 'Booking not found'}
            </h3>
            <Link href="/ambulance" className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t('ambulance.backToBookings') || 'Back to Bookings'}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={`${t('ambulance.booking') || 'Booking'} ${booking.bookingNumber}`}
        description={booking.patientName} dense>
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <Link href="/ambulance" className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t('ambulance.backToBookings') || 'Back to Bookings'}
            </Link>
            
            {isActiveBooking && (
              <div className="flex flex-wrap gap-2">
                {!booking.ambulanceId && (
                  <button
                    type="button"
                    onClick={() => { fetchAvailableAmbulances(); setShowAssignModal(true); }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Truck className="h-4 w-4" />
                    {t('ambulance.assignAmbulance') || 'Assign Ambulance'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" />
                  {t('ambulance.cancel') || 'Cancel'}
                </button>
              </div>
            )}
          </div>

          {/* Booking Summary */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  booking.priority === 'critical' ? 'bg-red-100' :
                  booking.priority === 'urgent' ? 'bg-orange-100' : 'bg-blue-100'
                }`}>
                  <Ambulance className={`h-6 w-6 ${
                    booking.priority === 'critical' ? 'text-red-600' :
                    booking.priority === 'urgent' ? 'text-orange-600' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{booking.bookingNumber}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${getPriorityColor(booking.priority)}`}>
                      {t(`ambulance.priorityLabels.${booking.priority}`) || booking.priority}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 capitalize">
                      {t(`ambulance.typeLabels.${booking.bookingType}`) || booking.bookingType}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">{t('ambulance.requestedAt') || 'Requested'}</span>
                  <p className="font-medium">{formatDateTime(booking.requestedAt)}</p>
                </div>
                {booking.scheduledDateTime && (
                  <div>
                    <span className="text-gray-500">{t('ambulance.scheduledFor') || 'Scheduled For'}</span>
                    <p className="font-medium">{formatDateTime(booking.scheduledDateTime)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Progress */}
            {isActiveBooking && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {statusFlow.slice(0, -1).map((status, idx) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => idx > currentStatusIndex && handleStatusChange(status)}
                      disabled={updating || idx <= currentStatusIndex}
                      className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                        idx < currentStatusIndex
                          ? 'bg-green-100 text-green-800'
                          : idx === currentStatusIndex
                          ? getStatusColor(status)
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                      }`}
                    >
                      {idx < currentStatusIndex && <CheckCircle className="mr-0.5 inline h-3 w-3" />}
                      {getStatusLabel(status)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('completed')}
                    disabled={updating || booking.status === 'completed'}
                    className="rounded-md bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {t('ambulance.markComplete') || 'Complete'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Patient Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <User className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.patientInfo') || 'Patient Information'}
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-gray-500">{t('ambulance.name') || 'Name'}</span>
                  <span className="font-medium">{booking.patientName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-gray-500">{t('ambulance.phone') || 'Phone'}</span>
                  <a href={`tel:${booking.patientPhone}`} className="font-medium text-blue-600">{booking.patientPhone}</a>
                </div>
                {booking.patientAge && (
                  <div className="flex justify-between gap-2">
                    <span className="text-xs text-gray-500">{t('ambulance.age') || 'Age'}</span>
                    <span className="font-medium">{booking.patientAge}</span>
                  </div>
                )}
                {booking.emergencyContact && (
                  <div className="flex justify-between gap-2">
                    <span className="text-xs text-gray-500">{t('ambulance.emergencyContact') || 'Emergency Contact'}</span>
                    <span className="font-medium">{booking.emergencyContact}</span>
                  </div>
                )}
                {booking.emergencyContactPhone && (
                  <div className="flex justify-between gap-2">
                    <span className="text-xs text-gray-500">{t('ambulance.emergencyPhone') || 'Emergency Phone'}</span>
                    <a href={`tel:${booking.emergencyContactPhone}`} className="font-medium text-blue-600">{booking.emergencyContactPhone}</a>
                  </div>
                )}
                {booking.medicalCondition && (
                  <div className="border-t border-gray-100 pt-2">
                    <span className="mb-0.5 block text-xs text-gray-500">{t('ambulance.medicalCondition') || 'Medical Condition'}</span>
                    <p className="text-sm text-gray-900">{booking.medicalCondition}</p>
                  </div>
                )}
                {(booking.requiresOxygen || booking.requiresStretcher || booking.requiresWheelchair) && (
                  <div className="flex flex-wrap gap-1 border-t border-gray-100 pt-2">
                    {booking.requiresOxygen && (
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">Oxygen</span>
                    )}
                    {booking.requiresStretcher && (
                      <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">Stretcher</span>
                    )}
                    {booking.requiresWheelchair && (
                      <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-800">Wheelchair</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Location Details */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <MapPin className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.locations') || 'Locations'}
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="mb-0.5 flex items-center text-xs text-gray-500">
                    <MapPin className="mr-1 h-3.5 w-3.5 text-green-500" />
                    {t('ambulance.pickup') || 'Pickup'}
                  </div>
                  <p className="font-medium text-gray-900">{booking.pickupAddress}</p>
                  {booking.pickupLandmark && (
                    <p className="text-xs text-gray-500">{t('ambulance.landmark') || 'Landmark'}: {booking.pickupLandmark}</p>
                  )}
                </div>
                
                <div className="ml-2 h-3 border-l-2 border-dashed border-gray-300" />
                
                <div>
                  <div className="mb-0.5 flex items-center text-xs text-gray-500">
                    <MapPin className="mr-1 h-3.5 w-3.5 text-red-500" />
                    {t('ambulance.destination') || 'Destination'}
                  </div>
                  <p className="font-medium text-gray-900">{booking.destinationAddress}</p>
                  <p className="text-xs text-gray-500">
                    {t(`ambulance.destTypes.${booking.destinationType}`) || booking.destinationType}
                  </p>
                </div>
              </div>
            </div>

            {/* Ambulance Details */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Truck className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.ambulanceDetails') || 'Ambulance Details'}
              </h3>
              
              {booking.ambulanceId ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">{t('ambulance.vehicleNumber') || 'Vehicle'}</span>
                    <span className="font-bold">{booking.ambulanceNumber}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">{t('ambulance.type') || 'Type'}</span>
                    <span className="font-medium">{t(`ambulance.vehicleTypes.${booking.ambulanceType}`) || booking.ambulanceType}</span>
                  </div>
                  {booking.driverName && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">{t('ambulance.driver') || 'Driver'}</span>
                      <span className="font-medium">{booking.driverName}</span>
                    </div>
                  )}
                  {booking.driverPhone && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">{t('ambulance.driverPhone') || 'Driver Phone'}</span>
                      <a href={`tel:${booking.driverPhone}`} className="font-medium text-blue-600">{booking.driverPhone}</a>
                    </div>
                  )}
                  {booking.paramedicName && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">{t('ambulance.paramedic') || 'Paramedic'}</span>
                      <span className="font-medium">{booking.paramedicName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Truck className="mx-auto h-9 w-9 text-gray-400" />
                  <p className="mt-1 text-xs text-gray-500">{t('ambulance.noAmbulanceAssigned') || 'No ambulance assigned yet'}</p>
                  {isActiveBooking && (
                    <button
                      type="button"
                      onClick={() => { fetchAvailableAmbulances(); setShowAssignModal(true); }}
                      className="mt-2 inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {t('ambulance.assignNow') || 'Assign Now'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Billing */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <DollarSign className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.billing') || 'Billing'}
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ambulance.baseCharge') || 'Base Charge'}</span>
                  <span className="font-medium">{formatCurrencyAmount(booking.baseCharge, booking.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ambulance.distanceCharge') || 'Distance Charge'}</span>
                  <span className="font-medium">{formatCurrencyAmount(booking.distanceCharge, booking.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ambulance.additionalCharges') || 'Additional'}</span>
                  <span className="font-medium">{formatCurrencyAmount(booking.additionalCharges, booking.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="font-medium text-gray-900">{t('ambulance.total') || 'Total'}</span>
                  <span className="text-base font-bold text-blue-600">{formatCurrencyAmount(booking.totalCharge, booking.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ambulance.billingStatus') || 'Status'}</span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                    booking.billingStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    booking.billingStatus === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {t(`ambulance.billingStatuses.${booking.billingStatus}`) || booking.billingStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm lg:col-span-2">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Clock className="mr-1.5 h-4 w-4 text-blue-600" />
                {t('ambulance.timeline') || 'Timeline'}
              </h3>
              
              <div className="space-y-1.5 text-sm">
                {booking.requestedAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('ambulance.bookingRequested') || 'Booking Requested'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.requestedAt)}</p>
                    </div>
                  </div>
                )}
                {booking.confirmedAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('ambulance.bookingConfirmed') || 'Booking Confirmed'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.confirmedAt)}</p>
                    </div>
                  </div>
                )}
                {booking.dispatchedAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('ambulance.ambulanceDispatched') || 'Ambulance Dispatched'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.dispatchedAt)}</p>
                    </div>
                  </div>
                )}
                {booking.arrivedAtPickupAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('ambulance.arrivedAtPickup') || 'Arrived at Pickup'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.arrivedAtPickupAt)}</p>
                    </div>
                  </div>
                )}
                {booking.patientLoadedAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('ambulance.patientLoaded') || 'Patient Loaded'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.patientLoadedAt)}</p>
                    </div>
                  </div>
                )}
                {booking.arrivedAtDestinationAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('ambulance.arrivedAtDestination') || 'Arrived at Destination'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.arrivedAtDestinationAt)}</p>
                    </div>
                  </div>
                )}
                {booking.completedAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('ambulance.tripCompleted') || 'Trip Completed'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.completedAt)}</p>
                      {booking.actualDuration && (
                        <p className="text-xs text-gray-500">
                          {t('ambulance.duration') || 'Duration'}: {booking.actualDuration} {t('ambulance.minutes') || 'min'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {booking.cancelledAt && (
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-red-600">{t('ambulance.bookingCancelled') || 'Booking Cancelled'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.cancelledAt)}</p>
                      {booking.cancellationReason && (
                        <p className="text-xs text-red-500">{t('ambulance.reason') || 'Reason'}: {booking.cancellationReason}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assign Ambulance Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('ambulance.selectAmbulance') || 'Select Ambulance'}</h3>
              
              {availableAmbulances.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500">
                  {t('ambulance.noAmbulancesAvailable') || 'No ambulances available'}
                </p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {availableAmbulances.map((amb) => (
                    <button
                      key={amb._id}
                      type="button"
                      onClick={() => handleAssignAmbulance(amb._id)}
                      disabled={updating}
                      className="w-full rounded-md border border-gray-100 p-2.5 text-left text-sm transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{amb.vehicleNumber}</p>
                          <p className="text-xs text-gray-600">{amb.model}</p>
                          {amb.driverName && (
                            <p className="text-[10px] text-gray-500">{t('ambulance.driver') || 'Driver'}: {amb.driverName}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-gray-600">{formatCurrencyAmount(amb.baseCharge, currencyCode)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <h3 className="mb-2 flex items-center text-sm font-semibold text-red-600">
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                {t('ambulance.cancelBooking') || 'Cancel Booking'}
              </h3>
              
              <p className="mb-3 text-xs text-gray-600">
                {t('ambulance.cancelConfirm') || 'Are you sure you want to cancel this booking?'}
              </p>
              
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('ambulance.cancelReason') || 'Cancellation Reason'}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  {t('common.back') || 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={updating}
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {t('ambulance.confirmCancel') || 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
