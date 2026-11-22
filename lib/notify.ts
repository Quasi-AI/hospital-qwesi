'use client';

import toast from 'react-hot-toast';

const BAD = /\b(fail|failed|error|invalid|unable|could not|couldn'?t|cannot|can'?t|denied|wrong|required|not found|not allowed|unauthori[sz]ed|expired|incorrect|missing|must|please (?:add|select|enter|fill|choose|provide|check|try)|already exists|no active|too (?:short|long|large))\b/i;

/** Show a toast. The kind is guessed from the wording unless given. Drop-in replacement for window.alert(). */
export function notify(message: unknown, kind?: 'success' | 'error' | 'info'): string {
  const text = String(message ?? '').trim();
  if (!text) return '';
  const k = kind || (BAD.test(text) ? 'error' : 'success');
  if (k === 'error') return toast.error(text);
  if (k === 'info') return toast(text);
  return toast.success(text);
}

export const notifySuccess = (m: unknown) => notify(m, 'success');
export const notifyError = (m: unknown) => notify(m, 'error');
