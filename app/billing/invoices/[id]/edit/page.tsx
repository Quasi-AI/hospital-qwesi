'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  User,
  FileText,
} from 'lucide-react';
import ProtectedRoute from '../../../../protected-route';
import SidebarLayout from '../../../../components/sidebar-layout';
import { useTranslations } from '../../../../hooks/useTranslations';
import { useFormatCurrency } from '../../../../hooks/useFormatCurrency';
import SearchablePatientSelect from '../../../../components/SearchablePatientSelect';
import SearchableServiceItemSelect from '../../../../components/SearchableServiceItemSelect';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  serviceType?: 'consultation' | 'procedure' | 'test' | 'medication' | 'room' | 'other';
  serviceId?: string;
}

function EditInvoiceForm({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'pending' | 'partial' | 'paid' | 'cancelled'>('draft');

  useEffect(() => {
    fetchServiceItems();
    fetchInvoice();
  }, [resolvedParams.id]);

  const fetchServiceItems = async () => {
    try {
      const response = await fetch('/api/billing/service-items?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setServiceItems(data.serviceItems || []);
      }
    } catch (error) {
      console.error('Error fetching service items:', error);
    }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/invoices/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        const invoice = data.invoice;
        
        // Set patient
        if (invoice.patientId) {
          setSelectedPatient({
            _id: invoice.patientId,
            patientId: invoice.patientId,
            name: invoice.patientName,
            email: invoice.patientEmail,
            phone: invoice.patientPhone,
          });
        }

        // Set items
        if (invoice.items && invoice.items.length > 0) {
          setItems(invoice.items);
        }

        // Set other fields
        setTax(invoice.tax || 0);
        setDiscount(invoice.discount || 0);
        setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
        setNotes(invoice.notes || '');
        setStatus(invoice.status || 'draft');
      } else {
        setError('Invoice not found');
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice data');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceItemSelect = (index: number, serviceItem: any | null) => {
    const newItems = [...items];
    if (serviceItem) {
      newItems[index] = {
        ...newItems[index],
        description: serviceItem.name,
        unitPrice: serviceItem.unitPrice,
        serviceType: serviceItem.serviceType,
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        description: '',
        unitPrice: 0,
        serviceType: undefined,
      };
    }
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.quantity || 1) * (item.unitPrice || 0);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + (tax || 0) - (discount || 0);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (newStatus?: 'draft' | 'pending') => {
    if (!selectedPatient) {
      setError(t('billing.validation.selectPatient'));
      return;
    }

    if (items.some(item => !item.description || item.unitPrice <= 0)) {
      setError(t('billing.validation.itemsRequired'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const invoiceData = {
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          total: (item.quantity || 1) * (item.unitPrice || 0),
          serviceType: item.serviceType,
          serviceId: item.serviceId,
        })),
        subtotal: calculateSubtotal(),
        tax: tax || 0,
        discount: discount || 0,
        total: calculateTotal(),
        status: newStatus || status,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      };

      const response = await fetch(`/api/billing/invoices/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        router.push(`/billing/invoices/${resolvedParams.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || t('billing.validation.updateFailed'));
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError(t('billing.validation.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('billing.editInvoice')} description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('billing.editInvoice')} description="" dense>
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
        title={t('billing.editInvoice')}
        description={t('billing.editInvoiceDescription')} dense>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              href={`/billing/invoices/${resolvedParams.id}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back')}</span>
            </Link>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-4">
            {/* Patient Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center">
                <User className="mr-2 h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  {t('billing.patientInformation')}
                </h2>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('billing.patient')} *
                </label>
                <SearchablePatientSelect
                  value={selectedPatient?.name || ''}
                  onChange={(patient) => setSelectedPatient(patient)}
                  placeholder={t('billing.patientPlaceholder')}
                  className="w-full"
                />
                {selectedPatient && (
                  <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedPatient.name}
                    </p>
                    <p className="text-xs text-gray-600">{selectedPatient.email}</p>
                    <p className="text-xs text-gray-600">{selectedPatient.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Items */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold text-gray-900">
                    {t('billing.invoiceItems')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('billing.addItem')}</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-3 rounded-md border border-gray-100 p-3"
                  >
                    <div className="col-span-12 md:col-span-5">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('billing.itemDescription')} *
                      </label>
                      <SearchableServiceItemSelect
                        value={item.description}
                        onChange={(serviceItem) => handleServiceItemSelect(index, serviceItem)}
                        placeholder={t('billing.serviceItems.searchPlaceholder')}
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('billing.quantity')} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'quantity',
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('billing.unitPrice')} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'unitPrice',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-end">
                      <div className="w-full">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          {t('billing.total')}
                        </label>
                        <div className="flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 text-sm font-medium">
                          {formatCurrency((item.quantity || 1) * (item.unitPrice || 0))}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals and Additional Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {t('billing.invoiceDetails')}
              </h2>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('billing.status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={status === 'paid'}
                  >
                    <option value="draft">{t('billing.statusLabels.draft')}</option>
                    <option value="pending">{t('billing.statusLabels.pending')}</option>
                    <option value="partial">{t('billing.statusLabels.partial')}</option>
                    <option value="paid">{t('billing.statusLabels.paid')}</option>
                    <option value="cancelled">{t('billing.statusLabels.cancelled')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('billing.dueDateLabel')}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>{t('billing.subtotal')}:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>{t('billing.tax')}:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                        className="h-8 w-24 rounded-md border border-gray-200 px-2 text-sm"
                      />
                      <span className="font-medium">{formatCurrency(tax || 0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>{t('billing.discount')}:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="h-8 w-24 rounded-md border border-gray-200 px-2 text-sm"
                      />
                      <span className="font-medium">{formatCurrency(discount || 0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                    <span>{t('billing.grandTotal')}:</span>
                    <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('billing.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={t('billing.notesPlaceholder')}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/billing/invoices/${resolvedParams.id}`}
                className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </Link>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gray-600 px-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? t('common.saving') : t('common.save')}</span>
              </button>
              {status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => handleSubmit('pending')}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{t('billing.updateAndSend')}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    }>
      <EditInvoiceForm params={params} />
    </Suspense>
  );
}
