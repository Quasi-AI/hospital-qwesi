'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import {
  Bed as BedIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Wrench,
  User
} from 'lucide-react';

interface Bed {
  _id: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  wardType: string;
  type: string;
  status: string;
  currentPatientName?: string;
  features: string[];
  dailyRate: number;
  position?: string;
  notes?: string;
  isActive: boolean;
}

interface Ward {
  _id: string;
  name: string;
  wardNumber: string;
}

export default function BedsPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchWards();
  }, []);

  useEffect(() => {
    fetchBeds();
  }, [filterWard, filterStatus]);

  const fetchWards = async () => {
    try {
      const response = await fetch('/api/inpatient/wards');
      if (response.ok) {
        const data = await response.json();
        setWards(data);
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchBeds = async () => {
    try {
      const params = new URLSearchParams();
      if (filterWard) params.append('wardId', filterWard);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`/api/inpatient/beds?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBeds(data);
      }
    } catch (error) {
      console.error('Error fetching beds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/inpatient/beds/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setBeds(beds.filter(bed => bed._id !== id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting bed:', error);
    }
  };

  const filteredBeds = beds.filter(bed =>
    bed.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bed.wardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bed.currentPatientName && bed.currentPatientName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'available': 'bg-green-100 text-green-800',
      'occupied': 'bg-blue-100 text-blue-800',
      'reserved': 'bg-yellow-100 text-yellow-800',
      'maintenance': 'bg-orange-100 text-orange-800',
      'cleaning': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'occupied': return <User className="h-4 w-4" />;
      case 'reserved': return <Clock className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      case 'cleaning': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getBedTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'standard': 'Standard',
      'electric': 'Electric',
      'icu': 'ICU',
      'pediatric': 'Pediatric',
      'bariatric': 'Bariatric',
      'stretcher': 'Stretcher',
    };
    return labels[type] || type;
  };

  // Summary stats
  const totalBeds = beds.length;
  const availableBeds = beds.filter(b => b.status === 'available').length;
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const maintenanceBeds = beds.filter(b => b.status === 'maintenance' || b.status === 'cleaning').length;

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inpatient.beds')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inpatient.beds')} description={t('inpatient.bedsDescription')} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('inpatient.searchBeds')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterWard}
                  onChange={(e) => setFilterWard(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('inpatient.allWards')}</option>
                  {wards.map(ward => (
                    <option key={ward._id} value={ward._id}>{ward.name}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('inpatient.allStatuses')}</option>
                  <option value="available">{t('inpatient.bedStatusLabels.available')}</option>
                  <option value="occupied">{t('inpatient.bedStatusLabels.occupied')}</option>
                  <option value="reserved">{t('inpatient.bedStatusLabels.reserved')}</option>
                  <option value="maintenance">{t('inpatient.bedStatusLabels.maintenance')}</option>
                  <option value="cleaning">{t('inpatient.bedStatusLabels.cleaning')}</option>
                </select>
              </div>
            </div>
            <Link
              href="/inpatient/beds/new"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t('inpatient.addBed')}</span>
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <BedIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.totalBeds')}</p>
                  <p className="text-lg sm:text-xl font-bold">{totalBeds}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.available')}</p>
                  <p className="text-lg sm:text-xl font-bold">{availableBeds}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.occupied')}</p>
                  <p className="text-lg sm:text-xl font-bold">{occupiedBeds}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                  <Wrench className="h-4 w-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.underMaintenance')}</p>
                  <p className="text-lg sm:text-xl font-bold">{maintenanceBeds}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Beds Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredBeds.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 p-8 text-center">
              <BedIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">{t('inpatient.noBeds')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('inpatient.noBedsDescription')}</p>
              <Link
                href="/inpatient/beds/new"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>{t('inpatient.addBed')}</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              {filteredBeds.map((bed) => (
                <div
                  key={bed._id}
                  className={`bg-white rounded-lg border border-gray-100 p-3 hover:shadow-md transition-shadow ${
                    bed.status === 'occupied' ? 'border-l-4 border-blue-500' :
                    bed.status === 'available' ? 'border-l-4 border-green-500' :
                    bed.status === 'maintenance' ? 'border-l-4 border-orange-500' :
                    'border-l-4 border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 pr-2">
                      <h3 className="font-semibold text-base">{bed.bedNumber}</h3>
                      <p className="text-xs text-gray-500 truncate">{bed.wardName}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bed.status)}`}>
                      {getStatusIcon(bed.status)}
                      {t(`inpatient.bedStatusLabels.${bed.status}`)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('inpatient.bedType')}:</span>
                      <span>{getBedTypeLabel(bed.type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('inpatient.dailyRate')}:</span>
                      <span>{formatCurrency(bed.dailyRate)}</span>
                    </div>
                    {bed.position && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('inpatient.position')}:</span>
                        <span>{bed.position}</span>
                      </div>
                    )}
                    {bed.currentPatientName && (
                      <div className="mt-1.5 p-1.5 bg-blue-50 rounded-md">
                        <p className="text-xs text-gray-500">{t('inpatient.currentPatient')}:</p>
                        <p className="font-medium text-blue-700">{bed.currentPatientName}</p>
                      </div>
                    )}
                  </div>

                  {bed.features && bed.features.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {bed.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {feature}
                        </span>
                      ))}
                      {bed.features.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          +{bed.features.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t flex justify-end gap-1">
                    <Link
                      href={`/inpatient/beds/${bed._id}/edit`}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    {deleteConfirm === bed._id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(bed._id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                        >
                          {t('common.confirm')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-gray-200 rounded"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(bed._id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                        disabled={bed.status === 'occupied'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
