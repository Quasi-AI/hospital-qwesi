'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  CheckCircle,
  Wrench,
  User,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IAmbulance {
  _id: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  manufacturer?: string;
  capacity: number;
  hasOxygen: boolean;
  hasDefibrillator: boolean;
  hasStretcher: boolean;
  hasVentilator: boolean;
  driverName?: string;
  driverPhone?: string;
  paramedicName?: string;
  status: string;
  baseCharge: number;
  baseChargePerKm: number;
  isActive: boolean;
}

export default function AmbulanceFleetPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency, currencyCode } = useFormatCurrency();
  const [ambulances, setAmbulances] = useState<IAmbulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<IAmbulance | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: 'basic',
    model: '',
    manufacturer: '',
    yearOfManufacture: '',
    capacity: '1',
    equipment: '',
    hasOxygen: false,
    hasDefibrillator: false,
    hasStretcher: true,
    hasVentilator: false,
    driverName: '',
    driverPhone: '',
    driverLicense: '',
    paramedicName: '',
    paramedicPhone: '',
    baseCharge: '500',
    baseChargePerKm: '10',
    registrationNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchAmbulances();
  }, []);

  const fetchAmbulances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ambulance');
      if (!response.ok) throw new Error('Failed to fetch ambulances');
      const data = await response.json();
      setAmbulances(data);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
      toast.error(t('ambulance.fetchError') || 'Failed to fetch ambulances');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleNumber: '',
      vehicleType: 'basic',
      model: '',
      manufacturer: '',
      yearOfManufacture: '',
      capacity: '1',
      equipment: '',
      hasOxygen: false,
      hasDefibrillator: false,
      hasStretcher: true,
      hasVentilator: false,
      driverName: '',
      driverPhone: '',
      driverLicense: '',
      paramedicName: '',
      paramedicPhone: '',
      baseCharge: '500',
      baseChargePerKm: '10',
      registrationNumber: '',
      notes: '',
    });
    setEditingAmbulance(null);
  };

  const handleEdit = (ambulance: IAmbulance) => {
    setEditingAmbulance(ambulance);
    setFormData({
      vehicleNumber: ambulance.vehicleNumber,
      vehicleType: ambulance.vehicleType,
      model: ambulance.model,
      manufacturer: ambulance.manufacturer || '',
      yearOfManufacture: '',
      capacity: ambulance.capacity.toString(),
      equipment: '',
      hasOxygen: ambulance.hasOxygen,
      hasDefibrillator: ambulance.hasDefibrillator,
      hasStretcher: ambulance.hasStretcher,
      hasVentilator: ambulance.hasVentilator,
      driverName: ambulance.driverName || '',
      driverPhone: ambulance.driverPhone || '',
      driverLicense: '',
      paramedicName: ambulance.paramedicName || '',
      paramedicPhone: '',
      baseCharge: ambulance.baseCharge.toString(),
      baseChargePerKm: ambulance.baseChargePerKm.toString(),
      registrationNumber: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicleNumber || !formData.vehicleType || !formData.model) {
      toast.error(t('ambulance.validation.requiredFields') || 'Vehicle number, type, and model are required');
      return;
    }

    setSaving(true);
    try {
      const url = editingAmbulance 
        ? `/api/ambulance/${editingAmbulance._id}`
        : '/api/ambulance';
      
      const response = await fetch(url, {
        method: editingAmbulance ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: formData.vehicleNumber,
          vehicleType: formData.vehicleType,
          model: formData.model,
          manufacturer: formData.manufacturer || undefined,
          yearOfManufacture: formData.yearOfManufacture ? parseInt(formData.yearOfManufacture) : undefined,
          capacity: parseInt(formData.capacity) || 1,
          equipment: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : [],
          hasOxygen: formData.hasOxygen,
          hasDefibrillator: formData.hasDefibrillator,
          hasStretcher: formData.hasStretcher,
          hasVentilator: formData.hasVentilator,
          driverName: formData.driverName || undefined,
          driverPhone: formData.driverPhone || undefined,
          driverLicense: formData.driverLicense || undefined,
          paramedicName: formData.paramedicName || undefined,
          paramedicPhone: formData.paramedicPhone || undefined,
          baseCharge: parseFloat(formData.baseCharge) || 500,
          baseChargePerKm: parseFloat(formData.baseChargePerKm) || 10,
          registrationNumber: formData.registrationNumber || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save ambulance');
      }

      toast.success(editingAmbulance 
        ? (t('ambulance.updateSuccess') || 'Ambulance updated successfully')
        : (t('ambulance.createSuccess') || 'Ambulance added successfully')
      );
      
      setShowAddModal(false);
      resetForm();
      fetchAmbulances();
    } catch (error) {
      console.error('Error saving ambulance:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save ambulance');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('ambulance.confirmDelete') || 'Are you sure you want to delete this ambulance?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ambulance/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete ambulance');
      
      toast.success(t('ambulance.deleteSuccess') || 'Ambulance deleted successfully');
      fetchAmbulances();
    } catch (error) {
      console.error('Error deleting ambulance:', error);
      toast.error(t('ambulance.deleteError') || 'Failed to delete ambulance');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/ambulance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success(t('ambulance.statusUpdated') || 'Status updated');
      fetchAmbulances();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('ambulance.statusUpdateError') || 'Failed to update status');
    }
  };

  const filteredAmbulances = ambulances.filter(a => {
    const matchesSearch = 
      a.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.driverName && a.driverName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesType = typeFilter === 'all' || a.vehicleType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'on-call':
      case 'en-route':
        return 'bg-blue-100 text-blue-800';
      case 'at-scene':
      case 'transporting':
        return 'bg-purple-100 text-purple-800';
      case 'at-hospital':
        return 'bg-cyan-100 text-cyan-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    return t(`ambulance.vehicleTypes.${type}`) || type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusLabel = (status: string) => {
    return t(`ambulance.vehicleStatuses.${status}`) || status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Stats
  const availableCount = ambulances.filter(a => a.status === 'available').length;
  const onDutyCount = ambulances.filter(a => ['on-call', 'en-route', 'at-scene', 'transporting', 'at-hospital'].includes(a.status)).length;
  const maintenanceCount = ambulances.filter(a => a.status === 'maintenance').length;

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('ambulance.fleetManagement') || 'Fleet Management'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('ambulance.fleetManagement') || 'Fleet Management'} 
        description={t('ambulance.fleetDescription') || 'Manage your ambulance fleet'} dense>
        {/* Back Link */}
        <Link href="/ambulance" className="mb-4 inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t('ambulance.backToBookings') || 'Back to Bookings'}
        </Link>

        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-600">{t('ambulance.totalFleet') || 'Total Fleet'}</p>
                <p className="text-lg font-semibold tabular-nums text-gray-900">{ambulances.length}</p>
              </div>
              <Truck className="h-8 w-8 shrink-0 text-gray-400" />
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-green-600">{t('ambulance.available') || 'Available'}</p>
                <p className="text-lg font-semibold tabular-nums text-green-700">{availableCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 shrink-0 text-green-500" />
            </div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-blue-600">{t('ambulance.onDuty') || 'On Duty'}</p>
                <p className="text-lg font-semibold tabular-nums text-blue-700">{onDutyCount}</p>
              </div>
              <Truck className="h-8 w-8 shrink-0 text-blue-500" />
            </div>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-yellow-600">{t('ambulance.maintenance') || 'Maintenance'}</p>
                <p className="text-lg font-semibold tabular-nums text-yellow-700">{maintenanceCount}</p>
              </div>
              <Wrench className="h-8 w-8 shrink-0 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            <div className="relative w-full flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('ambulance.searchFleet') || 'Search by vehicle number, model...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">{t('ambulance.allTypes') || 'All Types'}</option>
                <option value="basic">{t('ambulance.vehicleTypes.basic') || 'Basic'}</option>
                <option value="advanced">{t('ambulance.vehicleTypes.advanced') || 'Advanced'}</option>
                <option value="icu">{t('ambulance.vehicleTypes.icu') || 'ICU'}</option>
                <option value="neonatal">{t('ambulance.vehicleTypes.neonatal') || 'Neonatal'}</option>
                <option value="patient-transport">{t('ambulance.vehicleTypes.patient-transport') || 'Patient Transport'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">{t('ambulance.allStatuses') || 'All Statuses'}</option>
                <option value="available">{t('ambulance.vehicleStatuses.available') || 'Available'}</option>
                <option value="on-call">{t('ambulance.vehicleStatuses.on-call') || 'On Call'}</option>
                <option value="en-route">{t('ambulance.vehicleStatuses.en-route') || 'En Route'}</option>
                <option value="maintenance">{t('ambulance.vehicleStatuses.maintenance') || 'Maintenance'}</option>
                <option value="out-of-service">{t('ambulance.vehicleStatuses.out-of-service') || 'Out of Service'}</option>
              </select>

              <button
                type="button"
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                {t('ambulance.addAmbulance') || 'Add Ambulance'}
              </button>
            </div>
          </div>
        </div>

        {/* Ambulances Grid */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : filteredAmbulances.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-white py-10 text-center shadow-sm">
            <Truck className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {t('ambulance.noAmbulances') || 'No ambulances found'}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {t('ambulance.noAmbulancesDesc') || 'Add your first ambulance to the fleet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredAmbulances.map((ambulance) => (
              <div key={ambulance._id} className="rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{ambulance.vehicleNumber}</h3>
                      <p className="text-xs text-gray-600">{ambulance.model}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${getStatusColor(ambulance.status)}`}>
                      {getStatusLabel(ambulance.status)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('ambulance.type') || 'Type'}</span>
                      <span className="font-medium">{getTypeLabel(ambulance.vehicleType)}</span>
                    </div>
                    
                    {ambulance.driverName && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center">
                          <User className="mr-0.5 h-3.5 w-3.5" />
                          {t('ambulance.driver') || 'Driver'}
                        </span>
                        <span className="font-medium">{ambulance.driverName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('ambulance.baseCharge') || 'Base Charge'}</span>
                      <span className="font-medium">{formatCurrency(ambulance.baseCharge)}</span>
                    </div>
                  </div>

                  {/* Equipment Icons */}
                  <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-gray-100 pt-2">
                    {ambulance.hasOxygen && (
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800" title="Oxygen">O₂</span>
                    )}
                    {ambulance.hasDefibrillator && (
                      <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800" title="Defibrillator">AED</span>
                    )}
                    {ambulance.hasVentilator && (
                      <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-800" title="Ventilator">Vent</span>
                    )}
                    {ambulance.hasStretcher && (
                      <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800" title="Stretcher">Str</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                    <select
                      value={ambulance.status}
                      onChange={(e) => handleStatusChange(ambulance._id, e.target.value)}
                      className="h-8 max-w-[140px] rounded-md border border-gray-200 px-1.5 text-xs"
                    >
                      <option value="available">{t('ambulance.vehicleStatuses.available') || 'Available'}</option>
                      <option value="maintenance">{t('ambulance.vehicleStatuses.maintenance') || 'Maintenance'}</option>
                      <option value="out-of-service">{t('ambulance.vehicleStatuses.out-of-service') || 'Out of Service'}</option>
                    </select>
                    
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(ambulance)}
                        className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ambulance._id)}
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-xl">
              <div className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  {editingAmbulance ? (t('ambulance.editAmbulance') || 'Edit Ambulance') : (t('ambulance.addAmbulance') || 'Add Ambulance')}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.vehicleNumber') || 'Vehicle Number'} *
                      </label>
                      <input
                        type="text"
                        value={formData.vehicleNumber}
                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.vehicleType') || 'Vehicle Type'} *
                      </label>
                      <select
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm"
                        required
                      >
                        <option value="basic">Basic</option>
                        <option value="advanced">Advanced Life Support</option>
                        <option value="icu">ICU</option>
                        <option value="neonatal">Neonatal</option>
                        <option value="patient-transport">Patient Transport</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.model') || 'Model'} *
                      </label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.manufacturer') || 'Manufacturer'}
                      </label>
                      <input
                        type="text"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.hasOxygen}
                        onChange={(e) => setFormData({ ...formData, hasOxygen: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-xs">Oxygen</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.hasDefibrillator}
                        onChange={(e) => setFormData({ ...formData, hasDefibrillator: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-xs">Defibrillator</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.hasStretcher}
                        onChange={(e) => setFormData({ ...formData, hasStretcher: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-xs">Stretcher</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.hasVentilator}
                        onChange={(e) => setFormData({ ...formData, hasVentilator: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-xs">Ventilator</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.driverName') || 'Driver Name'}
                      </label>
                      <input
                        type="text"
                        value={formData.driverName}
                        onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.driverPhone') || 'Driver Phone'}
                      </label>
                      <input
                        type="text"
                        value={formData.driverPhone}
                        onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.paramedicName') || 'Paramedic Name'}
                      </label>
                      <input
                        type="text"
                        value={formData.paramedicName}
                        onChange={(e) => setFormData({ ...formData, paramedicName: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.capacity') || 'Capacity'}
                      </label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.baseCharge') || `Base Charge (${currencyCode})`}
                      </label>
                      <input
                        type="number"
                        value={formData.baseCharge}
                        onChange={(e) => setFormData({ ...formData, baseCharge: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        {t('ambulance.chargePerKm') || `Charge per km (${currencyCode})`}
                      </label>
                      <input
                        type="number"
                        value={formData.baseChargePerKm}
                        onChange={(e) => setFormData({ ...formData, baseChargePerKm: e.target.value })}
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => { setShowAddModal(false); resetForm(); }}
                      className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
