'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

export default function BillingPage() {
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/billing/invoices?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        fetchInvoices();
      } else {
        fetchInvoices();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleDelete = async (invoiceId: string) => {
    if (!confirm(t('billing.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchInvoices();
      } else {
        const error = await response.json();
        alert(error.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert(t('common.error'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'partial':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('billing.title')}
        description={t('billing.description')} dense>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 max-w-md flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('billing.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 appearance-none rounded-md border border-gray-200 bg-white py-0 pl-2.5 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">{t('billing.filter.all')}</option>
                    <option value="draft">{t('billing.filter.draft')}</option>
                    <option value="pending">{t('billing.filter.pending')}</option>
                    <option value="partial">{t('billing.filter.partial')}</option>
                    <option value="paid">{t('billing.filter.paid')}</option>
                    <option value="cancelled">{t('billing.filter.cancelled')}</option>
                  </select>
                  <Filter className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                </div>
                <Link
                  href="/billing/invoices/new"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('billing.addNewInvoice')}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white py-8 text-center shadow-sm">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">
                {t('billing.noInvoices')}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{t('billing.noInvoicesDesc')}</p>
              <Link
                href="/billing/invoices/new"
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>{t('billing.createInvoice')}</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('billing.invoiceNumber')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('billing.patient')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('billing.amount')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('billing.status')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('billing.dueDate')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('billing.date')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('billing.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice._id}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => router.push(`/billing/invoices/${invoice._id}`)}
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="text-sm text-gray-900">{invoice.patientName}</div>
                          <div className="text-xs text-gray-500">{invoice.patientEmail}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.total)}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {getStatusIcon(invoice.status)}
                            {t(`billing.statusLabels.${invoice.status}`)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium">
                          <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() =>
                                setShowActionsMenu(
                                  showActionsMenu === invoice._id ? null : invoice._id
                                )
                              }
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {showActionsMenu === invoice._id && (
                              <div className="absolute right-0 z-10 mt-1.5 w-48 rounded-md border border-gray-100 bg-white shadow-lg">
                                <div className="py-1">
                                  <Link
                                    href={`/billing/invoices/${invoice._id}`}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                    {t('billing.view')}
                                  </Link>
                                  <Link
                                    href={`/billing/invoices/${invoice._id}/edit`}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                    {t('billing.edit')}
                                  </Link>
                                  {invoice.status !== 'paid' && (
                                    <Link
                                      href={`/billing/invoices/${invoice._id}/payment`}
                                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowActionsMenu(null);
                                      }}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                      {t('billing.addPayment')}
                                    </Link>
                                  )}
                                  {invoice.status === 'draft' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowActionsMenu(null);
                                        handleDelete(invoice._id);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      {t('billing.delete')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
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
