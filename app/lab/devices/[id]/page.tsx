'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cpu,
  ArrowLeft,
  Save,
  Key,
  Trash2,
  Settings,
  Wifi,
  WifiOff,
  AlertTriangle,
  Plus,
  Edit,
  X,
  Copy,
  Check,
  RefreshCw,
  Activity,
  Clock,
  Database,
  Link as LinkIcon,
  Info,
  List,
  BarChart3,
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';

interface ParameterMapping {
  deviceCode: string;
  testName: string;
  unit: string;
  normalRange: string;
  criticalLow?: string;
  criticalHigh?: string;
}

interface LabDevice {
  _id: string;
  deviceCode: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  category: string;
  location: string;
  profileId?: string;
  profileName?: string;
  isCustomProfile: boolean;
  isActive: boolean;
  connectionStatus: string;
  lastSeenAt?: string;
  lastResultAt?: string;
  totalResultsReceived: number;
  resultsToday: number;
  apiKeyPrefix: string;
  parameterMappings: ParameterMapping[];
  protocolType?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'info' | 'mappings' | 'connection' | 'stats';

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<LabDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [hasChanges, setHasChanges] = useState(false);

  // Editable fields
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    serialNumber: '',
    notes: '',
  });

  // Parameter mappings
  const [mappings, setMappings] = useState<ParameterMapping[]>([]);
  const [editingMapping, setEditingMapping] = useState<number | null>(null);
  const [newMapping, setNewMapping] = useState<ParameterMapping>({
    deviceCode: '',
    testName: '',
    unit: '',
    normalRange: '',
    criticalLow: '',
    criticalHigh: '',
  });
  const [showAddMapping, setShowAddMapping] = useState(false);

  // API Key modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetchDevice();
  }, [deviceId]);

  const fetchDevice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lab/devices/${deviceId}`);
      if (response.ok) {
        const data = await response.json();
        setDevice(data.device);
        setFormData({
          name: data.device.name || '',
          location: data.device.location || '',
          serialNumber: data.device.serialNumber || '',
          notes: data.device.notes || '',
        });
        setMappings(data.device.parameterMappings || []);
      } else {
        router.push('/lab/devices');
      }
    } catch (error) {
      console.error('Error fetching device:', error);
      router.push('/lab/devices');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!device) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/lab/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customMappings: mappings,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDevice(data.device);
        setHasChanges(false);
        alert('Device saved successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save device');
      }
    } catch (error) {
      console.error('Error saving device:', error);
      alert('Failed to save device');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will stop working immediately.')) {
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
        setDevice(data.device);
      }
    } catch (error) {
      console.error('Error regenerating key:', error);
      alert('Failed to regenerate API key');
    }
  };

  const handleToggleActive = async () => {
    if (!device) return;

    try {
      const response = await fetch(`/api/lab/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !device.isActive }),
      });

      if (response.ok) {
        const data = await response.json();
        setDevice(data.device);
      }
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/lab/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/lab/devices');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Failed to delete device');
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  };

  const handleAddMapping = () => {
    if (!newMapping.deviceCode || !newMapping.testName) {
      alert('Device Code and Test Name are required');
      return;
    }

    setMappings([...mappings, { ...newMapping }]);
    setNewMapping({
      deviceCode: '',
      testName: '',
      unit: '',
      normalRange: '',
      criticalLow: '',
      criticalHigh: '',
    });
    setShowAddMapping(false);
    setHasChanges(true);
  };

  const handleUpdateMapping = (index: number, field: keyof ParameterMapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
    setHasChanges(true);
  };

  const handleDeleteMapping = (index: number) => {
    if (!confirm('Delete this parameter mapping?')) return;
    const updated = mappings.filter((_, i) => i !== index);
    setMappings(updated);
    setHasChanges(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      hematology: 'Hematology',
      biochemistry: 'Biochemistry',
      immunology: 'Immunoassay',
      urinalysis: 'Urinalysis',
      coagulation: 'Coagulation',
      bloodgas: 'Blood Gas',
      electrolyte: 'Electrolyte',
      esr: 'ESR',
      hba1c: 'HbA1c',
      microbiology: 'Microbiology',
      poc: 'Point of Care',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const tabs = [
    { id: 'info', label: 'Device Info', icon: Info },
    { id: 'mappings', label: 'Parameter Mappings', icon: List },
    { id: 'connection', label: 'Connection', icon: LinkIcon },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout dense>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!device) {
    return (
      <ProtectedRoute>
        <SidebarLayout dense>
          <div className="text-center py-12">
            <p className="text-gray-600">Device not found</p>
            <Link href="/lab/devices" className="text-blue-600 hover:underline mt-4 inline-block">
              Back to Devices
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout dense>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/lab/devices"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
                    {device.connectionStatus === 'online' ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-gray-400" />
                    )}
                    {!device.isActive && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {device.deviceCode} • {device.manufacturer} {device.model}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              <button
                onClick={handleToggleActive}
                className={`p-2 rounded-lg ${
                  device.isActive
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={device.isActive ? 'Disable Device' : 'Enable Device'}
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                title="Delete Device"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'mappings' && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {mappings.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Device Info Tab */}
            {activeTab === 'info' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleFormChange('location', e.target.value)}
                      placeholder="e.g., Lab Room A"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device Code
                    </label>
                    <input
                      type="text"
                      value={device.deviceCode}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => handleFormChange('serialNumber', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={device.manufacturer}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={device.model}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={getCategoryLabel(device.category)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>Profile: {device.profileName || 'Custom'}</span>
                    <span>Created: {new Date(device.createdAt).toLocaleDateString()}</span>
                    <span>Last Updated: {new Date(device.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Parameter Mappings Tab */}
            {activeTab === 'mappings' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Parameter Mappings</h3>
                    <p className="text-sm text-gray-500">
                      Map device codes to standardized test names
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddMapping(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Mapping
                  </button>
                </div>

                {/* Add Mapping Form */}
                {showAddMapping && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-900">Add New Mapping</h4>
                      <button onClick={() => setShowAddMapping(false)} className="text-blue-600 hover:text-blue-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      <input
                        type="text"
                        placeholder="Device Code *"
                        value={newMapping.deviceCode}
                        onChange={(e) => setNewMapping({ ...newMapping, deviceCode: e.target.value.toUpperCase() })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Test Name *"
                        value={newMapping.testName}
                        onChange={(e) => setNewMapping({ ...newMapping, testName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={newMapping.unit}
                        onChange={(e) => setNewMapping({ ...newMapping, unit: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Normal Range"
                        value={newMapping.normalRange}
                        onChange={(e) => setNewMapping({ ...newMapping, normalRange: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Critical Low"
                        value={newMapping.criticalLow}
                        onChange={(e) => setNewMapping({ ...newMapping, criticalLow: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Critical High"
                          value={newMapping.criticalHigh}
                          onChange={(e) => setNewMapping({ ...newMapping, criticalHigh: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={handleAddMapping}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mappings Table */}
                {mappings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No parameter mappings configured</p>
                    <p className="text-sm mt-1">Add mappings to convert device codes to standard test names</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Device Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Test Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Unit
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Normal Range
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Critical Low
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Critical High
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {mappings.map((mapping, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {editingMapping === index ? (
                                <input
                                  type="text"
                                  value={mapping.deviceCode}
                                  onChange={(e) => handleUpdateMapping(index, 'deviceCode', e.target.value.toUpperCase())}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                                  {mapping.deviceCode}
                                </code>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingMapping === index ? (
                                <input
                                  type="text"
                                  value={mapping.testName}
                                  onChange={(e) => handleUpdateMapping(index, 'testName', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                <span className="text-sm text-gray-900">{mapping.testName}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingMapping === index ? (
                                <input
                                  type="text"
                                  value={mapping.unit}
                                  onChange={(e) => handleUpdateMapping(index, 'unit', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                <span className="text-sm text-gray-600">{mapping.unit || '-'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingMapping === index ? (
                                <input
                                  type="text"
                                  value={mapping.normalRange}
                                  onChange={(e) => handleUpdateMapping(index, 'normalRange', e.target.value)}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                <span className="text-sm text-gray-600">{mapping.normalRange || '-'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingMapping === index ? (
                                <input
                                  type="text"
                                  value={mapping.criticalLow || ''}
                                  onChange={(e) => handleUpdateMapping(index, 'criticalLow', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                <span className={`text-sm ${mapping.criticalLow ? 'text-orange-600' : 'text-gray-400'}`}>
                                  {mapping.criticalLow || '-'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingMapping === index ? (
                                <input
                                  type="text"
                                  value={mapping.criticalHigh || ''}
                                  onChange={(e) => handleUpdateMapping(index, 'criticalHigh', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                <span className={`text-sm ${mapping.criticalHigh ? 'text-red-600' : 'text-gray-400'}`}>
                                  {mapping.criticalHigh || '-'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {editingMapping === index ? (
                                  <button
                                    onClick={() => setEditingMapping(null)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingMapping(index)}
                                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteMapping(index)}
                                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
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
            )}

            {/* Connection Tab */}
            {activeTab === 'connection' && (
              <div className="p-6 space-y-6">
                {/* Connection Status */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    device.connectionStatus === 'online' ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    {device.connectionStatus === 'online' ? (
                      <Wifi className="h-6 w-6 text-green-600" />
                    ) : (
                      <WifiOff className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {device.connectionStatus === 'online' ? 'Connected' : 'Disconnected'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last seen: {formatLastSeen(device.lastSeenAt)}
                    </p>
                  </div>
                </div>

                {/* API Key Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API Key</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 px-4 py-3 bg-gray-100 rounded-lg">
                      <code className="text-sm text-gray-600">{device.apiKeyPrefix}</code>
                    </div>
                    <button
                      onClick={handleRegenerateKey}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    The full API key is only shown once when generated. If lost, regenerate a new one.
                  </p>
                </div>

                {/* Setup Instructions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Setup Instructions</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">REST API / FHIR</h4>
                      <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                        <li>Configure endpoint: <code className="bg-blue-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/lab/device-results</code></li>
                        <li>Add header: <code className="bg-blue-100 px-1 rounded">X-Device-API-Key: [your-api-key]</code></li>
                        <li>Send results as JSON POST request</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">HL7 v2 (MLLP)</h4>
                      <ol className="list-decimal list-inside text-sm text-purple-800 space-y-1">
                        <li>Configure device code to match your MSH-3 (Sending Application)</li>
                        <li>Connect to: <code className="bg-purple-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.hostname : 'server-ip'}:2575</code></li>
                        <li>Protocol: HL7 v2.x with MLLP framing</li>
                        <li>Send ORU^R01 messages</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-2">ASTM E1381</h4>
                      <ol className="list-decimal list-inside text-sm text-orange-800 space-y-1">
                        <li>Configure device code to match your Header sender name</li>
                        <li>Connect to: <code className="bg-orange-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.hostname : 'server-ip'}:5000</code></li>
                        <li>Protocol: ASTM E1381/E1394 (LIS2-A2)</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="p-6">
                <div className="grid grid-cols-4 gap-6 mb-8">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{device.resultsToday}</p>
                        <p className="text-sm text-blue-800">Results Today</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">{device.totalResultsReceived}</p>
                        <p className="text-sm text-green-800">Total Results</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-lg font-bold text-purple-600">{formatLastSeen(device.lastResultAt)}</p>
                        <p className="text-sm text-purple-800">Last Result</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <List className="h-8 w-8 text-gray-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-600">{mappings.length}</p>
                        <p className="text-sm text-gray-800">Parameters</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>View recent results in the Incoming Results page</p>
                  <Link
                    href="/lab/incoming"
                    className="text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Go to Incoming Results
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

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
                    <h2 className="text-xl font-semibold text-gray-900">New API Key Generated</h2>
                    <p className="text-sm text-gray-500">Save this key - it won&apos;t be shown again!</p>
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

                <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Important</p>
                      <p>The old API key has been invalidated. Update your device configuration with this new key.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setNewApiKey('');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
