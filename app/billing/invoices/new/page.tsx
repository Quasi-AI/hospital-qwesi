'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import SearchablePatientSelect from '../../../components/SearchablePatientSelect';
import SearchableServiceItemSelect from '../../../components/SearchableServiceItemSelect';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceType?: 'consultation' | 'procedure' | 'test' | 'medication' | 'room' | 'other';
  serviceId?: string;
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      }
    >
      <NewInvoicePageContent />
    </Suspense>
  );
}

function NewInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchServiceItems();
  }, []);

  useEffect(() => {
    if (!patientIdFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/patients/${patientIdFromUrl}`);
        if (!res.ok || cancelled) return;
        const p = await res.json();
        if (cancelled) return;
        setSelectedPatient({
          _id: p._id,
          patientId: p.patientId || p._id,
          name: p.name,
          email: p.email || '',
          phone: p.phone || '',
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

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

  // Wait for translations to load
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="..." description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

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

  const handleSubmit = async (status: 'draft' | 'pending') => {
    if (!selectedPatient) {
      alert(t('billing.validation.selectPatient'));
      return;
    }

    if (items.some(item => !item.description || item.unitPrice <= 0)) {
      alert(t('billing.validation.itemsRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceData = {
        patientId: selectedPatient.patientId || selectedPatient._id,
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
        status,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      };

      const response = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/billing/invoices/${data.invoice._id}`);
      } else {
        const error = await response.json();
        alert(error.error || t('billing.validation.createFailed'));
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert(t('billing.validation.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('billing.createInvoice')}
        description={t('billing.description')} dense>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              href="/billing"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back')}</span>
            </Link>
          </div>

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
                  syncPatient={selectedPatient}
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
                href="/billing"
                className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </Link>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gray-600 px-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{t('billing.saveDraft')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('pending')}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{t('billing.createAndSend')}</span>
              </button>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
