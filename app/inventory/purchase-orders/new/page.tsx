'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { ArrowLeft, Save, ShoppingCart, Trash2, Search } from 'lucide-react';

interface Supplier { _id: string; name: string; }
interface Medicine { _id: string; name: string; genericName: string; sku: string; unitCost: number; currentStock: number; reorderLevel: number; }
interface InventoryItem { _id: string; name: string; sku: string; unitCost: number; currentStock: number; reorderLevel: number; }
interface OrderItem { itemType: 'medicine' | 'inventory'; itemId: string; itemName: string; sku: string; quantity: number; unitCost: number; totalCost: number; }

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemType, setItemType] = useState<'medicine' | 'inventory'>('medicine');

  const [formData, setFormData] = useState({
    supplierId: '', supplierName: '', items: [] as OrderItem[], priority: 'normal',
    expectedDeliveryDate: '', taxAmount: 0, discount: 0, shippingCost: 0, notes: '',
  });

  useEffect(() => { fetchSuppliers(); fetchMedicines(); fetchInventoryItems(); }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/inventory/suppliers?isActive=true');
      if (response.ok) setSuppliers(await response.json());
    } catch (error) { console.error('Error:', error); }
  };

  const fetchMedicines = async () => {
    try {
      const response = await fetch('/api/pharmacy/medicines?isActive=true');
      if (response.ok) setMedicines(await response.json());
    } catch (error) { console.error('Error:', error); }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch('/api/inventory/items');
      if (response.ok) setInventoryItems(await response.json());
    } catch (error) { console.error('Error:', error); }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierId = e.target.value;
    const supplier = suppliers.find(s => s._id === supplierId);
    setFormData(prev => ({ ...prev, supplierId, supplierName: supplier?.name || '' }));
  };

  const addItem = (item: Medicine | InventoryItem, type: 'medicine' | 'inventory') => {
    if (formData.items.some(i => i.itemId === item._id && i.itemType === type)) return;
    const newItem: OrderItem = {
      itemType: type, itemId: item._id, itemName: item.name, sku: item.sku,
      quantity: Math.max(1, item.reorderLevel - item.currentStock),
      unitCost: item.unitCost, totalCost: item.unitCost * Math.max(1, item.reorderLevel - item.currentStock),
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setSearchItem('');
    setShowItemDropdown(false);
  };

  const updateItem = (index: number, field: string, value: number) => {
    const newItems = [...formData.items];
    (newItems[index] as Record<string, unknown>)[field] = value;
    if (field === 'quantity') newItems[index].totalCost = value * newItems[index].unitCost;
    if (field === 'unitCost') newItems[index].totalCost = value * newItems[index].quantity;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const subtotal = formData.items.reduce((sum, i) => sum + i.totalCost, 0);
  const total = subtotal + formData.taxAmount + formData.shippingCost - formData.discount;

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(searchItem.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchItem.toLowerCase())
  ).slice(0, 8);

  const filteredInventoryItems = inventoryItems.filter(i =>
    i.name.toLowerCase().includes(searchItem.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchItem.toLowerCase())
  ).slice(0, 8);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) { setError(t('inventory.pleaseSelectSupplier')); return; }
    if (formData.items.length === 0) { setError(t('inventory.pleaseAddItems')); return; }
    setSubmitting(true); setError('');

    try {
      const response = await fetch('/api/inventory/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          taxAmount: Number(formData.taxAmount) || 0,
          discount: Number(formData.discount) || 0,
          shippingCost: Number(formData.shippingCost) || 0,
          status: 'pending',
        }),
      });
      if (response.ok) router.push('/inventory/purchase-orders');
      else { const data = await response.json(); setError(data.error || t('common.error')); }
    } catch { setError(t('common.error')); }
    finally { setSubmitting(false); }
  };

  if (!translationsLoaded) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inventory.newOrder')} description={t('inventory.newOrderDescription')} dense>
        <div className="max-w-5xl">
          <Link href="/inventory/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-3">
            <ArrowLeft className="h-4 w-4 shrink-0" /><span>{t('common.back')}</span>
          </Link>

          {error && <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Supplier & Details */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-blue-600 shrink-0" />{t('inventory.orderDetails')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.supplier')} *</label>
                  <select required value={formData.supplierId} onChange={handleSupplierChange}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="">{t('inventory.selectSupplier')}</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.priority')}</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="low">{t('inventory.priorityLabels.low')}</option>
                    <option value="normal">{t('inventory.priorityLabels.normal')}</option>
                    <option value="high">{t('inventory.priorityLabels.high')}</option>
                    <option value="urgent">{t('inventory.priorityLabels.urgent')}</option>
                  </select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.expectedDelivery')}</label>
                  <input type="date" value={formData.expectedDeliveryDate} onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('inventory.orderItems')}</h3>

              {/* Search Item */}
              <div className="flex gap-2 mb-3">
                <select value={itemType} onChange={(e) => setItemType(e.target.value as 'medicine' | 'inventory')}
                  className="h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white shrink-0">
                  <option value="medicine">{t('inventory.medicines')}</option>
                  <option value="inventory">{t('inventory.inventoryItems')}</option>
                </select>
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder={t('inventory.searchItemToAdd')} value={searchItem}
                    onChange={(e) => { setSearchItem(e.target.value); setShowItemDropdown(true); }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                  {showItemDropdown && searchItem && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto text-sm">
                      {itemType === 'medicine' ? (
                        filteredMedicines.length > 0 ? filteredMedicines.map(med => (
                          <button key={med._id} type="button" onClick={() => addItem(med, 'medicine')}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center gap-2">
                            <div className="min-w-0"><p className="font-medium truncate">{med.name}</p><p className="text-xs text-gray-500 truncate">{med.sku}</p></div>
                            <div className="text-right shrink-0"><p className="font-medium">{formatCurrency(med.unitCost)}</p>
                              <p className="text-xs text-gray-500">{t('inventory.stock')}: {med.currentStock}</p></div>
                          </button>
                        )) : <p className="px-3 py-2 text-gray-500">{t('common.noResults')}</p>
                      ) : (
                        filteredInventoryItems.length > 0 ? filteredInventoryItems.map(item => (
                          <button key={item._id} type="button" onClick={() => addItem(item, 'inventory')}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center gap-2">
                            <div className="min-w-0"><p className="font-medium truncate">{item.name}</p><p className="text-xs text-gray-500 truncate">{item.sku}</p></div>
                            <div className="text-right shrink-0"><p className="font-medium">{formatCurrency(item.unitCost)}</p>
                              <p className="text-xs text-gray-500">{t('inventory.stock')}: {item.currentStock}</p></div>
                          </button>
                        )) : <p className="px-3 py-2 text-gray-500">{t('common.noResults')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {formData.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.item')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.type')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.quantity')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.unitCost')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.total')}</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2"><p className="font-medium text-sm">{item.itemName}</p><p className="text-xs text-gray-500">{item.sku}</p></td>
                          <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs ${item.itemType === 'medicine' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {item.itemType === 'medicine' ? t('inventory.medicine') : t('inventory.inventoryItem')}
                          </span></td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                              className="w-16 h-8 px-2 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" step="0.01" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', Number(e.target.value))}
                              className="w-24 h-8 px-2 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2 text-sm font-medium">{formatCurrency(item.totalCost)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-200 rounded-md">
                  <ShoppingCart className="h-9 w-9 mx-auto mb-1.5 text-gray-300" />
                  <p>{t('inventory.noItemsAdded')}</p>
                  <p className="text-xs mt-0.5">{t('inventory.searchToAddItems')}</p>
                </div>
              )}
            </div>

            {/* Totals & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">{t('inventory.notes')}</h3>
                <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full min-h-[5rem] px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('inventory.notesPlaceholder')} />
              </div>
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">{t('inventory.summary')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">{t('inventory.subtotal')}</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-600">{t('inventory.tax')}</span>
                    <input type="number" min="0" step="0.01" value={formData.taxAmount} onChange={(e) => setFormData({ ...formData, taxAmount: Number(e.target.value) })}
                      className="w-24 h-8 px-2 border border-gray-300 rounded text-right text-sm" />
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-600">{t('inventory.shipping')}</span>
                    <input type="number" min="0" step="0.01" value={formData.shippingCost} onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                      className="w-24 h-8 px-2 border border-gray-300 rounded text-right text-sm" />
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-600">{t('inventory.discount')}</span>
                    <input type="number" min="0" step="0.01" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      className="w-24 h-8 px-2 border border-gray-300 rounded text-right text-sm" />
                  </div>
                  <div className="flex justify-between pt-2 border-t"><span className="font-semibold">{t('inventory.total')}</span><span className="font-bold text-base">{formatCurrency(total)}</span></div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 h-9 px-4 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                <Save className="h-4 w-4 shrink-0" /><span>{submitting ? t('common.saving') : t('inventory.createOrder')}</span>
              </button>
              <Link href="/inventory/purchase-orders" className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
