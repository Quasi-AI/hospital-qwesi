'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { 
  Building2, 
  Plus, 
  Search, 
  Bed,
  Users,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface Ward {
  _id: string;
  wardNumber: string;
  hospitalName?: string;
  name: string;
  type: string;
  floor: number;
  building?: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  dailyRate: number;
  isActive: boolean;
  inchargeName?: string;
}

export default function WardsPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');

  useEffect(() => {
    fetchWards();
  }, [filterType, filterActive]);

  const fetchWards = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterActive) params.append('isActive', filterActive);

      const response = await fetch(`/api/inpatient/wards?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWards(data);
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('inpatient.confirmDeleteWard'))) return;

    try {
      const response = await fetch(`/api/inpatient/wards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWards(wards.filter(w => w._id !== id));
      } else {
        const data = await response.json();
        alert(data.error || t('inpatient.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting ward:', error);
    }
  };

  const filteredWards = wards.filter(ward => 
    ward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ward.wardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ward.hospitalName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'general': 'bg-blue-100 text-blue-800',
      'private': 'bg-purple-100 text-purple-800',
      'semi-private': 'bg-indigo-100 text-indigo-800',
      'icu': 'bg-red-100 text-red-800',
      'nicu': 'bg-pink-100 text-pink-800',
      'picu': 'bg-rose-100 text-rose-800',
      'ccu': 'bg-orange-100 text-orange-800',
      'emergency': 'bg-red-100 text-red-800',
      'maternity': 'bg-pink-100 text-pink-800',
      'pediatric': 'bg-teal-100 text-teal-800',
      'surgical': 'bg-amber-100 text-amber-800',
      'orthopedic': 'bg-lime-100 text-lime-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getOccupancyColor = (occupied: number, total: number) => {
    if (total === 0) return 'bg-gray-200';
    const percentage = (occupied / total) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inpatient.wards')} description={t('inpatient.wardsDescription')} dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('inpatient.wards')}
        description={t('inpatient.wardsDescription')} dense>
        <div className="space-y-3">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('inpatient.searchWards')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('inpatient.allTypes')}</option>
                  <option value="general">{t('inpatient.wardTypes.general')}</option>
                  <option value="private">{t('inpatient.wardTypes.private')}</option>
                  <option value="semi-private">{t('inpatient.wardTypes.semi-private')}</option>
                  <option value="icu">{t('inpatient.wardTypes.icu')}</option>
                  <option value="nicu">{t('inpatient.wardTypes.nicu')}</option>
                  <option value="ccu">{t('inpatient.wardTypes.ccu')}</option>
                  <option value="emergency">{t('inpatient.wardTypes.emergency')}</option>
                  <option value="maternity">{t('inpatient.wardTypes.maternity')}</option>
                  <option value="pediatric">{t('inpatient.wardTypes.pediatric')}</option>
                  <option value="surgical">{t('inpatient.wardTypes.surgical')}</option>
                </select>

                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('inpatient.allStatus')}</option>
                  <option value="true">{t('inpatient.active')}</option>
                  <option value="false">{t('inpatient.inactive')}</option>
                </select>
              </div>
            </div>

            <Link
              href="/inpatient/wards/new"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t('inpatient.addWard')}</span>
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.totalWards')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{wards.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Bed className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.totalBeds')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {wards.reduce((sum, w) => sum + w.totalBeds, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.occupiedBeds')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {wards.reduce((sum, w) => sum + w.occupiedBeds, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <Bed className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.availableBeds')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {wards.reduce((sum, w) => sum + w.availableBeds, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Wards Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredWards.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
              <Building2 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-1">{t('inpatient.noWards')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('inpatient.noWardsDescription')}</p>
              <Link
                href="/inpatient/wards/new"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{t('inpatient.addWard')}</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {filteredWards.map((ward) => (
                <div
                  key={ward._id}
                  className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 pr-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">{ward.name}</h3>
                        <p className="text-xs text-gray-500">{ward.wardNumber}</p>
                        {ward.hospitalName && <p className="text-xs text-gray-500 truncate">{ward.hospitalName}</p>}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(ward.type)}`}>
                        {t(`inpatient.wardTypes.${ward.type}`)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t('inpatient.floor')}:</span>
                        <span className="font-medium">{ward.floor}</span>
                      </div>
                      
                      {ward.building && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{t('inpatient.building')}:</span>
                          <span className="font-medium">{ward.building}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t('inpatient.dailyRate')}:</span>
                        <span className="font-medium">{formatCurrency(ward.dailyRate)}</span>
                      </div>

                      {/* Bed Occupancy */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-gray-500">{t('inpatient.bedOccupancy')}</span>
                          <span className="font-medium">
                            {ward.occupiedBeds}/{ward.totalBeds}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${getOccupancyColor(ward.occupiedBeds, ward.totalBeds)}`}
                            style={{ width: `${ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {ward.inchargeName && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{t('inpatient.incharge')}:</span>
                          <span className="font-medium">{ward.inchargeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ward.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {ward.isActive ? t('inpatient.active') : t('inpatient.inactive')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/inpatient/wards/${ward._id}`}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title={t('common.view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/inpatient/wards/${ward._id}/edit`}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(ward._id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
