'use client';

import { useState } from 'react';
import { Archive, Trash2, X } from 'lucide-react';

export type DeleteTarget = { type: 'user' | 'patient'; id: string; name: string; label: string };

/** Admin choice: archive (soft delete, restorable) or delete for good. Both free the email/phone for a fresh sign-up. */
export function DeleteAccountModal({ target, onClose, onDone }: { target: DeleteTarget | null; onClose: () => void; onDone: (message: string) => void }) {
  const [mode, setMode] = useState<'soft' | 'permanent'>('soft');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!target) return null;

  const run = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: target.type, id: target.id, action: mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      onDone(mode === 'soft' ? `${target.name} was archived. They can register again.` : `${target.name} was permanently deleted. They can register again.`);
      setConfirmText(''); setMode('soft');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally { setBusy(false); }
  };

  const permanentOk = mode !== 'permanent' || confirmText.trim().toUpperCase() === 'DELETE';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-950">Remove {target.label}</h3>
            <p className="mt-0.5 text-sm text-gray-600">{target.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 space-y-2">
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === 'soft' ? 'border-violet-500 bg-violet-50' : 'border-gray-200'}`}>
            <input type="radio" checked={mode === 'soft'} onChange={() => setMode('soft')} className="mt-1" />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><Archive className="h-4 w-4" /> Archive (soft delete)</p>
              <p className="mt-0.5 text-xs text-gray-600">Hidden everywhere and signed out. Their records stay and you can restore them later. Their email and phone are freed so they can register again.</p>
            </div>
          </label>
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === 'permanent' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
            <input type="radio" checked={mode === 'permanent'} onChange={() => setMode('permanent')} className="mt-1" />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700"><Trash2 className="h-4 w-4" /> Delete permanently</p>
              <p className="mt-0.5 text-xs text-gray-600">Removes the account for good. This cannot be undone. Past appointments and payment records are kept for the books.</p>
            </div>
          </label>
        </div>

        {mode === 'permanent' && (
          <div className="mt-3">
            <p className="text-xs text-gray-600">Type <span className="font-semibold">DELETE</span> to confirm.</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-gray-300 px-3 text-sm" autoFocus />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-gray-200 px-4 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={run} disabled={busy || !permanentOk}
            className={`h-9 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-40 ${mode === 'permanent' ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}`}>
            {busy ? 'Working…' : mode === 'permanent' ? 'Delete permanently' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
