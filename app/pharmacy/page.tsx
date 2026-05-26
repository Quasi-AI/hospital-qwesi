'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { Pill, Plus, Search, AlertTriangle, Package, Clock, Eye, Edit, Trash2, ClipboardList } from 'lucide-react';

interface Medicine {
  _id: string; name: string; genericName: string; brandName?: string; category: string;
  strength: string; unit: string; currentStock: number; reorderLevel: number;
  sellingPrice: number; expiryDate?: string; isActive: boolean; sku: string;
}

export default function PharmacyPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState('');

  useEffect(() => { fetchMedicines(); }, [filterCategory, filterStock]);

  const fetchMedicines = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterStock === 'low') params.append('lowStock', 'true');
      if (filterStock === 'expiring') params.append('expiringSoon', 'true');

      const response = await fetch(`/api/pharmacy/medicines?${params}`);
      if (response.ok) setMedicines(await response.json());
    } catch (error) { console.error('Error fetching medicines:', error); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('pharmacy.confirmDelete'))) return;
    try {
      const response = await fetch(`/api/pharmacy/medicines/${id}`, { method: 'DELETE' });
      if (response.ok) setMedicines(medicines.filter(m => m._id !== id));
    } catch (error) { console.error('Error deleting medicine:', error); }
  };

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = medicines.filter(m => m.currentStock <= m.reorderLevel).length;
  const expiringCount = medicines.filter(m => {
    if (!m.expiryDate) return false;
    const expiry = new Date(m.expiryDate);
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays && expiry >= new Date();
  }).length;
  const totalValue = medicines.reduce((sum, m) => sum + (m.currentStock * m.sellingPrice), 0);

  const categories = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'powder', 'solution', 'suspension', 'other'];

  if (!translationsLoaded) {
    return <ProtectedRoute><SidebarLayout title={t('pharmacy.title')} description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('pharmacy.title')} description={t('pharmacy.description')} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder={t('pharmacy.searchMedicines')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex gap-2">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white">
                  <option value="">{t('pharmacy.allCategories')}</option>
                  {categories.map(cat => <option key={cat} value={cat}>{t(`pharmacy.categories.${cat}`)}</option>)}
                </select>
                <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white">
                  <option value="">{t('pharmacy.allStock')}</option>
                  <option value="low">{t('pharmacy.lowStock')}</option>
                  <option value="expiring">{t('pharmacy.expiringSoon')}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/pharmacy/dispensing/list" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                <ClipboardList className="h-4 w-4 shrink-0" /><span>{t('pharmacy.dispensingList')}</span>
              </Link>
              <Link href="/pharmacy/dispensing" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50">
                <Package className="h-4 w-4 shrink-0" /><span>{t('pharmacy.dispensing')}</span>
              </Link>
              <Link href="/pharmacy/medicines/new" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4 shrink-0" /><span>{t('pharmacy.addMedicine')}</span>
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><Pill className="h-4 w-4 text-blue-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('pharmacy.totalMedicines')}</p><p className="text-lg sm:text-xl font-bold tabular-nums">{medicines.length}</p></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4 text-orange-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('pharmacy.lowStock')}</p><p className="text-lg sm:text-xl font-bold tabular-nums">{lowStockCount}</p></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-red-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('pharmacy.expiringSoon')}</p><p className="text-lg sm:text-xl font-bold tabular-nums">{expiringCount}</p></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-green-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('pharmacy.stockValue')}</p><p className="text-lg sm:text-xl font-bold tabular-nums truncate">{formatCurrency(totalValue)}</p></div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div>
          ) : filteredMedicines.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg p-8 text-center">
              <Pill className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">{t('pharmacy.noMedicines')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('pharmacy.noMedicinesDescription')}</p>
              <Link href="/pharmacy/medicines/new" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4" /><span>{t('pharmacy.addMedicine')}</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.medicine')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.category')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.stock')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.price')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.expiry')}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMedicines.map((med) => {
                      const isLowStock = med.currentStock <= med.reorderLevel;
                      const isExpiring = med.expiryDate && new Date(med.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      return (
                        <tr key={med._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{med.name}</p>
                              <p className="text-xs text-gray-500">{med.genericName} • {med.strength}</p>
                              <p className="text-xs text-gray-400">{med.sku}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{t(`pharmacy.categories.${med.category}`)}</span></td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isLowStock ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                              {med.currentStock} {med.unit}
                            </span>
                            {isLowStock && <p className="text-xs text-orange-600 mt-0.5">{t('pharmacy.reorderAt')}: {med.reorderLevel}</p>}
                          </td>
                          <td className="px-3 py-2 text-sm">{formatCurrency(med.sellingPrice)}</td>
                          <td className="px-3 py-2">
                            {med.expiryDate ? (
                              <span className={`text-sm ${isExpiring ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                {new Date(med.expiryDate).toLocaleDateString()}
                              </span>
                            ) : <span className="text-gray-400 text-sm">-</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/pharmacy/medicines/${med._id}`} className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Eye className="h-4 w-4" /></Link>
                              <Link href={`/pharmacy/medicines/${med._id}/edit`} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></Link>
                              <button type="button" onClick={() => handleDelete(med._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
