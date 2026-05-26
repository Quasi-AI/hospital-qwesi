'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Save, Package } from 'lucide-react';

interface Supplier { _id: string; name: string; }

export default function NewInventoryItemPage() {
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [formData, setFormData] = useState({
    name: '', category: 'medical-supplies', subCategory: '', description: '', unit: 'units',
    currentStock: 0, reorderLevel: 10, maxStock: 1000, unitCost: 0,
    location: '', department: '', serialNumber: '', modelNumber: '', manufacturer: '',
    warrantyExpiry: '', expiryDate: '', batchNumber: '', notes: '',
    supplierId: '', supplierName: '', condition: 'new',
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/inventory/suppliers?isActive=true');
      if (response.ok) setSuppliers(await response.json());
    } catch (error) { console.error('Error fetching suppliers:', error); }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierId = e.target.value;
    const supplier = suppliers.find(s => s._id === supplierId);
    setFormData(prev => ({ ...prev, supplierId, supplierName: supplier?.name || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');

    try {
      const response = await fetch('/api/inventory/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          currentStock: Number(formData.currentStock),
          reorderLevel: Number(formData.reorderLevel),
          maxStock: Number(formData.maxStock),
          unitCost: Number(formData.unitCost),
          warrantyExpiry: formData.warrantyExpiry || undefined,
          expiryDate: formData.expiryDate || undefined,
        }),
      });
      if (response.ok) router.push('/inventory');
      else { const data = await response.json(); setError(data.error || t('common.error')); }
    } catch { setError(t('common.error')); }
    finally { setSubmitting(false); }
  };

  const categories = ['medical-supplies', 'equipment', 'consumables', 'instruments', 'furniture', 'linen', 'cleaning', 'other'];
  const conditions = ['new', 'good', 'fair', 'poor', 'damaged'];

  if (!translationsLoaded) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inventory.addItem')} description={t('inventory.addItemDescription')} dense>
        <div className="max-w-4xl">
          <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-3">
            <ArrowLeft className="h-4 w-4 shrink-0" /><span>{t('common.back')}</span>
          </Link>

          {error && <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Basic Info */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-blue-600 shrink-0" />{t('inventory.basicInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.itemName')} *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.category')} *</label>
                  <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    {categories.map(cat => <option key={cat} value={cat}>{t(`inventory.categories.${cat}`)}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.subCategory')}</label>
                  <input type="text" value={formData.subCategory} onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.condition')}</label>
                  <select value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    {conditions.map(cond => <option key={cond} value={cond}>{t(`inventory.conditionLabels.${cond}`)}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.supplier')}</label>
                  <select value={formData.supplierId} onChange={handleSupplierChange}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="">{t('inventory.selectSupplier')}</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select></div>
                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.description')}</label>
                  <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full min-h-[4.5rem] px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              </div>
            </div>

            {/* Stock & Pricing */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('inventory.stockPricing')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.currentStock')}</label>
                  <input type="number" min="0" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.reorderLevel')}</label>
                  <input type="number" min="0" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.unit')}</label>
                  <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.unitCost')} *</label>
                  <input type="number" min="0" step="0.01" required value={formData.unitCost} onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.location')}</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., Warehouse A, Shelf B3" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.department')}</label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              </div>
            </div>

            {/* Equipment Details (if applicable) */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('inventory.equipmentDetails')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.serialNumber')}</label>
                  <input type="text" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.modelNumber')}</label>
                  <input type="text" value={formData.modelNumber} onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.manufacturer')}</label>
                  <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.warrantyExpiry')}</label>
                  <input type="date" value={formData.warrantyExpiry} onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.expiryDate')}</label>
                  <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.batchNumber')}</label>
                  <input type="text" value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.notes')}</label>
                <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full min-h-[4.5rem] px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 h-9 px-4 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                <Save className="h-4 w-4 shrink-0" /><span>{submitting ? t('common.saving') : t('inventory.saveItem')}</span>
              </button>
              <Link href="/inventory" className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
