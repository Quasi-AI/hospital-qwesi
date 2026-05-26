'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Plus,
  Search,
  Eye,
  Trash2,
  Copy,
  Check,
  Wifi,
  WifiOff,
  AlertTriangle,
  Settings,
  Activity,
  Key,
  X
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

interface DeviceProfile {
  id: string;
  manufacturer: string;
  model: string;
  category: string;
  parameters: any[];
}

const DEVICE_CATEGORY_FILTER_IDS = [
  'hematology',
  'biochemistry',
  'immunology',
  'urinalysis',
  'coagulation',
  'bloodgas',
] as const;

interface LabDevice {
  _id: string;
  deviceCode: string;
  name: string;
  manufacturer: string;
  model: string;
  category: string;
  location: string;
  profileName: string;
  isActive: boolean;
  connectionStatus: string;
  lastSeenAt: string;
  totalResultsReceived: number;
  resultsToday: number;
  apiKeyPrefix: string;
}

export default function DevicesPage() {
  const { t, translationsLoaded } = useTranslations();
  const [devices, setDevices] = useState<LabDevice[]>([]);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, online: 0, offline: 0 });
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    deviceCode: '',
    name: '',
    profileId: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    category: 'hematology',
    location: '',
    notes: '',
  });

  useEffect(() => {
    fetchDevices();
    fetchProfiles();
  }, [categoryFilter, statusFilter]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/lab/devices?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
        setStats(data.stats || { total: 0, active: 0, online: 0, offline: 0 });
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/lab/devices?action=profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSearch = () => {
    fetchDevices();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleProfileSelect = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setFormData({
        ...formData,
        profileId,
        manufacturer: profile.manufacturer,
        model: profile.model,
        category: profile.category,
        name: `${profile.manufacturer} ${profile.model}`,
      });
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/lab/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.device.apiKey);
        setShowAddModal(false);
        setShowApiKeyModal(true);
        fetchDevices();
        // Reset form
        setFormData({
          deviceCode: '',
          name: '',
          profileId: '',
          manufacturer: '',
          model: '',
          serialNumber: '',
          category: 'hematology',
          location: '',
          notes: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || t('lab.devices.failedAddDevice'));
      }
    } catch (error) {
      console.error('Error adding device:', error);
      alert(t('lab.devices.failedAddDevice'));
    }
  };

  const handleRegenerateKey = async (deviceId: string) => {
    if (!confirm(t('lab.devices.regenerateKeyConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/lab/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateApiKey: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.apiKey);
        setShowApiKeyModal(true);
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
    }
  };

  const handleToggleActive = async (deviceId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/lab/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchDevices();
      }
    } catch (error) {
      console.error('Error toggling device status:', error);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm(t('lab.devices.deleteDeviceConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/lab/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDevices();
      }
    } catch (error) {
      console.error('Error deleting device:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const label = t(`lab.devices.deviceCategories.${category}`);
    return label === `lab.devices.deviceCategories.${category}` ? category : label;
  };

  const formatLastSeen = (lastSeenAt: string) => {
    if (!lastSeenAt) return t('lab.devices.lastSeenNever');
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('lab.devices.lastSeenJustNow');
    if (diffMins < 60) return t('lab.devices.lastSeenMinutes', { n: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('lab.devices.lastSeenHours', { n: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t('lab.devices.lastSeenDays', { n: diffDays });
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.devices.title')} description={t('common.loading')} dense>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('lab.devices.title')}
        description={t('lab.devices.description')}
        dense
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100">
                  <Cpu className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.total}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.devices.totalDevices')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100">
                  <Wifi className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.online}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.devices.onlineDevices')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100">
                  <WifiOff className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.offline}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.devices.offlineDevices')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-100">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.active}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.devices.activeDevices')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-between gap-2 md:flex-row md:items-center">
            <div className="flex flex-1 flex-col gap-2 md:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder={t('lab.devices.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('lab.allCategories')}</option>
                {DEVICE_CATEGORY_FILTER_IDS.map((id) => (
                  <option key={id} value={id}>
                    {t(`lab.devices.deviceCategories.${id}`)}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('lab.devices.allStatus')}</option>
                <option value="active">{t('lab.devices.active')}</option>
                <option value="inactive">{t('lab.devices.inactive')}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('lab.devices.addDevice')}</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-2 text-xs text-gray-600 sm:text-sm">{t('lab.devices.loadingDevices')}</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="py-8 text-center">
                <Cpu className="mx-auto mb-2 h-8 w-8 text-gray-400 sm:mb-3 sm:h-10 sm:w-10" />
                <h3 className="mb-1 text-sm font-medium text-gray-900 sm:text-base">{t('lab.devices.noDevices')}</h3>
                <p className="mb-3 text-xs text-gray-600 sm:text-sm">{t('lab.devices.noDevicesDescription')}</p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('lab.devices.addDevice')}</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.incoming.device')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.devices.category')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.devices.status')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.devices.lastSeen')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.results')}
                      </th>
                      <th className="px-3 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {devices.map((device) => (
                      <tr key={device._id} className="hover:bg-gray-50/80">
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100">
                              <Cpu className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-900 sm:text-sm">{device.name}</p>
                              <p className="text-[11px] text-gray-500 sm:text-xs">
                                {device.deviceCode} • {device.manufacturer} {device.model}
                              </p>
                              {device.location && (
                                <p className="text-xs text-gray-400">{device.location}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 lg:px-4">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 sm:px-2 sm:text-xs">
                            {getCategoryLabel(device.category)}
                          </span>
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-center gap-1.5">
                            {getConnectionStatusIcon(device.connectionStatus)}
                            <span className={`text-xs sm:text-sm ${device.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                              {device.connectionStatus === 'online'
                                ? t('lab.devices.online')
                                : device.connectionStatus === 'error'
                                  ? t('lab.devices.connectionError')
                                  : t('lab.devices.offline')}
                            </span>
                            {!device.isActive && (
                              <span className="text-xs text-red-500">{t('lab.devices.disabled')}</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500 lg:px-4 sm:text-sm">
                          {formatLastSeen(device.lastSeenAt)}
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <div className="text-xs sm:text-sm">
                            <p className="text-gray-900">{t('lab.devices.resultsTodayShort', { count: device.resultsToday })}</p>
                            <p className="text-gray-500">{t('lab.devices.resultsTotalShort', { count: device.totalResultsReceived })}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right lg:px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/lab/devices/${device._id}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('lab.devices.viewEditDevice')}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleRegenerateKey(device._id)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('lab.devices.regenerateKey')}
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(device._id, device.isActive)}
                              className={`p-1.5 rounded ${device.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              title={device.isActive ? t('lab.devices.disableDevice') : t('lab.devices.enableDevice')}
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDevice(device._id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title={t('lab.devices.deleteDeviceAction')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add Device Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{t('lab.devices.addNewDevice')}</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddDevice} className="p-6 space-y-6">
                {/* Device Profile Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lab.devices.selectProfileRequired')}
                  </label>
                  <select
                    value={formData.profileId}
                    onChange={(e) => handleProfileSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('lab.devices.selectProfilePlaceholder')}</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.manufacturer} - {profile.model}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('lab.devices.selectProfileHelp')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('lab.devices.deviceCode')} *
                    </label>
                    <input
                      type="text"
                      value={formData.deviceCode}
                      onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value.toUpperCase() })}
                      placeholder={t('lab.devices.phDeviceCode')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('lab.devices.displayName')} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('lab.devices.phDisplayName')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('lab.devices.manufacturer')}
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('lab.devices.model')}
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('lab.devices.serialNumber')}
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder={t('lab.devices.optional')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('lab.devices.location')}
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder={t('lab.devices.phLocation')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lab.devices.notes')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('lab.devices.notesPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('lab.devices.addDevice')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Key className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{t('lab.devices.apiKeyGenerated')}</h2>
                    <p className="text-sm text-gray-500">{t('lab.devices.apiKeySaveWarning')}</p>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-gray-800 break-all flex-1">
                      {newApiKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newApiKey)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg flex-shrink-0"
                    >
                      {copiedKey ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">{t('lab.devices.setupInstructions')}</h3>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                    <li>{t('lab.devices.setupStep1')}</li>
                    <li>
                      {t('lab.devices.setupStep2')}{' '}
                      <code className="bg-blue-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/lab/device-results</code>
                    </li>
                    <li>
                      {t('lab.devices.setupStep3')}{' '}
                      <code className="bg-blue-100 px-1 rounded">X-Device-API-Key</code>
                    </li>
                    <li>{t('lab.devices.setupStep4')}</li>
                  </ol>
                </div>

                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setNewApiKey('');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('lab.devices.done')}
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
