'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { 
  Droplets, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  Edit,
  Save
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface IBloodInventory {
  _id: string;
  unitNumber: string;
  bagNumber: string;
  bloodGroup: string;
  component: string;
  volume: number;
  donorId?: string;
  donorName?: string;
  donationDate: string;
  collectionDate: string;
  expiryDate: string;
  status: string;
  testingStatus: string;
  storageLocation: string;
  temperature?: number;
  hivTest: string;
  hbsAgTest: string;
  hcvTest: string;
  vdrlTest: string;
  malariaTest: string;
  reservedFor?: {
    patientId: string;
    patientName: string;
    reservedAt: string;
    reservedBy: string;
  };
  issuedTo?: {
    patientId: string;
    patientName: string;
    issuedAt: string;
    issuedBy: string;
  };
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function BloodInventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, translationsLoaded } = useTranslations();
  const router = useRouter();
  const [item, setItem] = useState<IBloodInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState({
    hivTest: 'pending',
    hbsAgTest: 'pending',
    hcvTest: 'pending',
    vdrlTest: 'pending',
    malariaTest: 'pending',
  });

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blood-bank/inventory/${id}`);
      if (!response.ok) throw new Error('Failed to fetch item');
      const data = await response.json();
      setItem(data);
      setTestResults({
        hivTest: data.hivTest || 'pending',
        hbsAgTest: data.hbsAgTest || 'pending',
        hcvTest: data.hcvTest || 'pending',
        vdrlTest: data.vdrlTest || 'pending',
        malariaTest: data.malariaTest || 'pending',
      });
    } catch (error) {
      console.error('Error fetching item:', error);
      toast.error(t('bloodBank.fetchError') || 'Failed to fetch blood unit details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTests = async () => {
    if (!item) return;

    try {
      setSaving(true);
      const allNegative = Object.values(testResults).every(v => v === 'negative');
      const anyPositive = Object.values(testResults).some(v => v === 'positive');
      
      const response = await fetch(`/api/blood-bank/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testResults,
          testingStatus: anyPositive ? 'rejected' : allNegative ? 'cleared' : 'tested'
        })
      });

      if (!response.ok) throw new Error('Failed to update');
      
      toast.success(t('bloodBank.testsUpdated') || 'Test results updated');
      setEditing(false);
      fetchItem();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error(t('bloodBank.updateError') || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-blue-100 text-blue-800';
      case 'issued': return 'bg-purple-100 text-purple-800';
      case 'quarantine': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'discarded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTestStatusColor = (status: string) => {
    switch (status) {
      case 'negative': return 'bg-green-100 text-green-800';
      case 'positive': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getBloodGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      'A+': 'bg-red-100 text-red-700',
      'A-': 'bg-red-50 text-red-600',
      'B+': 'bg-blue-100 text-blue-700',
      'B-': 'bg-blue-50 text-blue-600',
      'AB+': 'bg-purple-100 text-purple-700',
      'AB-': 'bg-purple-50 text-purple-600',
      'O+': 'bg-green-100 text-green-700',
      'O-': 'bg-green-50 text-green-600',
    };
    return colors[group] || 'bg-gray-100 text-gray-700';
  };

  const getComponentLabel = (component: string) => {
    const labels: Record<string, string> = {
      'whole-blood': 'Whole Blood',
      'packed-rbc': 'Packed RBC',
      'platelets': 'Platelets',
      'plasma': 'Fresh Frozen Plasma',
      'cryoprecipitate': 'Cryoprecipitate',
    };
    return labels[component] || component;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();
  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return expiry <= sevenDaysFromNow && expiry > new Date();
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.unitDetails') || 'Blood Unit'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.unitDetails') || 'Blood Unit'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!item) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Blood Unit Not Found" description="" dense>
          <div className="text-center py-12">
            <p className="text-gray-600">Blood unit not found</p>
            <Link href="/blood-bank/inventory" className="text-red-600 hover:text-red-700 mt-4 inline-block">
              Back to Inventory
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={item.unitNumber} 
        description={t('bloodBank.unitDetails') || 'Blood Unit Details'} dense>
        <div className="max-w-4xl mx-auto">
          <Link
            href="/blood-bank/inventory"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t('common.back') || 'Back to Inventory'}
          </Link>

          {/* Header Card */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-base font-bold ${getBloodGroupColor(item.bloodGroup)}`}>
                  {item.bloodGroup}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{item.unitNumber}</h2>
                  <p className="text-xs text-gray-600">{getComponentLabel(item.component)} • {item.volume} mL</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${
                  item.testingStatus === 'cleared' ? 'bg-green-100 text-green-800' :
                  item.testingStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.testingStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Unit Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Droplets className="mr-1.5 h-4 w-4 text-red-500" />
                Unit Information
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Bag Number</dt>
                  <dd className="font-medium">{item.bagNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Blood Group</dt>
                  <dd className={`px-2 py-0.5 rounded font-bold ${getBloodGroupColor(item.bloodGroup)}`}>
                    {item.bloodGroup}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Component</dt>
                  <dd className="font-medium">{getComponentLabel(item.component)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Volume</dt>
                  <dd className="font-medium">{item.volume} mL</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Storage Location</dt>
                  <dd className="font-medium">{item.storageLocation}</dd>
                </div>
                {item.temperature && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Temperature</dt>
                    <dd className="font-medium">{item.temperature}°C</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Dates */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Calendar className="mr-1.5 h-4 w-4 text-blue-500" />
                Important Dates
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Collection Date</dt>
                  <dd className="font-medium">{formatDate(item.collectionDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Donation Date</dt>
                  <dd className="font-medium">{formatDate(item.donationDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Expiry Date</dt>
                  <dd className={`font-medium flex items-center ${
                    isExpired(item.expiryDate) ? 'text-red-600' :
                    isExpiringSoon(item.expiryDate) ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {isExpired(item.expiryDate) ? (
                      <XCircle className="h-4 w-4 mr-1" />
                    ) : isExpiringSoon(item.expiryDate) ? (
                      <AlertTriangle className="h-4 w-4 mr-1" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    {formatDate(item.expiryDate)}
                  </dd>
                </div>
                {item.donorName && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Donor</dt>
                    <dd className="font-medium">{item.donorName}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Test Results */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Test Results</h3>
                {item.testingStatus === 'pending' && !editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Update Tests
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {[
                  { key: 'hivTest', label: 'HIV' },
                  { key: 'hbsAgTest', label: 'HBsAg' },
                  { key: 'hcvTest', label: 'HCV' },
                  { key: 'vdrlTest', label: 'VDRL' },
                  { key: 'malariaTest', label: 'Malaria' },
                ].map(test => (
                  <div key={test.key} className="text-center">
                    <p className="mb-1 text-xs text-gray-500">{test.label}</p>
                    {editing ? (
                      <select
                        value={testResults[test.key as keyof typeof testResults]}
                        onChange={(e) => setTestResults(prev => ({ ...prev, [test.key]: e.target.value }))}
                        className="h-9 w-full rounded-md border border-gray-200 px-1.5 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="negative">Negative</option>
                        <option value="positive">Positive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${getTestStatusColor(item[test.key as keyof IBloodInventory] as string)}`}>
                        {(item[test.key as keyof IBloodInventory] as string) || 'pending'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {editing && (
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateTests}
                    disabled={saving}
                    className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Results
                  </button>
                </div>
              )}
            </div>

            {/* Issued/Reserved Information */}
            {(item.issuedTo || item.reservedFor) && (
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm lg:col-span-2">
                <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <User className="mr-1.5 h-4 w-4 text-purple-500" />
                  {item.issuedTo ? 'Issued To' : 'Reserved For'}
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Patient Name</dt>
                    <dd className="font-medium">
                      {item.issuedTo?.patientName || item.reservedFor?.patientName}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{item.issuedTo ? 'Issued At' : 'Reserved At'}</dt>
                    <dd className="font-medium">
                      {formatDateTime(item.issuedTo?.issuedAt || item.reservedFor?.reservedAt || '')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{item.issuedTo ? 'Issued By' : 'Reserved By'}</dt>
                    <dd className="font-medium">
                      {item.issuedTo?.issuedBy || item.reservedFor?.reservedBy}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-1.5 text-sm font-semibold text-gray-900">Notes</h3>
              <p className="text-sm text-gray-600">{item.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-4 text-[11px] text-gray-500">
            <p>Created by: {item.createdBy} on {formatDateTime(item.createdAt)}</p>
            <p>Last updated: {formatDateTime(item.updatedAt)}</p>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
