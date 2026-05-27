'use client';

import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Phone,
  MessageCircle,
  Clock,
  ArrowLeft,
  PlayCircle,
  Bell,
  RefreshCw,
} from 'lucide-react';
import SidebarLayout from '../../components/sidebar-layout';

interface WaitingSession {
  _id: string;
  sessionNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    profilePhoto?: string;
  };
  doctorId: {
    _id: string;
    name: string;
    specialization?: string;
  };
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: string;
  status: string;
  chiefComplaint?: string;
}

export default function WaitingRoomPage() {
  const [sessions, setSessions] = useState<WaitingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchWaitingSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/telemedicine/sessions?status=waiting&limit=50');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching waiting sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitingSessions();
    const interval = setInterval(fetchWaitingSessions, 10000); // Refresh every 10 seconds
    window.addEventListener('qwesi:sessions-changed', fetchWaitingSessions);
    return () => {
      clearInterval(interval);
      window.removeEventListener('qwesi:sessions-changed', fetchWaitingSessions);
    };
  }, [fetchWaitingSessions]);

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Phone className="w-4 h-4" />;
      case 'chat': return <MessageCircle className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getWaitTime = (scheduledTime: string) => {
    const scheduled = new Date(scheduledTime);
    const now = new Date();
    const diffMs = now.getTime() - scheduled.getTime();
    
    if (diffMs < 0) {
      // Not yet scheduled
      const mins = Math.abs(Math.round(diffMs / 60000));
      if (mins > 60) {
        return `In ${Math.round(mins / 60)}h`;
      }
      return `In ${mins}m`;
    }
    
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min';
    if (mins < 60) return `${mins} mins`;
    const hours = Math.round(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const getWaitTimeColor = (scheduledTime: string) => {
    const scheduled = new Date(scheduledTime);
    const now = new Date();
    const diffMs = now.getTime() - scheduled.getTime();
    const mins = Math.round(diffMs / 60000);
    
    if (mins < 0) return 'text-gray-500';
    if (mins < 5) return 'text-green-600';
    if (mins < 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <SidebarLayout title="Waiting Room" description="Patients waiting for their consultation" dense>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/telemedicine"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Telemedicine
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <RefreshCw className="h-3.5 w-3.5" />
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              type="button"
              onClick={fetchWaitingSessions}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Currently Waiting</p>
                <p className="text-lg font-semibold text-yellow-800 tabular-nums">{sessions.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Video className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Video Calls</p>
                <p className="text-lg font-semibold text-blue-800 tabular-nums">
                  {sessions.filter(s => s.consultationType === 'video').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Phone className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Audio/Chat</p>
                <p className="text-lg font-semibold text-green-800 tabular-nums">
                  {sessions.filter(s => s.consultationType !== 'video').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting List */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-white p-10 text-center shadow-sm">
            <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-sm font-semibold text-gray-900">No patients waiting</h3>
            <p className="mt-1 text-xs text-gray-500">All patients have been seen or no one has checked in yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, index) => (
              <div
                key={session._id}
                className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    {/* Queue Number */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                      <span className="text-sm font-bold text-yellow-800">#{index + 1}</span>
                    </div>

                    {/* Patient Info */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {session.patientId.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                          session.consultationType === 'video' ? 'bg-blue-100 text-blue-800' :
                          session.consultationType === 'audio' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {getConsultationIcon(session.consultationType)}
                          {session.consultationType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {session.patientId.patientId} • Dr. {session.doctorId.name}
                      </p>
                      {session.chiefComplaint && (
                        <p className="mt-0.5 text-xs text-gray-600">
                          Complaint: {session.chiefComplaint}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    {/* Wait Time */}
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Wait Time</p>
                      <p className={`text-sm font-semibold tabular-nums ${getWaitTimeColor(session.scheduledStartTime)}`}>
                        {getWaitTime(session.scheduledStartTime)}
                      </p>
                    </div>

                    {/* Actions */}
                    <Link
                      href={`/telemedicine/sessions/${session._id}?start=true`}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-green-500 px-4 text-sm font-medium text-white transition-colors hover:bg-green-600"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start Session
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auto-refresh notice */}
        <div className="text-center text-xs text-gray-500">
          <Bell className="mr-1 inline h-3.5 w-3.5" />
          This page auto-refreshes every 10 seconds
        </div>
      </div>
    </SidebarLayout>
  );
}
