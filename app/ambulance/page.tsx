'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';
import { 
  Ambulance, 
  Plus, 
  Search, 
  Eye, 
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle,
  Truck,
  Navigation,
  Timer
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IAmbulanceBooking {
  _id: string;
  bookingNumber: string;
  patientName: string;
  patientPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  bookingType: string;
  priority: string;
  status: string;
  ambulanceNumber?: string;
  driverName?: string;
  requestedAt: string;
  scheduledDateTime?: string;
}

export default function AmbulanceBookingsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [bookings, setBookings] = useState<IAmbulanceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [showActiveOnly]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showActiveOnly) params.append('activeOnly', 'true');
      
      const response = await fetch(`/api/ambulance/bookings?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(t('ambulance.fetchError') || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesType = typeFilter === 'all' || b.bookingType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'dispatched':
      case 'en-route-pickup':
        return 'bg-purple-100 text-purple-800';
      case 'at-pickup':
      case 'patient-loaded':
        return 'bg-indigo-100 text-indigo-800';
      case 'en-route-destination':
        return 'bg-cyan-100 text-cyan-800';
      case 'arrived':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`ambulance.statusLabels.${status}`) || status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTypeLabel = (type: string) => {
    return t(`ambulance.typeLabels.${type}`) || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Stats
  const activeCount = bookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const inTransitCount = bookings.filter(b => ['dispatched', 'en-route-pickup', 'at-pickup', 'patient-loaded', 'en-route-destination'].includes(b.status)).length;
  const completedTodayCount = bookings.filter(b => {
    if (b.status !== 'completed') return false;
    const today = new Date().toDateString();
    return new Date(b.requestedAt).toDateString() === today;
  }).length;

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('ambulance.title') || 'Ambulance Services'} dense>
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
        title={t('ambulance.title') || 'Ambulance Services'} 
        description={t('ambulance.description') || 'Manage ambulance bookings and fleet'} dense>
        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-blue-600">{t('ambulance.activeBookings') || 'Active Bookings'}</p>
                <p className="text-lg font-semibold tabular-nums text-blue-700">{activeCount}</p>
              </div>
              <Ambulance className="h-8 w-8 shrink-0 text-blue-500" />
            </div>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-yellow-600">{t('ambulance.pending') || 'Pending'}</p>
                <p className="text-lg font-semibold tabular-nums text-yellow-700">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 shrink-0 text-yellow-500" />
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-purple-600">{t('ambulance.inTransit') || 'In Transit'}</p>
                <p className="text-lg font-semibold tabular-nums text-purple-700">{inTransitCount}</p>
              </div>
              <Navigation className="h-8 w-8 shrink-0 text-purple-500" />
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-green-600">{t('ambulance.completedToday') || 'Completed Today'}</p>
                <p className="text-lg font-semibold tabular-nums text-green-700">{completedTodayCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 shrink-0 text-green-500" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative w-full flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('ambulance.searchPlaceholder') || 'Search by patient, booking number...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t('ambulance.activeOnly') || 'Active Only'}</span>
              </label>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">{t('ambulance.allTypes') || 'All Types'}</option>
                <option value="emergency">{t('ambulance.typeLabels.emergency') || 'Emergency'}</option>
                <option value="scheduled">{t('ambulance.typeLabels.scheduled') || 'Scheduled'}</option>
                <option value="transfer">{t('ambulance.typeLabels.transfer') || 'Transfer'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">{t('ambulance.allStatuses') || 'All Statuses'}</option>
                <option value="pending">{t('ambulance.statusLabels.pending') || 'Pending'}</option>
                <option value="confirmed">{t('ambulance.statusLabels.confirmed') || 'Confirmed'}</option>
                <option value="dispatched">{t('ambulance.statusLabels.dispatched') || 'Dispatched'}</option>
                <option value="en-route-pickup">{t('ambulance.statusLabels.en-route-pickup') || 'En Route to Pickup'}</option>
                <option value="completed">{t('ambulance.statusLabels.completed') || 'Completed'}</option>
              </select>

              <Link
                href="/ambulance/fleet"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <Truck className="h-4 w-4" />
                {t('ambulance.manageFleet') || 'Fleet'}
              </Link>

              <Link
                href="/ambulance/bookings/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                {t('ambulance.newBooking') || 'New Booking'}
              </Link>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white py-10 text-center shadow-sm">
              <Ambulance className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {t('ambulance.noBookings') || 'No bookings found'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {t('ambulance.noBookingsDesc') || 'Create a new ambulance booking to get started.'}
              </p>
              <div className="mt-4">
                <Link
                  href="/ambulance/bookings/new"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {t('ambulance.newBooking') || 'New Booking'}
                </Link>
              </div>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div
                key={booking._id}
                className="rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-3">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    {/* Booking Info */}
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        booking.priority === 'critical' ? 'bg-red-100' :
                        booking.priority === 'urgent' ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        <Ambulance className={`h-5 w-5 ${
                          booking.priority === 'critical' ? 'text-red-600' :
                          booking.priority === 'urgent' ? 'text-orange-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{booking.bookingNumber}</h3>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${getPriorityColor(booking.priority)}`}>
                            {t(`ambulance.priorityLabels.${booking.priority}`) || booking.priority}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center text-xs text-gray-600">
                          <User className="mr-1 h-3.5 w-3.5" />
                          {booking.patientName}
                          <Phone className="ml-2 mr-1 h-3.5 w-3.5" />
                          {booking.patientPhone}
                        </p>
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="min-w-0 flex-1 md:px-2">
                      <div className="flex items-start gap-1.5 text-xs">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                        <span className="line-clamp-1 text-gray-600">{booking.pickupAddress}</span>
                      </div>
                      <div className="mt-1 flex items-start gap-1.5 text-xs">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span className="line-clamp-1 text-gray-600">{booking.destinationAddress}</span>
                      </div>
                    </div>

                    {/* Status & Time */}
                    <div className="flex flex-col items-start gap-1.5 md:items-end">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                          {getTypeLabel(booking.bookingType)}
                        </span>
                      </div>
                      <div className="flex items-center text-[10px] text-gray-500">
                        <Timer className="mr-0.5 h-3 w-3" />
                        {formatDateTime(booking.scheduledDateTime || booking.requestedAt)}
                      </div>
                      {booking.ambulanceNumber && (
                        <p className="text-[10px] text-gray-500">
                          {booking.ambulanceNumber} • {booking.driverName}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center">
                      <Link
                        href={`/ambulance/bookings/${booking._id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-50 px-3 text-sm font-medium text-blue-600 hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" />
                        {t('common.view') || 'View'}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
