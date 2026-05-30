'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  FileText,
  ChevronRight,
  Filter,
  Search,
  Video,
  ExternalLink,
  Plus,
  CreditCard
} from 'lucide-react';

interface TelemedicineSession {
  _id: string;
  sessionNumber: string;
  status: string;
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: string;
  scheduledEndTime: string;
  roomId: string;
  roomUrl?: string;
}

interface Appointment {
  _id: string;
  patientName: string;
  doctorName: string;
  doctorEmail?: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: string;
  reason?: string;
  notes?: string;
  symptoms?: string[];
  diagnosis?: string;
  treatment?: string;
  telemedicineSessionId?: TelemedicineSession;
}

interface StandaloneTelemedicineSession {
  _id: string;
  sessionNumber: string;
  status: string;
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: string;
  scheduledEndTime: string;
  roomId: string;
  roomUrl?: string;
  doctorId?: {
    name: string;
    email: string;
  };
}

export default function PatientAppointmentsPage() {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [telemedicineSessions, setTelemedicineSessions] = useState<StandaloneTelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [canBook, setCanBook] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const [res, accessRes] = await Promise.all([
          fetch('/api/patient-portal/appointments'),
          fetch('/api/patient-portal/consultation-access'),
        ]);
        const data = await res.json();
        const accessData = await accessRes.json().catch(() => ({}));
        setAppointments(data.appointments || []);
        setTelemedicineSessions(data.telemedicineSessions || []);
        setCanBook(Boolean(accessData.allowed));
        setAccessMessage(accessData.message || '');
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'scheduled': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'in-progress': case 'inProgress': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'bg-blue-500';
      case 'follow-up': case 'followUp': return 'bg-purple-500';
      case 'home-nurse-visit': return 'bg-teal-500';
      case 'checkup': return 'bg-green-500';
      case 'emergency': return 'bg-red-500';
      case 'surgery': return 'bg-orange-500';
      case 'therapy': return 'bg-teal-500';
      case 'telemedicine': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const canJoinVideoCall = (apt: Appointment): boolean => {
    if (!apt.telemedicineSessionId) return false;
    const sessionStatus = apt.telemedicineSessionId.status;
    return ['scheduled', 'waiting', 'in-progress'].includes(sessionStatus);
  };

  const isWithinJoinWindow = (apt: Appointment): boolean => {
    if (!apt.telemedicineSessionId) return false;
    const now = new Date();
    const scheduledStart = new Date(apt.telemedicineSessionId.scheduledStartTime);
    const scheduledEnd = new Date(apt.telemedicineSessionId.scheduledEndTime);
    const joinWindowStart = new Date(scheduledStart.getTime() - 15 * 60 * 1000);
    return now >= joinWindowStart && now <= scheduledEnd;
  };

  const filteredAppointments = appointments.filter(apt => {
    const now = new Date();
    const aptDate = new Date(apt.appointmentDate);
    
    // Filter by time
    if (filter === 'upcoming' && aptDate < now) return false;
    if (filter === 'past' && aptDate >= now) return false;
    
    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        apt.doctorName.toLowerCase().includes(search) ||
        apt.appointmentType.toLowerCase().includes(search) ||
        apt.reason?.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
          <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('patientPortal.appointments.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-600">{t('patientPortal.appointments.subtitle')}</p>
        </div>
        {canBook ? (
          <Link
            href="/patient-portal/appointments/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Book appointment
          </Link>
        ) : (
          <Link
            href="/patient-portal/subscriptions"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-amber-600 px-3 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <CreditCard className="h-4 w-4" />
            Subscribe or pay first
          </Link>
        )}
      </div>

      {!canBook && accessMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {accessMessage}
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('patientPortal.appointments.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'upcoming', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t(`patientPortal.appointments.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="grid gap-3">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((apt) => (
            <div
              key={apt._id}
              className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex">
                {/* Date Badge */}
                <div className="hidden flex-col items-center justify-center border-r border-gray-100 bg-gradient-to-b from-teal-50 to-cyan-50 px-4 py-3 sm:flex">
                  <span className="text-2xl font-bold text-teal-600">
                    {new Date(apt.appointmentDate).getDate()}
                  </span>
                  <span className="text-xs font-medium uppercase text-teal-700">
                    {new Date(apt.appointmentDate).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>

                {/* Appointment Details */}
                <div className="flex-1 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${getTypeColor(apt.appointmentType)}`} />
                        <h3 className="font-semibold text-gray-900">{apt.doctorName}</h3>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 capitalize">{apt.appointmentType.replace('-', ' ')}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize sm:text-xs ${getStatusColor(apt.status)}`}>
                      {apt.status.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600 sm:text-sm">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(apt.appointmentDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {apt.appointmentTime}
                    </span>
                  </div>

                  {apt.reason && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Reason:</span> {apt.reason}
                    </p>
                  )}

                  {/* Telemedicine / Video Call Section */}
                  {apt.telemedicineSessionId && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-600">
                            {apt.telemedicineSessionId.consultationType === 'video' 
                              ? t('patientPortal.appointments.videoConsultation') || 'Video Consultation'
                              : apt.telemedicineSessionId.consultationType === 'audio'
                              ? t('patientPortal.appointments.audioConsultation') || 'Audio Consultation'
                              : t('patientPortal.appointments.chatConsultation') || 'Chat Consultation'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            apt.telemedicineSessionId.status === 'in-progress' 
                              ? 'bg-green-100 text-green-700'
                              : apt.telemedicineSessionId.status === 'waiting'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {apt.telemedicineSessionId.status.replace('-', ' ')}
                          </span>
                        </div>
                        {canJoinVideoCall(apt) && (
                          <Link
                            href={`/patient-portal/telemedicine/${apt.telemedicineSessionId._id}`}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                              isWithinJoinWindow(apt)
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            <Video className="h-4 w-4" />
                            {isWithinJoinWindow(apt) 
                              ? t('patientPortal.appointments.joinNow') || 'Join Now'
                              : t('patientPortal.appointments.joinVideoCall') || 'Join Video Call'}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      {!isWithinJoinWindow(apt) && canJoinVideoCall(apt) && (
                        <p className="text-xs text-gray-500 mt-2">
                          {t('patientPortal.appointments.joinWindowNote') || 'You can join the call 15 minutes before the scheduled time.'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Show details for completed appointments */}
                  {apt.status === 'completed' && (apt.diagnosis || apt.treatment) && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      {apt.diagnosis && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium text-gray-900">Diagnosis:</span> {apt.diagnosis}
                        </p>
                      )}
                      {apt.treatment && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium text-gray-900">Treatment:</span> {apt.treatment}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-gray-100 bg-white py-8 text-center">
            <Calendar className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            <h3 className="text-base font-medium text-gray-900">{t('patientPortal.appointments.noAppointments')}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{t('patientPortal.appointments.noAppointmentsDesc')}</p>
            {canBook ? (
              <Link
                href="/patient-portal/appointments/new"
                className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Book appointment
              </Link>
            ) : (
              <Link
                href="/patient-portal/subscriptions"
                className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-amber-600 px-3 text-sm font-semibold text-white hover:bg-amber-700"
              >
                <CreditCard className="h-4 w-4" />
                Subscribe or pay first
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Video Consultations Section */}
      {telemedicineSessions.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            {t('patientPortal.appointments.upcomingVideoCalls') || 'Upcoming Video Consultations'}
          </h2>
          <div className="grid gap-3">
            {telemedicineSessions.map((session) => {
              const now = new Date();
              const scheduledStart = new Date(session.scheduledStartTime);
              const scheduledEnd = new Date(session.scheduledEndTime);
              const joinWindowStart = new Date(scheduledStart.getTime() - 15 * 60 * 1000);
              const canJoin = now >= joinWindowStart && now <= scheduledEnd;
              const isActive = session.status === 'in-progress' || session.status === 'waiting';

              return (
                <div
                  key={session._id}
                  className="rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-indigo-100 p-2">
                        <Video className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {session.consultationType === 'video' ? 'Video' : session.consultationType === 'audio' ? 'Audio' : 'Chat'} Consultation
                        </h3>
                        {session.doctorId && (
                          <p className="text-sm text-gray-600">
                            {t('common.with') || 'with'} Dr. {session.doctorId.name}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(session.scheduledStartTime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(session.scheduledStartTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        session.status === 'in-progress' 
                          ? 'bg-green-100 text-green-700 animate-pulse'
                          : session.status === 'waiting'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {session.status === 'in-progress' ? 'In Progress' : session.status.replace('-', ' ')}
                      </span>
                      <Link
                        href={`/patient-portal/telemedicine/${session._id}`}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                          isActive || canJoin
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        <Video className="h-4 w-4" />
                        {isActive 
                          ? t('patientPortal.appointments.joinNow') || 'Join Now'
                          : t('patientPortal.appointments.viewSession') || 'View Session'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
