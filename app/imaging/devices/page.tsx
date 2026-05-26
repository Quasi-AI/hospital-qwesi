'use client';

import { useState, useEffect } from 'react';
import {
  MonitorPlay,
  Plus,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Wifi,
  WifiOff,
  AlertTriangle,
  Key,
  X,
  Activity,
  Image as ImageIcon
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

interface DeviceProfile {
  id: string;
  manufacturer: string;
  model: string;
  category: string;
  modality: string;
  supportedModalities: string[];
  description: string;
}

interface ImagingDevice {
  _id: string;
  deviceCode: string;
  name: string;
  aeTitle: string;
  manufacturer: string;
  model: string;
  modality: string;
  supportedModalities: string[];
  location: string;
  profileName: string;
  isActive: boolean;
  connectionStatus: string;
  lastSeenAt: string;
  lastImageAt: string;
  totalImagesReceived: number;
  imagesToday: number;
  apiKeyPrefix: string;
}

const MODALITY_IDS = ['CR', 'CT', 'MR', 'US', 'MG', 'XA', 'DX', 'NM', 'PT', 'RF', 'OT'] as const;

export default function ImagingDevicesPage() {
  const { t, translationsLoaded } = useTranslations();
  const [devices, setDevices] = useState<ImagingDevice[]>([]);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
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
    aeTitle: '',
    profileId: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    modality: 'CT',
    location: '',
    notes: '',
  });

  useEffect(() => {
    fetchDevices();
    fetchProfiles();
  }, [modalityFilter, statusFilter]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (modalityFilter !== 'all') params.append('modality', modalityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/imaging/devices?${params.toString()}`);
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
      const response = await fetch('/api/imaging/devices?action=profiles');
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
        modality: profile.modality,
        name: `${profile.manufacturer} ${profile.model}`,
        aeTitle: profile.model.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 16),
      });
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/imaging/devices', {
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
          aeTitle: '',
          profileId: '',
          manufacturer: '',
          model: '',
          serialNumber: '',
          modality: 'CT',
          location: '',
          notes: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || t('imaging.failedAddDevice'));
      }
    } catch (error) {
      console.error('Error adding device:', error);
      alert(t('imaging.failedAddDevice'));
    }
  };

  const handleRegenerateKey = async (deviceId: string) => {
    if (!confirm(t('imaging.regenerateKeyConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/imaging/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-key' }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.device.apiKey);
        setShowApiKeyModal(true);
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
    }
  };

  const handleToggleStatus = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/imaging/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status' }),
      });

      if (response.ok) {
        fetchDevices();
      }
    } catch (error) {
      console.error('Error toggling device status:', error);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm(t('imaging.deleteDeviceConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/imaging/devices/${deviceId}`, {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      online: 'bg-green-100 text-green-800',
      offline: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };
    return styles[status] || styles.offline;
  };

  const getModalityName = (id: string) => {
    const label = t(`imaging.modalityNames.${id}`);
    return label === `imaging.modalityNames.${id}` ? id : label;
  };

  const connectionStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return t('imaging.connectionStatusOnline');
      case 'error':
        return t('imaging.connectionStatusError');
      default:
        return t('imaging.connectionStatusOffline');
    }
  };

  const formatLastSeen = (dateStr: string) => {
    if (!dateStr) return t('imaging.lastSeenNever');
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('imaging.lastSeenJustNow');
    if (minutes < 60) return t('imaging.lastSeenMinutes', { n: minutes });
    if (hours < 24) return t('imaging.lastSeenHours', { n: hours });
    return t('imaging.lastSeenDays', { n: days });
  };

  if (!translationsLoaded) {
    return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>;
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <SidebarLayout title={t('imaging.devicesTitle')} description={t('imaging.devicesDescription')} dense>
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {t('imaging.addDevice')}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.totalDevices')}</span>
                <MonitorPlay className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.activeDevices')}</span>
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.onlineDevices')}</span>
                <Wifi className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.online}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.offlineDevices')}</span>
                <WifiOff className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.offline}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('imaging.searchDevicesPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('imaging.allModalities')}</option>
                {MODALITY_IDS.map((id) => (
                  <option key={id} value={id}>{getModalityName(id)}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('imaging.allStatus')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Devices Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{t('imaging.loadingDevices')}</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="p-8 text-center">
                <MonitorPlay className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{t('imaging.noDevices')}</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('imaging.addFirstDevice')}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colDevice')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.aeTitle')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.modality')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.location')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colImages')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.lastSeen')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('imaging.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {devices.map((device) => (
                      <tr key={device._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(device.connectionStatus)}
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(device.connectionStatus)}`}>
                              {connectionStatusLabel(device.connectionStatus)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{device.name}</p>
                            <p className="text-sm text-gray-500">{device.deviceCode} • {device.manufacturer} {device.model}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {device.aeTitle}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                            {getModalityName(device.modality)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{device.location || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{device.totalImagesReceived}</span>
                            <span className="text-xs text-gray-500">{t('imaging.imagesTodayCount', { count: device.imagesToday })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatLastSeen(device.lastSeenAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRegenerateKey(device._id)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title={t('imaging.titleRegenerateApiKey')}
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(device._id)}
                              className="p-1 text-gray-400 hover:text-yellow-600"
                              title={device.isActive ? t('imaging.titleDeactivate') : t('imaging.titleActivate')}
                            >
                              {device.isActive ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteDevice(device._id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title={t('imaging.deleteDevice')}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{t('imaging.addImagingDevice')}</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddDevice} className="p-4 space-y-4">
                {/* Device Profile Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('imaging.deviceProfileOptional')}
                  </label>
                  <select
                    value={formData.profileId}
                    onChange={(e) => handleProfileSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('imaging.selectPreconfiguredDevice')}</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.manufacturer} {profile.model} ({profile.modality})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('imaging.orEnterManualHint')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('imaging.deviceCodeLabel')}
                    </label>
                    <input
                      type="text"
                      value={formData.deviceCode}
                      onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value.toUpperCase() })}
                      placeholder={t('imaging.phDeviceCode')}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('imaging.aeTitle')} *
                    </label>
                    <input
                      type="text"
                      value={formData.aeTitle}
                      onChange={(e) => setFormData({ ...formData, aeTitle: e.target.value.toUpperCase() })}
                      placeholder={t('imaging.phAeTitle')}
                      required
                      maxLength={16}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('imaging.aeTitleHint')}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('imaging.deviceNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('imaging.phDeviceName')}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('imaging.labelManufacturer')}
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder={t('imaging.phManufacturer')}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('imaging.labelModel')}
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder={t('imaging.phModel')}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('imaging.labelModality')}
                    </label>
                    <select
                      value={formData.modality}
                      onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {MODALITY_IDS.map((id) => (
                        <option key={id} value={id}>{getModalityName(id)} ({id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('imaging.labelSerialNumber')}
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder={t('imaging.optional')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('imaging.locationLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t('imaging.phLocation')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('imaging.labelNotes')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('imaging.optionalNotesDevice')}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('imaging.addDevice')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg m-4 p-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Key className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{t('imaging.apiKeyGenerated')}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('imaging.apiKeySaveLongHint')}
                </p>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono text-gray-900 break-all">
                    {newApiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newApiKey)}
                    className="flex-shrink-0 p-2 hover:bg-gray-200 rounded"
                  >
                    {copiedKey ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-900 mb-2">{t('imaging.setupInstructions')}</h3>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li>{t('imaging.setupStep1')}</li>
                  <li className="ml-4 font-mono bg-blue-100 p-2 rounded">
                    POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/dicom/stow
                  </li>
                  <li>{t('imaging.setupStep2')}</li>
                  <li className="ml-4 font-mono bg-blue-100 p-2 rounded">
                    X-Device-API-Key: {newApiKey.substring(0, 20)}...
                  </li>
                  <li>{t('imaging.setupStep3')}</li>
                </ol>
              </div>

              <button
                onClick={() => setShowApiKeyModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('imaging.done')}
              </button>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
