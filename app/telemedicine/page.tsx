'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Video,
  Phone,
  MessageCircle,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  Plus,
  ArrowRight,
  Activity,
  MonitorPlay,
} from 'lucide-react';
import SidebarLayout from '../components/sidebar-layout';

interface Session {
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
    profilePhoto?: string;
  };
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
}

interface Stats {
  todayCount: number;
  inProgress: number;
  waiting: number;
  byType: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
}

export default function TelemedicineDashboard() {
  const { data: authSession } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [todayRes, upcomingRes] = await Promise.all([
        fetch('/api/telemedicine/sessions?today=true&limit=50'),
        fetch('/api/telemedicine/sessions?upcoming=true&limit=10'),
      ]);

      if (!todayRes.ok || !upcomingRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const todayData = await todayRes.json();
      const upcomingData = await upcomingRes.json();

      setSessions([...todayData.sessions]);
      setStats(todayData.stats);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Phone className="w-4 h-4" />;
      case 'chat':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'waiting': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no-show': 'bg-orange-100 text-orange-800',
      'technical-issue': 'bg-purple-100 text-purple-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeSessions = sessions.filter(s => s.status === 'in-progress');
  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');

  if (loading) {
    return (
      <SidebarLayout title="Telemedicine" description="Virtual consultations dashboard" dense>
        <div className="flex items-center justify-center h-48">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout title="Telemedicine" description="Virtual consultations dashboard" dense>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/telemedicine/sessions/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Session
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center  justify-center rounded-full bg-blue-100">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Today&apos;s Sessions</p>
                <p className="text-lg font-semibold tabular-nums">{stats?.todayCount || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Active Now</p>
                <p className="text-lg font-semibold tabular-nums text-green-600">{stats?.inProgress || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Waiting</p>
                <p className="text-lg font-semibold tabular-nums text-yellow-600">{stats?.waiting || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Video className="h-4 w-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Video Calls</p>
                <p className="text-lg font-semibold tabular-nums text-purple-600">
                  {stats?.byType?.find(t => t._id === 'video')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <MonitorPlay className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-green-800">Active Sessions</h2>
              <span className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                {activeSessions.length} Live
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map(session => (
                <Link
                  key={session._id}
                  href={`/telemedicine/sessions/${session._id}`}
                  className="rounded-lg border border-green-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">
                      {session.sessionNumber}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      {getConsultationIcon(session.consultationType)}
                      {session.consultationType}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {session.patientId.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    with Dr. {session.doctorId.name}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-green-600">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    In Progress
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Waiting Room */}
        {waitingSessions.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <h2 className="text-sm font-semibold text-yellow-800">Waiting Room</h2>
              <span className="rounded-md bg-yellow-600 px-2 py-0.5 text-xs font-medium text-white">
                {waitingSessions.length} waiting
              </span>
            </div>
            <div className="space-y-2">
              {waitingSessions.map(session => (
                <div
                  key={session._id}
                  className="flex flex-col gap-3 rounded-lg border border-yellow-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                      {getConsultationIcon(session.consultationType)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {session.patientId.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        Waiting for Dr. {session.doctorId.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xs text-gray-500">
                      Scheduled: {formatTime(session.scheduledStartTime)}
                    </span>
                    <Link
                      href={`/telemedicine/sessions/${session._id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-yellow-600 px-3 text-sm font-medium text-white transition-colors hover:bg-yellow-700"
                    >
                      Join Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Sessions */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Today&apos;s Schedule</h2>
              <Link
                href="/telemedicine/sessions"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {sessions.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Video className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No telemedicine sessions scheduled for today</p>
                <Link
                  href="/telemedicine/sessions/new"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Schedule a Session
                </Link>
              </div>
            ) : (
              sessions.map(session => (
                <Link
                  key={session._id}
                  href={`/telemedicine/sessions/${session._id}`}
                  className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex min-w-[52px] flex-col items-center text-center">
                      <span className="text-sm font-semibold tabular-nums text-gray-900">
                        {formatTime(session.scheduledStartTime)}
                      </span>
                      <span className="text-[10px] text-gray-500 tabular-nums">
                        {formatTime(session.scheduledEndTime)}
                      </span>
                    </div>
                    <div className="h-10 w-px shrink-0 bg-gray-200" />
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        session.consultationType === 'video' ? 'bg-blue-100 text-blue-600' :
                        session.consultationType === 'audio' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {getConsultationIcon(session.consultationType)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {session.patientId.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          Dr. {session.doctorId.name} • {session.doctorId.specialization || 'General'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${getStatusBadge(session.status)}`}>
                      {session.status.replace('-', ' ')}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link
            href="/telemedicine/sessions/new"
            className="group rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-200">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Start Video Call</h3>
            <p className="mt-0.5 text-xs text-gray-500">Schedule or start an instant video consultation</p>
          </Link>

          <Link
            href="/telemedicine/waiting-room"
            className="group rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 transition-colors group-hover:bg-yellow-200">
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Waiting Room</h3>
            <p className="mt-0.5 text-xs text-gray-500">View patients waiting for consultation</p>
          </Link>

          <Link
            href="/telemedicine/sessions?status=completed"
            className="group rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 transition-colors group-hover:bg-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Completed Sessions</h3>
            <p className="mt-0.5 text-xs text-gray-500">Review past consultations and notes</p>
          </Link>
        </div>
      </div>
    </SidebarLayout>
  );
}
