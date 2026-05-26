'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { 
  ArrowLeft, 
  Edit, 
  Building2, 
  Bed as BedIcon,
  Plus,
  User,
  AlertCircle,
  Wrench,
  Sparkles
} from 'lucide-react';

interface Bed {
  _id: string;
  bedNumber: string;
  type: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning';
  currentPatientName?: string;
  dailyRate: number;
  features: string[];
  position?: string;
}

interface Ward {
  _id: string;
  wardNumber: string;
  name: string;
  type: string;
  floor: number;
  building?: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  dailyRate: number;
  amenities: string[];
  description?: string;
  isActive: boolean;
  inchargeName?: string;
  contactNumber?: string;
}

export default function WardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [ward, setWard] = useState<Ward | null>(null);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWardDetails();
  }, [resolvedParams.id]);

  const fetchWardDetails = async () => {
    try {
      const response = await fetch(`/api/inpatient/wards/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setWard(data.ward);
        setBeds(data.beds || []);
      }
    } catch (error) {
      console.error('Error fetching ward:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'available': 'bg-green-100 text-green-800 border-green-300',
      'occupied': 'bg-red-100 text-red-800 border-red-300',
      'reserved': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'maintenance': 'bg-orange-100 text-orange-800 border-orange-300',
      'cleaning': 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <BedIcon className="h-4 w-4" />;
      case 'occupied':
        return <User className="h-4 w-4" />;
      case 'reserved':
        return <AlertCircle className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'cleaning':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <BedIcon className="h-4 w-4" />;
    }
  };

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inpatient.wardDetails')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!ward) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inpatient.wardDetails')} description="" dense>
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t('inpatient.wardNotFound')}</p>
            <Link href="/inpatient/wards" className="text-blue-600 hover:underline mt-2 inline-block">
              {t('common.back')}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={ward.name}
        description={ward.wardNumber} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/inpatient/wards"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 w-fit"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{t('common.back')}</span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/inpatient/beds/new?wardId=${ward._id}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{t('inpatient.addBed')}</span>
              </Link>
              <Link
                href={`/inpatient/wards/${ward._id}/edit`}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4 shrink-0" />
                <span>{t('common.edit')}</span>
              </Link>
            </div>
          </div>

          {/* Ward Info Card */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">{ward.name}</h2>
                <p className="text-sm text-gray-500">{ward.wardNumber}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    ward.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {ward.isActive ? t('inpatient.active') : t('inpatient.inactive')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-xs text-gray-500">{t('inpatient.wardType')}</p>
                <p className="text-sm font-medium">{t(`inpatient.wardTypes.${ward.type}`)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('inpatient.floor')}</p>
                <p className="text-sm font-medium">{ward.floor}</p>
              </div>
              {ward.building && (
                <div>
                  <p className="text-xs text-gray-500">{t('inpatient.building')}</p>
                  <p className="text-sm font-medium">{ward.building}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">{t('inpatient.dailyRate')}</p>
                <p className="text-sm font-medium">{formatCurrency(ward.dailyRate)}</p>
              </div>
              {ward.inchargeName && (
                <div>
                  <p className="text-xs text-gray-500">{t('inpatient.incharge')}</p>
                  <p className="text-sm font-medium">{ward.inchargeName}</p>
                </div>
              )}
              {ward.contactNumber && (
                <div>
                  <p className="text-xs text-gray-500">{t('inpatient.contactNumber')}</p>
                  <p className="text-sm font-medium">{ward.contactNumber}</p>
                </div>
              )}
            </div>

            {ward.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-0.5">{t('inpatient.description')}</p>
                <p className="text-sm text-gray-700">{ward.description}</p>
              </div>
            )}

            {ward.amenities && ward.amenities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1.5">{t('inpatient.amenities')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ward.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bed Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <BedIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.totalBeds')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{ward.totalBeds}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <BedIcon className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.availableBeds')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{ward.availableBeds}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.occupiedBeds')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{ward.occupiedBeds}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.occupancy')}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {ward.totalBeds > 0 ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Beds Grid */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">{t('inpatient.bedsInWard')}</h3>
              <Link
                href={`/inpatient/beds/new?wardId=${ward._id}`}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-fit"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('inpatient.addBed')}</span>
              </Link>
            </div>

            {beds.length === 0 ? (
              <div className="text-center py-8">
                <BedIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t('inpatient.noBeds')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {beds.map((bed) => (
                  <Link
                    key={bed._id}
                    href={`/inpatient/beds/${bed._id}/edit`}
                    className={`p-2.5 sm:p-3 rounded-md border-2 text-center transition-all hover:shadow-md ${getStatusColor(bed.status)}`}
                  >
                    <div className="flex justify-center mb-1">
                      {getStatusIcon(bed.status)}
                    </div>
                    <p className="text-sm font-semibold">{bed.bedNumber}</p>
                    <p className="text-xs mt-1 capitalize">{t(`inpatient.bedStatus.${bed.status}`)}</p>
                    {bed.currentPatientName && (
                      <p className="text-xs mt-1 truncate" title={bed.currentPatientName}>
                        {bed.currentPatientName}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">{t('inpatient.legend')}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded shrink-0"></div>
                  <span className="text-xs">{t('inpatient.bedStatus.available')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded shrink-0"></div>
                  <span className="text-xs">{t('inpatient.bedStatus.occupied')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded shrink-0"></div>
                  <span className="text-xs">{t('inpatient.bedStatus.reserved')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded shrink-0"></div>
                  <span className="text-xs">{t('inpatient.bedStatus.maintenance')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded shrink-0"></div>
                  <span className="text-xs">{t('inpatient.bedStatus.cleaning')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
