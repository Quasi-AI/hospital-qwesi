'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { ArrowLeft, Edit, ShoppingCart, Package, DollarSign, Truck, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

function PurchaseOrderViewContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    fetchOrder();
  }, [resolvedParams.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/purchase-orders/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        setError('Purchase order not found');
      }
    } catch (err) {
      console.error('Error fetching purchase order:', err);
      setError('Failed to load purchase order data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      ordered: 'bg-purple-100 text-purple-800',
      partial: 'bg-orange-100 text-orange-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="h-4 w-4" />;
      case 'approved':
      case 'ordered':
        return <Truck className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-gray-600',
      normal: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inventory.purchaseOrder')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inventory.purchaseOrder')} description="" dense>
          <div className="flex items-center justify-center h-48 gap-2">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 shrink-0"></div>
            <span className="text-sm text-gray-600">Loading purchase order data...</span>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inventory.purchaseOrder')} description="" dense>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900">{t('common.error')}</h3>
            <p className="mt-1 text-sm text-gray-500">{error || 'Purchase order not found'}</p>
            <div className="mt-4">
              <Link
                href="/inventory/purchase-orders"
                className="inline-flex items-center h-9 px-3 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('common.back')}
              </Link>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={order.orderNumber || t('inventory.purchaseOrder')}
        description={order.supplierName || ''} dense>
        <div className="max-w-5xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link
              href="/inventory/purchase-orders"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{t('common.back')}</span>
            </Link>
            {['draft', 'pending'].includes(order.status) && (
              <Link
                href={`/inventory/purchase-orders/${order._id}/edit`}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4 shrink-0" />
                <span>{t('common.edit')}</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-3">
              {/* Order Information */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{t('inventory.orderDetails')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.orderNumber')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{order.orderNumber}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.supplier')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{order.supplierName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.status')}</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {t(`inventory.orderStatus.${order.status}`)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.priority')}</label>
                    <p className={`mt-1 text-sm font-medium ${getPriorityColor(order.priority)}`}>
                      {t(`inventory.priorityLabels.${order.priority}`)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.orderDate')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(order.orderDate)}</p>
                  </div>
                  {order.expectedDeliveryDate && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.expectedDelivery')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(order.expectedDeliveryDate)}</p>
                    </div>
                  )}
                  {order.actualDeliveryDate && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.actualDeliveryDate')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(order.actualDeliveryDate)}</p>
                    </div>
                  )}
                  {order.approvedBy && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.approvedBy')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{order.approvedBy}</p>
                      {order.approvedAt && (
                        <p className="mt-0.5 text-xs text-gray-500">{formatDate(order.approvedAt)}</p>
                      )}
                    </div>
                  )}
                  {order.receivedBy && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('inventory.receivedBy')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{order.receivedBy}</p>
                      {order.receivedAt && (
                        <p className="mt-0.5 text-xs text-gray-500">{formatDate(order.receivedAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{t('inventory.orderItems')}</h2>
                </div>
                {order.items && order.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.item')}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.type')}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.quantity')}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.unitCost')}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.total')}</th>
                          {order.status === 'received' && (
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.receivedQuantity')}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.items.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2">
                              <p className="font-medium text-sm">{item.itemName}</p>
                              <p className="text-xs text-gray-500">{item.sku}</p>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${item.itemType === 'medicine' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                {item.itemType === 'medicine' ? t('inventory.medicine') : t('inventory.inventoryItem')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm">{formatCurrency(Number(item.unitCost) || 0)}</td>
                            <td className="px-3 py-2 text-sm font-medium">{formatCurrency(Number(item.totalCost) || 0)}</td>
                            {order.status === 'received' && (
                              <td className="px-3 py-2 text-sm">{item.receivedQuantity || 0}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-3">{t('inventory.noItemsAdded')}</p>
                )}
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-white border border-gray-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('inventory.notes')}</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-3">
              {/* Summary Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-green-600 shrink-0" />
                  <h3 className="text-sm font-semibold text-gray-900">{t('inventory.summary')}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('inventory.subtotal')}</span>
                    <span className="font-medium">{formatCurrency(Number(order.subtotal) || 0)}</span>
                  </div>
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.tax')}</span>
                      <span className="font-medium">{formatCurrency(Number(order.taxAmount) || 0)}</span>
                    </div>
                  )}
                  {order.shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.shipping')}</span>
                      <span className="font-medium">{formatCurrency(Number(order.shippingCost) || 0)}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.discount')}</span>
                      <span className="font-medium text-red-600">-{formatCurrency(Number(order.discount) || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">{t('inventory.total')}</span>
                    <span className="font-bold text-base text-green-600 tabular-nums">{formatCurrency(Number(order.totalAmount) || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('inventory.paymentStatus')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">{t('inventory.status')}</span>
                    <span className={`font-medium capitalize ${order.paymentStatus === 'paid' ? 'text-green-600' : order.paymentStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {t(`inventory.paymentStatusLabels.${order.paymentStatus}`) || order.paymentStatus}
                    </span>
                  </div>
                  {order.paymentMethod && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-600">{t('inventory.paymentMethod')}</span>
                      <span className="font-medium truncate">{order.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function PurchaseOrderViewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    }>
      <PurchaseOrderViewContent params={params} />
    </Suspense>
  );
}
