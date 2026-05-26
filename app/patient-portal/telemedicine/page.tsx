'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from '../../hooks/useTranslations';
import {
  Video,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  ChevronRight,
  Search,
} from 'lucide-react';

interface TelemedicineSession {
  _id: string;
  sessionNumber: string;
  status: string;
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: string;
  scheduledEndTime: string;
  roomId: string;
  chiefComplaint?: string;
  doctorId?: {
    _id: string;
    name: string;
    email: string;
    specialization?: string;
  };
}

export default function PatientTelemedicinePage() {
  const { t } = useTranslations();
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/patient-portal/telemedicine');
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (error) {
        console.error('Error fetching telemedicine sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'in-progress':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Phone className="h-4 w-4" />;
      case 'chat':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const canJoinSession = (sessionData: TelemedicineSession): boolean => {
    const now = new Date();
    const scheduledStart = new Date(sessionData.scheduledStartTime);
    const scheduledEnd = new Date(sessionData.scheduledEndTime);
    const joinWindowStart = new Date(scheduledStart.getTime() - 15 * 60 * 1000);
    return (
      now >= joinWindowStart &&
      now <= scheduledEnd &&
      ['scheduled', 'waiting', 'in-progress'].includes(sessionData.status)
    );
  };

  const filteredSessions = sessions.filter((s) => {
    const now = new Date();
    const scheduledDate = new Date(s.scheduledStartTime);

    if (filter === 'upcoming' && (scheduledDate < now || s.status === 'completed' || s.status === 'cancelled')) {
      return false;
    }
    if (filter === 'completed' && s.status !== 'completed') {
      return false;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        s.doctorId?.name.toLowerCase().includes(search) ||
        s.sessionNumber.toLowerCase().includes(search) ||
        s.chiefComplaint?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
          <p className="mt-2 text-xs text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {t('patientPortal.navigation.telemedicine') || 'Video Consultations'}
        </h1>
        <p className="mt-0.5 text-xs text-gray-600">
          View and join your scheduled video consultations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by doctor or session number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'upcoming', 'completed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`inline-flex h-9 items-center rounded-md px-3 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="grid gap-2">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((sessionData) => {
            const canJoin = canJoinSession(sessionData);
            const isActive = sessionData.status === 'in-progress' || sessionData.status === 'waiting';

            return (
              <div
                key={sessionData._id}
                className={`overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${
                  isActive ? 'border-green-200 bg-gradient-to-r from-green-50/80 to-white' : 'border-gray-100'
                }`}
              >
                <div className="flex">
                  {/* Date Badge */}
                  <div className="hidden flex-col items-center justify-center border-r border-gray-100 bg-gradient-to-b from-indigo-50/80 to-purple-50/80 px-4 py-3 sm:flex">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      sessionData.consultationType === 'video'
                        ? 'bg-indigo-100 text-indigo-600'
                        : sessionData.consultationType === 'audio'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-teal-100 text-teal-600'
                    }`}>
                      {getTypeIcon(sessionData.consultationType)}
                    </div>
                    <span className="mt-1.5 text-[10px] font-medium uppercase text-gray-500">
                      {sessionData.consultationType}
                    </span>
                  </div>

                  {/* Session Details */}
                  <div className="min-w-0 flex-1 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {sessionData.doctorId
                              ? `Dr. ${sessionData.doctorId.name}`
                              : 'Video Consultation'}
                          </h3>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                              Live
                            </span>
                          )}
                        </div>
                        {sessionData.doctorId?.specialization && (
                          <p className="text-xs text-gray-500">{sessionData.doctorId.specialization}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-gray-400">Session: {sessionData.sessionNumber}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusColor(
                          sessionData.status
                        )}`}
                      >
                        {sessionData.status.replace('-', ' ')}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {formatDate(sessionData.scheduledStartTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {formatTime(sessionData.scheduledStartTime)} -{' '}
                        {formatTime(sessionData.scheduledEndTime)}
                      </span>
                    </div>

                    {sessionData.chiefComplaint && (
                      <p className="mt-1.5 text-xs text-gray-600">
                        <span className="font-medium">Reason:</span> {sessionData.chiefComplaint}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {canJoin || isActive ? (
                        <Link
                          href={`/patient-portal/telemedicine/${sessionData._id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {isActive ? 'Join Now' : 'Join Call'}
                        </Link>
                      ) : sessionData.status === 'scheduled' ? (
                        <Link
                          href={`/patient-portal/telemedicine/${sessionData._id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                          View Details
                        </Link>
                      ) : (
                        <Link
                          href={`/patient-portal/telemedicine/${sessionData._id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gray-100 px-3 text-xs font-medium text-gray-700 hover:bg-gray-200"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                          View Summary
                        </Link>
                      )}

                      {!canJoin && sessionData.status === 'scheduled' && (
                        <span className="text-xs text-gray-500">
                          Join available 15 min before start time
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-gray-100 bg-white py-10 text-center">
            <Video className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-sm font-semibold text-gray-900">No video consultations found</h3>
            <p className="mt-1 text-xs text-gray-500">
              You don&apos;t have any scheduled video consultations at the moment.
            </p>
            <Link
              href="/patient-portal/appointments"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              View All Appointments
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
