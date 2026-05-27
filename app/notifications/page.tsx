'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Search,
  RefreshCw,
  Mail,
  MessageSquare,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RotateCcw,
  Trash2,
  Calendar,
  FileText,
  DollarSign,
  Pill,
  Stethoscope,
  Check,
  X,
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

interface Notification {
  _id: string;
  type: string;
  recipientId: string;
  recipientType: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  channels: string[];
  status: string;
  priority: string;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  deliveryStatus: {
    email?: { sent: boolean; error?: string };
    sms?: { sent: boolean; error?: string };
    inApp?: { sent: boolean };
  };
  createdAt: string;
}

interface Stats {
  pending: number;
  sent: number;
  failed: number;
  read: number;
  sentToday: number;
}

const TYPE_ICONS: Record<string, any> = {
  appointment_reminder: Calendar,
  lab_result: FileText,
  payment_due: DollarSign,
  medication_reminder: Pill,
  follow_up: Stethoscope,
  system: Bell,
  direct_message: MessageSquare,
  telemedicine: MessageCircle,
};

const TYPE_COLORS: Record<string, string> = {
  appointment_reminder: 'bg-blue-100 text-blue-800',
  lab_result: 'bg-purple-100 text-purple-800',
  payment_due: 'bg-yellow-100 text-yellow-800',
  medication_reminder: 'bg-green-100 text-green-800',
  follow_up: 'bg-cyan-100 text-cyan-800',
  system: 'bg-gray-100 text-gray-800',
  direct_message: 'bg-indigo-100 text-indigo-800',
  telemedicine: 'bg-teal-100 text-teal-800',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  read: 'bg-green-100 text-green-800',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function NotificationsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, sent: 0, failed: 0, read: 0, sentToday: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setStats(data.stats || { pending: 0, sent: 0, failed: 0, read: 0, sentToday: 0 });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    fetchNotifications();
    window.addEventListener('qwesi:notifications-changed', fetchNotifications);
    return () => window.removeEventListener('qwesi:notifications-changed', fetchNotifications);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead' }),
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error retrying notification:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchNotifications();
        if (selectedNotification?._id === id) {
          setShowDetailsModal(false);
          setSelectedNotification(null);
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const formatTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredNotifications = notifications.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.recipientPhone?.includes(searchTerm)
  );

  if (!translationsLoaded) {
    return (
      <ProtectedRoute requiredRoles={['admin', 'staff', 'doctor']}>
        <SidebarLayout title="Notifications" description="Manage and monitor system notifications" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'doctor']}>
      <SidebarLayout title="Notifications" description="Manage and monitor system notifications" dense>
        <div className="space-y-4">
          {/* Header + refresh */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fetchNotifications}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">Sent Today</span>
                <div className="rounded-md bg-blue-100 p-1.5">
                  <Bell className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.sentToday}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">Pending</span>
                <div className="rounded-md bg-yellow-100 p-1.5">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-yellow-700">{stats.pending}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">Sent</span>
                <div className="rounded-md bg-blue-100 p-1.5">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-blue-700">{stats.sent}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">Failed</span>
                <div className="rounded-md bg-red-100 p-1.5">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-red-700">{stats.failed}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">Read</span>
                <div className="rounded-md bg-green-100 p-1.5">
                  <Eye className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-green-700">{stats.read}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-auto sm:min-w-[10rem]"
              >
                <option value="all">All Types</option>
                <option value="appointment_reminder">Appointment Reminder</option>
                <option value="lab_result">Lab Result</option>
                <option value="payment_due">Payment Due</option>
                <option value="medication_reminder">Medication Reminder</option>
                <option value="follow_up">Follow-up</option>
                <option value="direct_message">Direct Message</option>
                <option value="telemedicine">Telemedicine</option>
                <option value="system">System</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-auto sm:min-w-[9rem]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>

          {/* Notifications Table */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No notifications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Title</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Recipient</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Channels</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Priority</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredNotifications.map((notification) => {
                      const TypeIcon = TYPE_ICONS[notification.type] || Bell;
                      return (
                        <tr key={notification._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className={`rounded-md p-1.5 ${TYPE_COLORS[notification.type] || 'bg-gray-100 text-gray-800'}`}>
                                <TypeIcon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs text-gray-600">
                                {formatTypeLabel(notification.type)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <p className="max-w-[200px] truncate text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm">
                              {notification.recipientEmail && (
                                <p className="max-w-[150px] truncate text-gray-600">{notification.recipientEmail}</p>
                              )}
                              {notification.recipientPhone && (
                                <p className="text-xs text-gray-500">{notification.recipientPhone}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              {notification.channels.includes('email') && (
                                <div className={`rounded p-1 ${notification.deliveryStatus.email?.sent ? 'text-green-600' : 'text-gray-400'}`}>
                                  <Mail className="h-3.5 w-3.5" />
                                </div>
                              )}
                              {notification.channels.includes('sms') && (
                                <div className={`rounded p-1 ${notification.deliveryStatus.sms?.sent ? 'text-green-600' : 'text-gray-400'}`}>
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </div>
                              )}
                              {notification.channels.includes('in_app') && (
                                <div className={`rounded p-1 ${notification.deliveryStatus.inApp?.sent ? 'text-green-600' : 'text-gray-400'}`}>
                                  <Bell className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[notification.status]}`}>
                              {notification.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[notification.priority]}`}>
                              {notification.priority}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedNotification(notification);
                                  setShowDetailsModal(true);
                                }}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {notification.status === 'sent' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsRead(notification._id)}
                                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"
                                  title="Mark as Read"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {notification.status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetry(notification._id)}
                                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-orange-600"
                                  title="Retry"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(notification._id)}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <h2 className="text-sm font-semibold text-gray-900">Notification Details</h2>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Type</label>
                    <p className="text-sm text-gray-900">{formatTypeLabel(selectedNotification.type)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Status</label>
                    <p>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedNotification.status]}`}>
                        {selectedNotification.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Priority</label>
                    <p>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[selectedNotification.priority]}`}>
                        {selectedNotification.priority}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Created</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedNotification.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Title</label>
                  <p className="text-sm text-gray-900">{selectedNotification.title}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Message</label>
                  <p className="whitespace-pre-wrap text-sm text-gray-900">{selectedNotification.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedNotification.recipientEmail || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{selectedNotification.recipientPhone || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Delivery Status</label>
                  <div className="mt-1.5 space-y-1.5">
                    {selectedNotification.channels.includes('email') && (
                      <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-gray-500" />
                          <span>Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedNotification.deliveryStatus.email?.sent ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {selectedNotification.deliveryStatus.email?.error && (
                            <span className="text-xs text-red-500">{selectedNotification.deliveryStatus.email.error}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedNotification.channels.includes('sms') && (
                      <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                          <span>SMS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedNotification.deliveryStatus.sms?.sent ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {selectedNotification.deliveryStatus.sms?.error && (
                            <span className="text-xs text-red-500">{selectedNotification.deliveryStatus.sms.error}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedNotification.channels.includes('in_app') && (
                      <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <Bell className="h-3.5 w-3.5 text-gray-500" />
                          <span>In-App</span>
                        </div>
                        <div>
                          {selectedNotification.deliveryStatus.inApp?.sent ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedNotification.scheduledFor && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Scheduled For</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedNotification.scheduledFor)}</p>
                  </div>
                )}

                {selectedNotification.sentAt && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Sent At</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedNotification.sentAt)}</p>
                  </div>
                )}

                {selectedNotification.readAt && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Read At</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedNotification.readAt)}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 px-3 py-2">
                {selectedNotification.status === 'failed' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRetry(selectedNotification._id);
                      setShowDetailsModal(false);
                    }}
                    className="inline-flex h-9 items-center rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
                  >
                    Retry Send
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
