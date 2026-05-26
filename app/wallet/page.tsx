'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { Building2, CreditCard, Loader2, Phone, Plus, Send, Star, Trash2 } from 'lucide-react';

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    amount: '',
    payoutMethodId: '',
    payoutMethod: 'mobile_money',
    accountName: '',
    accountNumber: '',
    mobileMoneyProvider: '',
    bankName: '',
    bankCode: '',
    notes: '',
  });
  const [methodForm, setMethodForm] = useState({
    type: 'mobile_money',
    label: '',
    accountName: '',
    accountNumber: '',
    mobileMoneyProvider: '',
    bankName: '',
    bankCode: '',
    isDefault: true,
  });

  const loadWallet = async () => {
    setLoading(true);
    const response = await fetch('/api/wallet');
    const data = await response.json();
    if (response.ok) {
      setWallet(data.wallet);
      setWithdrawals(data.withdrawals || []);
    } else {
      setMessage(data.error || 'Unable to load wallet');
    }
    setLoading(false);
  };

  const loadPayoutMethods = async () => {
    const response = await fetch('/api/wallet/payment-methods');
    const data = await response.json();
    if (response.ok) {
      setPayoutMethods(data.methods || []);
      const defaultMethod = (data.methods || []).find((method: any) => method.isDefault) || data.methods?.[0];
      if (defaultMethod) {
        setForm((prev) => ({ ...prev, payoutMethodId: defaultMethod._id }));
      }
    }
  };

  useEffect(() => {
    loadWallet();
    loadPayoutMethods();
  }, []);

  const addPayoutMethod = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingMethod(true);
    setMessage('');
    const response = await fetch('/api/wallet/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(methodForm),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage('Payment method saved.');
      setMethodForm({
        type: 'mobile_money',
        label: '',
        accountName: '',
        accountNumber: '',
        mobileMoneyProvider: '',
        bankName: '',
        bankCode: '',
        isDefault: true,
      });
      await loadPayoutMethods();
    } else {
      setMessage(data.error || 'Could not save payment method.');
    }
    setSavingMethod(false);
  };

  const setDefaultMethod = async (id: string) => {
    await fetch(`/api/wallet/payment-methods/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    await loadPayoutMethods();
  };

  const deleteMethod = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    await fetch(`/api/wallet/payment-methods/${id}`, { method: 'DELETE' });
    await loadPayoutMethods();
  };

  const submitWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage('Withdrawal request submitted.');
      setForm({
        amount: '',
        payoutMethodId: payoutMethods.find((method) => method.isDefault)?._id || '',
        payoutMethod: 'mobile_money',
        accountName: '',
        accountNumber: '',
        mobileMoneyProvider: '',
        bankName: '',
        bankCode: '',
        notes: '',
      });
      await loadWallet();
    } else {
      setMessage(data.error || 'Withdrawal request failed.');
    }
    setSaving(false);
  };

  return (
    <ProtectedRoute>
      <SidebarLayout title="Wallet" description="Doctor and staff earnings wallet" dense>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Available</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">GHS {wallet?.availableBalance?.toFixed?.(2) || '0.00'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Pending withdrawals</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">GHS {wallet?.pendingBalance?.toFixed?.(2) || '0.00'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Lifetime earnings</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">GHS {wallet?.lifetimeEarnings?.toFixed?.(2) || '0.00'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Saved payment methods</h2>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {payoutMethods.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 md:col-span-2">
                      Add a Mobile Money or bank account so the admin team can pay your approved withdrawals.
                    </p>
                  ) : (
                    payoutMethods.map((method) => (
                      <div key={method._id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {method.type === 'bank' ? (
                                <Building2 className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Phone className="h-4 w-4 text-blue-600" />
                              )}
                              <p className="truncate text-sm font-semibold text-gray-900">{method.label}</p>
                              {method.isDefault && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Default</span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-600">{method.accountName}</p>
                            <p className="text-xs text-gray-500">
                              {method.type === 'bank'
                                ? `${method.bankName || 'Bank'} - ${method.accountNumber}`
                                : `${method.mobileMoneyProvider || 'Mobile Money'} - ${method.accountNumber}`}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {!method.isDefault && (
                              <button
                                type="button"
                                onClick={() => setDefaultMethod(method._id)}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                                title="Set as default"
                              >
                                <Star className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteMethod(method._id)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-900">Withdrawal requests</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-500">
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">Method</th>
                        <th className="py-2 pr-4">Account</th>
                        <th className="py-2 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-500">No withdrawal requests yet.</td>
                        </tr>
                      ) : (
                        withdrawals.map((request) => (
                          <tr key={request._id}>
                            <td className="py-2 pr-4 font-medium">GHS {Number(request.amount).toFixed(2)}</td>
                            <td className="py-2 pr-4 capitalize">{request.payoutMethod.replace('_', ' ')}</td>
                            <td className="py-2 pr-4">{request.accountName}</td>
                            <td className="py-2 pr-4 capitalize">{request.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-4">
            <form onSubmit={addPayoutMethod} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Add payment method</h2>
              {message && <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">{message}</p>}
              <div className="mt-4 space-y-3">
                <select
                  value={methodForm.type}
                  onChange={(e) => setMethodForm({ ...methodForm, type: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank account</option>
                </select>
                <input
                  type="text"
                  placeholder="Label, e.g. MTN MoMo or GCB Bank"
                  value={methodForm.label}
                  onChange={(e) => setMethodForm({ ...methodForm, label: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Account name"
                  value={methodForm.accountName}
                  onChange={(e) => setMethodForm({ ...methodForm, accountName: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder={methodForm.type === 'bank' ? 'Account number' : 'Mobile money number'}
                  value={methodForm.accountNumber}
                  onChange={(e) => setMethodForm({ ...methodForm, accountNumber: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {methodForm.type === 'bank' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Bank name"
                      value={methodForm.bankName}
                      onChange={(e) => setMethodForm({ ...methodForm, bankName: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Bank code (optional)"
                      value={methodForm.bankCode}
                      onChange={(e) => setMethodForm({ ...methodForm, bankCode: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </>
                ) : (
                  <input
                    type="text"
                    placeholder="Provider, e.g. MTN, Telecel, AT"
                    value={methodForm.mobileMoneyProvider}
                    onChange={(e) => setMethodForm({ ...methodForm, mobileMoneyProvider: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={methodForm.isDefault}
                    onChange={(e) => setMethodForm({ ...methodForm, isDefault: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Use as default payout method
                </label>
                <button
                  type="submit"
                  disabled={savingMethod}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-blue-600 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  {savingMethod ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Save payment method
                </button>
              </div>
            </form>

            <form onSubmit={submitWithdrawal} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Request withdrawal</h2>
              <div className="mt-4 space-y-3">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {payoutMethods.length > 0 && (
                  <select
                    value={form.payoutMethodId}
                    onChange={(e) => setForm({ ...form, payoutMethodId: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Use manual payout details</option>
                    {payoutMethods.map((method) => (
                      <option key={method._id} value={method._id}>
                        {method.label} - {method.type === 'bank' ? method.bankName : method.mobileMoneyProvider}
                      </option>
                    ))}
                  </select>
                )}
                {!form.payoutMethodId && (
                  <>
                <select
                  value={form.payoutMethod}
                  onChange={(e) => setForm({ ...form, payoutMethod: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank account</option>
                </select>
                <input
                  type="text"
                  placeholder="Account name"
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder={form.payoutMethod === 'bank' ? 'Account number' : 'Mobile money number'}
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {form.payoutMethod === 'bank' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Bank name"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Bank code (optional)"
                      value={form.bankCode}
                      onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </>
                ) : (
                  <input
                    type="text"
                    placeholder="Mobile money provider"
                    value={form.mobileMoneyProvider}
                    onChange={(e) => setForm({ ...form, mobileMoneyProvider: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                  </>
                )}
                <textarea
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="min-h-20 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit request
                </button>
              </div>
            </form>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
