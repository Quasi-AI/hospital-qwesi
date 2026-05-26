'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Printer,
  User,
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { useSettings } from '../../../contexts/SettingsContext';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';

type AddressFields = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
};

/** Lines for invoice letterhead from Settings → Contact information */
function formatPracticeAddressLines(addr?: AddressFields | null): string[] {
  if (!addr) return [];
  const lines: string[] = [];
  if (addr.street?.trim()) lines.push(addr.street.trim());
  const cityPart = [addr.city, addr.state].filter((s) => s?.trim()).join(', ');
  const postal = addr.postalCode?.trim() || '';
  if (cityPart && postal) lines.push(`${cityPart} ${postal}`);
  else if (cityPart) lines.push(cityPart);
  else if (postal) lines.push(postal);
  if (addr.country?.trim()) lines.push(addr.country.trim());
  return lines;
}

function formatPracticeContactLine(addr?: AddressFields | null): string | null {
  if (!addr) return null;
  const phone = addr.phone?.trim();
  const email = addr.email?.trim();
  const parts: string[] = [];
  if (phone) parts.push(`Tel: ${phone}`);
  if (email) parts.push(`Email: ${email}`);
  return parts.length ? parts.join(' | ') : null;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t, translationsLoaded } = useTranslations();
  const { settings } = useSettings();
  const { formatCurrency } = useFormatCurrency();
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
        setPayments(data.payments || []);
        setTotalPaid(data.totalPaid || 0);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('billing.invoiceDetails')} description="" dense>
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
        <SidebarLayout title={t('billing.invoiceDetails')} description="" dense>
          <div className="py-8 text-center">
            <p className="text-sm text-gray-600">{t('billing.invoiceNotFound')}</p>
            <Link href="/billing" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
              {t('common.back')} {t('billing.toBilling')}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  const remaining = invoice.total - totalPaid;
  const hospitalName = settings?.systemTitle || 'Medical Center';
  const practiceTagline = settings?.systemDescription?.trim() || '';
  const addressLines = formatPracticeAddressLines(settings?.address);
  const contactLine = formatPracticeContactLine(settings?.address);
  const billingInquiryFooter = (() => {
    const phone = settings?.address?.phone?.trim();
    const email = settings?.address?.email?.trim();
    if (phone && email) {
      return `please contact us at ${phone} or ${email}`;
    }
    if (phone) return `please contact us at ${phone}`;
    if (email) return `please contact us at ${email}`;
    return 'please contact your practice for billing inquiries';
  })();

  const invoiceLogoUrl = settings?.invoiceLogoUrl?.trim() || '';

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('billing.invoiceDetails')} description={invoice.invoiceNumber} dense>
        <div className="space-y-4">
          {/* Header Actions - Hidden in print */}
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <Link href="/billing" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back')}</span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" />
                <span>{t('billing.print')}</span>
              </button>
              <Link
                href={`/billing/invoices/${params.id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4" />
                <span>{t('billing.edit')}</span>
              </Link>
              {remaining > 0 && (
                <Link
                  href={`/billing/invoices/${params.id}/payment`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>{t('billing.addPayment')}</span>
                </Link>
              )}
            </div>
          </div>

          {/* ===== PRINT VIEW - Professional Invoice ===== */}
          <div className="hidden print:block invoice-print">
            {/* Header */}
            <div style={{ borderBottom: '3px solid #374151', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Logo & Hospital Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {invoiceLogoUrl ? (
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        flexShrink: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URLs / arbitrary logo URLs */}
                      <img
                        src={invoiceLogoUrl}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                      }}
                    >
                      💊
                    </div>
                  )}
                  <div>
                    <h1 style={{ fontSize: '20pt', fontWeight: '700', color: '#1f2937', margin: 0, letterSpacing: '-0.5px' }}>
                      {hospitalName}
                    </h1>
                    {practiceTagline && (
                      <p style={{ fontSize: '9pt', color: '#4b5563', margin: '2px 0 0 0' }}>
                        {practiceTagline}
                      </p>
                    )}
                    {addressLines.map((line, i) => (
                      <p
                        key={`addr-${i}`}
                        style={{
                          fontSize: '8pt',
                          color: '#6b7280',
                          margin: i === 0 ? '6px 0 0 0' : '2px 0 0 0',
                        }}
                      >
                        {line}
                      </p>
                    ))}
                    {contactLine && (
                      <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0 0 0' }}>
                        {contactLine}
                      </p>
                    )}
                  </div>
                </div>
                {/* Invoice Title */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    background: '#f3f4f6', 
                    color: '#1f2937', 
                    padding: '10px 24px',
                    fontSize: '14pt',
                    fontWeight: '700',
                    letterSpacing: '3px',
                    border: '2px solid #374151'
                  }}>
                    INVOICE
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '9pt', color: '#6b7280', margin: 0 }}>Invoice Number</p>
                    <p style={{ fontSize: '12pt', fontWeight: '700', color: '#111827', margin: '2px 0 0 0' }}>{invoice.invoiceNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details Bar */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1px', 
              background: '#e5e7eb',
              border: '1px solid #d1d5db',
              marginBottom: '24px'
            }}>
              <div style={{ background: '#f9fafb', padding: '12px 14px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Invoice Date</p>
                <p style={{ fontSize: '10pt', fontWeight: '600', color: '#111827', margin: '2px 0 0 0' }}>{formatDate(invoice.createdAt)}</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px 14px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Due Date</p>
                <p style={{ fontSize: '10pt', fontWeight: '600', color: '#111827', margin: '2px 0 0 0' }}>{invoice.dueDate ? formatDate(invoice.dueDate) : 'Upon Receipt'}</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px 14px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Status</p>
                <p style={{ 
                  fontSize: '10pt', 
                  fontWeight: '700', 
                  color: invoice.status === 'paid' ? '#166534' : invoice.status === 'pending' ? '#d97706' : '#111827', 
                  margin: '2px 0 0 0',
                  textTransform: 'uppercase'
                }}>{invoice.status}</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px 14px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Amount Due</p>
                <p style={{ fontSize: '11pt', fontWeight: '700', color: remaining > 0 ? '#dc2626' : '#166534', margin: '2px 0 0 0' }}>
                  {formatCurrency(remaining > 0 ? remaining : 0)}
                </p>
              </div>
            </div>

            {/* Bill To Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                background: '#f3f4f6', 
                color: '#374151', 
                padding: '8px 14px', 
                fontSize: '9pt', 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                display: 'inline-block',
                marginBottom: '12px',
                border: '1px solid #d1d5db'
              }}>
                BILL TO
              </div>
              <div style={{ paddingLeft: '2px' }}>
                <p style={{ fontSize: '12pt', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>{invoice.patientName}</p>
                <p style={{ fontSize: '9pt', color: '#374151', fontWeight: '500', margin: '0 0 4px 0' }}>Patient ID: {invoice.hospitalPatientId || invoice.patientId}</p>
                <p style={{ fontSize: '9pt', color: '#4b5563', margin: '0 0 2px 0' }}>{invoice.patientEmail}</p>
                {invoice.patientPhone && (
                  <p style={{ fontSize: '9pt', color: '#4b5563', margin: 0 }}>{invoice.patientPhone}</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '8pt', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '50%', borderBottom: '2px solid #374151' }}>
                    Description
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '8pt', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%', borderBottom: '2px solid #374151' }}>
                    Qty
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '8pt', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '20%', borderBottom: '2px solid #374151' }}>
                    Unit Price
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '8pt', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '20%', borderBottom: '2px solid #374151' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb', background: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '12px 14px', fontSize: '9pt', color: '#1f2937' }}>
                      <span style={{ fontWeight: '500' }}>{item.description}</span>
                      {item.serviceType && (
                        <span style={{ display: 'block', fontSize: '8pt', color: '#6b7280', marginTop: '2px', textTransform: 'capitalize' }}>
                          {item.serviceType}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '9pt', color: '#374151' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '9pt', color: '#374151' }}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '10pt', fontWeight: '600', color: '#111827' }}>
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <div style={{ width: '280px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '9pt', color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontSize: '10pt', fontWeight: '500', color: '#374151' }}>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '9pt', color: '#6b7280' }}>Tax</span>
                    <span style={{ fontSize: '10pt', fontWeight: '500', color: '#374151' }}>{formatCurrency(invoice.tax)}</span>
                  </div>
                )}
                {invoice.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '9pt', color: '#6b7280' }}>Discount</span>
                    <span style={{ fontSize: '10pt', fontWeight: '500', color: '#374151' }}>-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', background: '#f9fafb', marginTop: '8px', borderTop: '2px solid #374151' }}>
                  <span style={{ fontSize: '10pt', fontWeight: '700', color: '#111827' }}>Total</span>
                  <span style={{ fontSize: '12pt', fontWeight: '700', color: '#1f2937' }}>{formatCurrency(invoice.total)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '9pt', color: '#6b7280' }}>Amount Paid</span>
                      <span style={{ fontSize: '10pt', fontWeight: '500', color: '#374151' }}>{formatCurrency(totalPaid)}</span>
                    </div>
                    {remaining > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fef2f2', marginTop: '8px' }}>
                        <span style={{ fontSize: '10pt', fontWeight: '700', color: '#dc2626' }}>Balance Due</span>
                        <span style={{ fontSize: '12pt', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(remaining)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Payment Info Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Payment Methods */}
              <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f3f4f6', padding: '10px 14px', borderBottom: '1px solid #d1d5db' }}>
                  <p style={{ fontSize: '8pt', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Payment Methods</p>
                </div>
                <div style={{ padding: '12px 14px', fontSize: '9pt', color: '#4b5563', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Cash:</strong> Pay at the billing counter</p>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Card:</strong> Visa, MasterCard, AMEX accepted</p>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Bank Transfer:</strong> Account details available on request</p>
                  <p style={{ margin: 0 }}><strong>Insurance:</strong> Please provide your policy details</p>
                </div>
              </div>

              {/* Notes */}
              <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f3f4f6', padding: '10px 14px', borderBottom: '1px solid #d1d5db' }}>
                  <p style={{ fontSize: '8pt', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Notes & Terms</p>
                </div>
                <div style={{ padding: '12px 14px', fontSize: '9pt', color: '#4b5563', lineHeight: '1.6' }}>
                  {invoice.notes ? (
                    <p style={{ margin: 0 }}>{invoice.notes}</p>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 6px 0' }}>• Payment is due upon receipt unless otherwise agreed</p>
                      <p style={{ margin: '0 0 6px 0' }}>• Please include invoice number with payment</p>
                      <p style={{ margin: 0 }}>
                        •{' '}
                        {contactLine
                          ? `For billing questions: ${contactLine}`
                          : 'Contact your practice for any billing queries'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History (if any) */}
            {payments.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '9pt', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Payment History</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '1px solid #d1d5db' }}>Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '1px solid #d1d5db' }}>Method</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '1px solid #d1d5db' }}>Reference</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '1px solid #d1d5db' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any, index: number) => (
                      <tr key={payment._id} style={{ background: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '8px 12px', fontSize: '9pt', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{formatDate(payment.paymentDate)}</td>
                        <td style={{ padding: '8px 12px', fontSize: '9pt', color: '#374151', borderBottom: '1px solid #e5e7eb', textTransform: 'capitalize' }}>{payment.paymentMethod}</td>
                        <td style={{ padding: '8px 12px', fontSize: '9pt', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{payment.transactionId || '-'}</td>
                        <td style={{ padding: '8px 12px', fontSize: '9pt', fontWeight: '600', color: '#374151', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '2px solid #374151', paddingTop: '16px', marginTop: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '8pt', color: '#6b7280', maxWidth: '55%' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#374151' }}>Thank you for choosing {hospitalName}!</p>
                  <p style={{ margin: 0, lineHeight: '1.5' }}>
                    This invoice is computer-generated and is valid without signature. For any billing inquiries,{' '}
                    {billingInquiryFooter}.
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '7pt', color: '#6b7280' }}>
                  <p style={{ margin: '0 0 2px 0' }}>Invoice: {invoice.invoiceNumber}</p>
                  <p style={{ margin: '0 0 2px 0' }}>Generated: {new Date().toLocaleString()}</p>
                  <p style={{ margin: '0 0 10px 0' }}>Page 1 of 1</p>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '6pt',
                    color: '#9ca3af',
                    marginLeft: 'auto'
                  }}>
                    QR Code
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== SCREEN VIEW ===== */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm print:hidden">
            {/* Practice contact (Settings → Contact + Invoice logo) */}
            <div className="mb-4 flex gap-3 border-b border-gray-100 pb-4 items-start">
              {invoiceLogoUrl ? (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URLs / arbitrary logo URLs */}
                  <img src={invoiceLogoUrl} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{hospitalName}</p>
              {practiceTagline && (
                <p className="text-xs text-gray-600 mt-0.5">{practiceTagline}</p>
              )}
              {addressLines.length > 0 && (
                <div className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                  {addressLines.map((line, i) => (
                    <p key={`screen-addr-${i}`}>{line}</p>
                  ))}
                </div>
              )}
              {contactLine && (
                <p className="mt-1.5 text-xs text-gray-600">{contactLine}</p>
              )}
              </div>
            </div>

            {/* Invoice Header */}
            <div className="mb-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h1 className="mb-1 text-2xl font-bold text-gray-900">INVOICE</h1>
                  <div className="mt-1">
                    <p className="text-xs text-gray-500">{t('billing.invoiceNumber')}</p>
                    <p className="text-lg font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="mb-0.5 text-xs text-gray-500">{t('billing.date')}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(invoice.createdAt)}</p>
                  {invoice.dueDate && (
                    <>
                      <p className="mb-0.5 mt-2 text-xs text-gray-500">{t('billing.dueDate')}</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
                    </>
                  )}
                </div>
              </div>
              <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-medium ${getStatusColor(invoice.status)}`}>
                {t(`billing.statusLabels.${invoice.status}`)}
              </span>
            </div>

            {/* Patient Information */}
            <div className="mb-4 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center">
                <User className="mr-2 h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">{t('billing.patientInformation')}</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-0.5 text-xs text-gray-500">{t('billing.patient')}</p>
                  <p className="text-sm font-semibold text-gray-900">{invoice.patientName}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-gray-500">{t('billing.email')}</p>
                  <p className="text-sm text-gray-900">{invoice.patientEmail}</p>
                </div>
                {invoice.patientPhone && (
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">{t('billing.phone')}</p>
                    <p className="text-sm text-gray-900">{invoice.patientPhone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Items */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('billing.invoiceItems')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {t('billing.itemDescription')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {t('billing.quantity')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {t('billing.unitPrice')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {t('billing.total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {invoice.items.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-full space-y-1.5 md:w-1/3">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span className="font-medium">{t('billing.subtotal')}:</span>
                    <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.tax > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span className="font-medium">{t('billing.tax')}:</span>
                      <span className="font-semibold">{formatCurrency(invoice.tax)}</span>
                    </div>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span className="font-medium">{t('billing.discount')}:</span>
                      <span className="font-semibold">-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                    <span>{t('billing.grandTotal')}:</span>
                    <span className="text-blue-600">{formatCurrency(invoice.total)}</span>
                  </div>
                  {totalPaid > 0 && (
                    <>
                      <div className="flex justify-between pt-2 text-sm text-gray-700">
                        <span className="font-medium">{t('billing.paidAmount')}:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
                      </div>
                      {remaining > 0 && (
                        <div className="flex justify-between text-sm text-gray-700">
                          <span className="font-medium">{t('billing.remaining')}:</span>
                          <span className="font-semibold text-red-600">{formatCurrency(remaining)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-1 text-xs font-semibold text-gray-700">{t('billing.notes')}</p>
                  <p className="text-sm text-gray-900">{invoice.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment History - Screen Only */}
          {payments.length > 0 && (
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm print:hidden">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('billing.paymentHistory')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('billing.paymentDate')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('billing.paymentMethod')}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">{t('billing.paymentAmount')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('billing.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {payments.map((payment: any) => (
                      <tr key={payment._id}>
                        <td className="px-3 py-2 text-sm text-gray-900">{formatDate(payment.paymentDate)}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{t(`billing.${payment.paymentMethod}`)}</td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.status === 'completed' ? t('billing.paymentCompleted') : payment.status}
                          </span>
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
