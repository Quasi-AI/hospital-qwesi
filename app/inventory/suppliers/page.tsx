'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { Users, Plus, Search, Eye, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';

interface Supplier {
  _id: string; name: string; code: string; contactPerson: string; email: string;
  phone: string; supplyType: string[]; isActive: boolean;
  address?: { city?: string; state?: string; };
}

export default function SuppliersPage() {
  const { t, translationsLoaded } = useTranslations();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => { fetchSuppliers(); }, [filterType]);

  const fetchSuppliers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('supplyType', filterType);
      const response = await fetch(`/api/inventory/suppliers?${params}`);
      if (response.ok) setSuppliers(await response.json());
    } catch (error) { console.error('Error fetching suppliers:', error); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('inventory.confirmDeleteSupplier'))) return;
    try {
      const response = await fetch(`/api/inventory/suppliers/${id}`, { method: 'DELETE' });
      if (response.ok) setSuppliers(suppliers.filter(s => s._id !== id));
    } catch (error) { console.error('Error deleting supplier:', error); }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!translationsLoaded) {
    return <ProtectedRoute><SidebarLayout title={t('inventory.suppliers')} description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inventory.suppliers')} description={t('inventory.suppliersDescription')} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder={t('inventory.searchSuppliers')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white">
                <option value="">{t('inventory.allSupplyTypes')}</option>
                <option value="medicines">{t('inventory.supplyTypes.medicines')}</option>
                <option value="equipment">{t('inventory.supplyTypes.equipment')}</option>
                <option value="consumables">{t('inventory.supplyTypes.consumables')}</option>
              </select>
            </div>
            <Link href="/inventory/suppliers/new" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0">
              <Plus className="h-4 w-4 shrink-0" /><span>{t('inventory.addSupplier')}</span>
            </Link>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg p-8 text-center">
              <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">{t('inventory.noSuppliers')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('inventory.noSuppliersDescription')}</p>
              <Link href="/inventory/suppliers/new" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4" /><span>{t('inventory.addSupplier')}</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier._id} className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base truncate">{supplier.name}</h3>
                      <p className="text-xs text-gray-500">{supplier.code}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium shrink-0 ${supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {supplier.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm mb-3">
                    <div className="flex items-center gap-1.5 text-gray-600"><Users className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{supplier.contactPerson}</span></div>
                    <div className="flex items-center gap-1.5 text-gray-600"><Phone className="h-3.5 w-3.5 shrink-0" /><span>{supplier.phone}</span></div>
                    <div className="flex items-center gap-1.5 text-gray-600"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{supplier.email}</span></div>
                    {supplier.address?.city && <div className="flex items-center gap-1.5 text-gray-600"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="text-xs">{supplier.address.city}{supplier.address.state ? `, ${supplier.address.state}` : ''}</span></div>}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {supplier.supplyType.map(type => (
                      <span key={type} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{t(`inventory.supplyTypes.${type}`)}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-100">
                    <Link href={`/inventory/suppliers/${supplier._id}`} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"><Eye className="h-4 w-4" /></Link>
                    <Link href={`/inventory/suppliers/${supplier._id}/edit`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"><Edit className="h-4 w-4" /></Link>
                    <button type="button" onClick={() => handleDelete(supplier._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="h-4 w-4" /></button>
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
