'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { Package, Plus, Search, AlertTriangle, Wrench, Eye, Edit, Trash2, ShoppingCart, Users } from 'lucide-react';

interface InventoryItem {
  _id: string; name: string; category: string; sku: string; currentStock: number;
  reorderLevel: number; unitCost: number; totalValue: number; status: string;
  location?: string; department?: string; expiryDate?: string;
}

export default function InventoryPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { fetchItems(); }, [filterCategory, filterStatus]);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`/api/inventory/items?${params}`);
      if (response.ok) setItems(await response.json());
    } catch (error) { console.error('Error fetching items:', error); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('inventory.confirmDelete'))) return;
    try {
      const response = await fetch(`/api/inventory/items/${id}`, { method: 'DELETE' });
      if (response.ok) setItems(items.filter(i => i._id !== id));
    } catch (error) { console.error('Error deleting item:', error); }
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = items.filter(i => i.status === 'low-stock').length;
  const outOfStockCount = items.filter(i => i.status === 'out-of-stock').length;
  const totalValue = items.reduce((sum, i) => sum + i.totalValue, 0);

  const categories = ['medical-supplies', 'equipment', 'consumables', 'instruments', 'furniture', 'linen', 'cleaning', 'other'];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'in-stock': 'bg-green-100 text-green-800', 'low-stock': 'bg-orange-100 text-orange-800',
      'out-of-stock': 'bg-red-100 text-red-800', 'expired': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!translationsLoaded) {
    return <ProtectedRoute><SidebarLayout title={t('inventory.title')} description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inventory.title')} description={t('inventory.description')} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder={t('inventory.searchItems')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex gap-2">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white">
                  <option value="">{t('inventory.allCategories')}</option>
                  {categories.map(cat => <option key={cat} value={cat}>{t(`inventory.categories.${cat}`)}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white">
                  <option value="">{t('inventory.allStatuses')}</option>
                  <option value="in-stock">{t('inventory.statusLabels.in-stock')}</option>
                  <option value="low-stock">{t('inventory.statusLabels.low-stock')}</option>
                  <option value="out-of-stock">{t('inventory.statusLabels.out-of-stock')}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/inventory/suppliers" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                <Users className="h-4 w-4 shrink-0" /><span>{t('inventory.suppliers')}</span>
              </Link>
              <Link href="/inventory/purchase-orders" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50">
                <ShoppingCart className="h-4 w-4 shrink-0" /><span>{t('inventory.purchaseOrders')}</span>
              </Link>
              <Link href="/inventory/items/new" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4 shrink-0" /><span>{t('inventory.addItem')}</span>
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-blue-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('inventory.totalItems')}</p><p className="text-lg sm:text-xl font-bold tabular-nums">{items.length}</p></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4 text-orange-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('inventory.lowStock')}</p><p className="text-lg sm:text-xl font-bold tabular-nums">{lowStockCount}</p></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0"><Wrench className="h-4 w-4 text-red-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('inventory.outOfStock')}</p><p className="text-lg sm:text-xl font-bold tabular-nums">{outOfStockCount}</p></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-green-600" /></div>
                <div className="min-w-0"><p className="text-xs text-gray-500">{t('inventory.totalValue')}</p><p className="text-lg sm:text-xl font-bold tabular-nums truncate">{formatCurrency(totalValue)}</p></div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg p-8 text-center">
              <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">{t('inventory.noItems')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('inventory.noItemsDescription')}</p>
              <Link href="/inventory/items/new" className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4" /><span>{t('inventory.addItem')}</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.item')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.category')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.stock')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.value')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.status')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.location')}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </td>
                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{t(`inventory.categories.${item.category}`)}</span></td>
                        <td className="px-3 py-2">
                          <span className="text-sm">{item.currentStock}</span>
                          {item.currentStock <= item.reorderLevel && <p className="text-xs text-orange-600 mt-0.5">{t('inventory.reorderAt')}: {item.reorderLevel}</p>}
                        </td>
                        <td className="px-3 py-2 text-sm">{formatCurrency(item.totalValue)}</td>
                        <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${getStatusColor(item.status)}`}>{t(`inventory.statusLabels.${item.status}`)}</span></td>
                        <td className="px-3 py-2 text-sm text-gray-500">{item.location || '-'}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/inventory/items/${item._id}`} className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Eye className="h-4 w-4" /></Link>
                            <Link href={`/inventory/items/${item._id}/edit`} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></Link>
                            <button type="button" onClick={() => handleDelete(item._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
