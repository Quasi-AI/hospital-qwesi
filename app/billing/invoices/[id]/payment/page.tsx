'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, Calendar } from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';

export default function RecordPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();

  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (params?.id) {
      fetchInvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = useMemo(
    () =>
      payments.reduce((sum, p) => (p.status === 'completed' ? sum + p.amount : sum), 0),
    [payments]
  );

  const remaining = invoice ? Math.max(invoice.total - totalPaid, 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      alert(t('billing.paymentAmount'));
      return;
    }

    if (numericAmount > remaining) {
      alert(t('billing.paymentAmount') + ' ' + t('billing.remaining'));
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: params.id,
          amount: numericAmount,
          paymentMethod,
          paymentDate,
          transactionId,
          notes,
        }),
      });

      if (response.ok) {
        alert(t('billing.paymentRecorded'));
        router.push(`/billing/invoices/${params.id}`);
      } else {
        const error = await response.json();
        alert(error.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('billing.recordPayment')} description="" dense>
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
        <SidebarLayout title={t('billing.recordPayment')} description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!invoice) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('billing.recordPayment')} description="" dense>
          <div className="py-8 text-center">
            <p className="text-sm text-gray-600">{t('billing.invoiceNotFound')}</p>
            <Link
              href="/billing"
              className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700"
            >
              {t('common.back')} {t('billing.toBilling')}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('billing.recordPayment')}
        description={invoice.invoiceNumber} dense>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/billing/invoices/${params.id}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back')}</span>
            </Link>
            <div className="text-right">
              <p className="text-xs text-gray-600">{t('billing.remaining')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('billing.paymentAmount')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('billing.paymentMethod')}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="cash">{t('billing.cash')}</option>
                    <option value="card">{t('billing.card')}</option>
                    <option value="upi">{t('billing.upi')}</option>
                    <option value="bankTransfer">{t('billing.bankTransfer')}</option>
                    <option value="cheque">{t('billing.cheque')}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('billing.paymentDate')}
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 pr-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('billing.transactionId')}
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('billing.transactionId')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('billing.paymentNotes')}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('billing.paymentNotes')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <Link
                  href={`/billing/invoices/${params.id}`}
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {submitting ? t('common.saving') : t('billing.recordPayment')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
