'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  Droplets,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IBloodInventory {
  _id: string;
  unitNumber: string;
  bagNumber: string;
  bloodGroup: string;
  component: string;
  volume: number;
  donorName?: string;
  donationDate: string;
  expiryDate: string;
  status: string;
  testingStatus: string;
  storageLocation: string;
  hivTest: string;
  hbsAgTest: string;
  hcvTest: string;
  vdrlTest: string;
  malariaTest: string;
}

export default function BloodInventoryPage() {
  const { t, translationsLoaded } = useTranslations();
  const [inventory, setInventory] = useState<IBloodInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [componentFilter, setComponentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<IBloodInventory | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [bloodGroupFilter, componentFilter, statusFilter]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (bloodGroupFilter !== 'all') params.append('bloodGroup', bloodGroupFilter);
      if (componentFilter !== 'all') params.append('component', componentFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/blood-bank/inventory?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error(t('bloodBank.fetchError') || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.donorName && item.donorName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'reserved':
        return 'bg-blue-100 text-blue-800';
      case 'issued':
        return 'bg-purple-100 text-purple-800';
      case 'quarantine':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'discarded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTestingStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'tested':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      'plasma': 'Plasma',
      'cryoprecipitate': 'Cryoprecipitate',
    };
    return labels[component] || component;
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return expiry <= sevenDaysFromNow && expiry > new Date();
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const handleUpdateTests = async (unitId: string, testResults: Record<string, string>) => {
    try {
      const allNegative = Object.values(testResults).every(v => v === 'negative');
      const anyPositive = Object.values(testResults).some(v => v === 'positive');
      
      const response = await fetch(`/api/blood-bank/inventory/${unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testResults,
          testingStatus: anyPositive ? 'rejected' : allNegative ? 'cleared' : 'tested'
        })
      });

      if (!response.ok) throw new Error('Failed to update tests');
      
      toast.success(t('bloodBank.testsUpdated') || 'Test results updated');
      setShowTestModal(false);
      setSelectedUnit(null);
      fetchInventory();
    } catch (error) {
      console.error('Error updating tests:', error);
      toast.error(t('bloodBank.updateError') || 'Failed to update test results');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('bloodBank.confirmDelete') || 'Are you sure you want to delete this blood unit?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blood-bank/inventory/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');
      
      toast.success(t('bloodBank.deleted') || 'Blood unit deleted');
      fetchInventory();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(t('bloodBank.deleteError') || 'Failed to delete blood unit');
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.inventory') || 'Blood Inventory'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('bloodBank.inventory') || 'Blood Inventory'} 
        description={t('bloodBank.inventoryDescription') || 'Manage blood units and stock levels'} dense>
        {/* Filters */}
        <div className="mb-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            <div className="relative w-full flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('bloodBank.searchInventory') || 'Search by unit number, bag number...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">{t('bloodBank.allGroups') || 'All Blood Groups'}</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>

              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">{t('bloodBank.allComponents') || 'All Components'}</option>
                <option value="whole-blood">Whole Blood</option>
                <option value="packed-rbc">Packed RBC</option>
                <option value="platelets">Platelets</option>
                <option value="plasma">Plasma</option>
                <option value="cryoprecipitate">Cryoprecipitate</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">{t('bloodBank.allStatuses') || 'All Statuses'}</option>
                <option value="available">Available</option>
                <option value="quarantine">Quarantine</option>
                <option value="reserved">Reserved</option>
                <option value="issued">Issued</option>
                <option value="expired">Expired</option>
              </select>

              <Link
                href="/blood-bank/inventory/new"
                className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t('bloodBank.addUnit') || 'Add Unit'}
              </Link>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="py-10 text-center">
              <Droplets className="mx-auto h-9 w-9 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {t('bloodBank.noInventory') || 'No blood units found'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {t('bloodBank.noInventoryDesc') || 'Add blood units to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      {t('bloodBank.unitDetails') || 'Unit Details'}
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      {t('bloodBank.bloodGroup') || 'Blood Group'}
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      {t('bloodBank.component') || 'Component'}
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      {t('bloodBank.expiry') || 'Expiry'}
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      {t('bloodBank.status') || 'Status'}
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      {t('bloodBank.testing') || 'Testing'}
                    </th>
                    <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      {t('common.actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredInventory.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.unitNumber}</p>
                          <p className="text-xs text-gray-500">{item.bagNumber}</p>
                          {item.donorName && (
                            <p className="text-[11px] text-gray-400">Donor: {item.donorName}</p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${getBloodGroupColor(item.bloodGroup)}`}>
                          {item.bloodGroup}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="text-sm text-gray-900">{getComponentLabel(item.component)}</span>
                        <p className="text-xs text-gray-500">{item.volume} mL</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center">
                          {isExpired(item.expiryDate) ? (
                            <XCircle className="mr-1 h-4 w-4 text-red-500" />
                          ) : isExpiringSoon(item.expiryDate) ? (
                            <AlertTriangle className="mr-1 h-4 w-4 text-yellow-500" />
                          ) : (
                            <CheckCircle className="mr-1 h-4 w-4 text-green-500" />
                          )}
                          <span className={`text-sm ${isExpired(item.expiryDate) ? 'text-red-600' : isExpiringSoon(item.expiryDate) ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${getTestingStatusColor(item.testingStatus)}`}>
                          {item.testingStatus}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            href={`/blood-bank/inventory/${item._id}`}
                            className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-900"
                            title={t('common.view') || 'View'}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {item.testingStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUnit(item);
                                setShowTestModal(true);
                              }}
                              className="rounded-md p-1.5 text-purple-600 hover:bg-purple-50 hover:text-purple-900"
                              title={t('bloodBank.updateTests') || 'Update Tests'}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {item.status !== 'issued' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item._id)}
                              className="rounded-md p-1.5 text-red-600 hover:bg-red-50 hover:text-red-900"
                              title={t('common.delete') || 'Delete'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Test Results Modal */}
        {showTestModal && selectedUnit && (
          <TestResultsModal
            unit={selectedUnit}
            onClose={() => {
              setShowTestModal(false);
              setSelectedUnit(null);
            }}
            onSubmit={(results) => handleUpdateTests(selectedUnit._id, results)}
            t={t}
          />
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}

function TestResultsModal({ 
  unit, 
  onClose, 
  onSubmit, 
  t 
}: { 
  unit: IBloodInventory; 
  onClose: () => void; 
  onSubmit: (results: Record<string, string>) => void;
  t: (key: string) => string;
}) {
  const [results, setResults] = useState({
    hivTest: unit.hivTest || 'pending',
    hbsAgTest: unit.hbsAgTest || 'pending',
    hcvTest: unit.hcvTest || 'pending',
    vdrlTest: unit.vdrlTest || 'pending',
    malariaTest: unit.malariaTest || 'pending',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          {t('bloodBank.updateTestResults') || 'Update Test Results'}
        </h3>
        <p className="mb-3 text-xs text-gray-600">
          Unit: <span className="font-medium">{unit.unitNumber}</span> ({unit.bloodGroup})
        </p>

        <div className="space-y-2">
          {[
            { key: 'hivTest', label: 'HIV Test' },
            { key: 'hbsAgTest', label: 'Hepatitis B (HBsAg)' },
            { key: 'hcvTest', label: 'Hepatitis C (HCV)' },
            { key: 'vdrlTest', label: 'Syphilis (VDRL)' },
            { key: 'malariaTest', label: 'Malaria' },
          ].map(test => (
            <div key={test.key} className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-gray-700">{test.label}</label>
              <select
                value={results[test.key as keyof typeof results]}
                onChange={(e) => setResults(prev => ({ ...prev, [test.key]: e.target.value }))}
                className="h-9 rounded-md border border-gray-200 px-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="pending">Pending</option>
                <option value="negative">Negative</option>
                <option value="positive">Positive</option>
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(results)}
            className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('common.save') || 'Save Results'}
          </button>
        </div>
      </div>
    </div>
  );
}
