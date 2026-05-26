'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';

export function LandingChatWidgetSettings() {
  const [cms, setCms] = useState<WebsiteContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/website');
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data !== 'object') {
        throw new Error('Failed to load');
      }
      setCms(data as WebsiteContentData);
    } catch {
      setNotice({ type: 'err', text: 'Could not load website settings.' });
      setCms(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (
    partial: Partial<
      Pick<WebsiteContentData, 'landingChatbotEnabled' | 'landingChatbotTitle' | 'landingChatWelcome'>
    >
  ) => {
    setCms((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const save = async () => {
    if (!cms) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cms),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');
      if (data.content) setCms(data.content as WebsiteContentData);
      setNotice({ type: 'ok', text: 'Saved.' });
    } catch (e) {
      setNotice({
        type: 'err',
        text: e instanceof Error ? e.message : 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden />
      </div>
    );
  }

  if (!cms) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Load failed.{' '}
        <button type="button" className="font-semibold underline" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <div
          role="alert"
          className={`relative flex gap-3 rounded-xl border px-4 py-3 pr-10 ${
            notice.type === 'ok'
              ? 'border-teal-200 bg-teal-50/90 text-teal-950'
              : 'border-red-200 bg-red-50 text-red-950'
          }`}
        >
          {notice.type === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          )}
          <p className="text-sm">{notice.text}</p>
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute right-2 top-2 rounded-lg p-1.5 opacity-60 hover:bg-black/5 hover:opacity-100"
            onClick={() => setNotice(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          checked={cms.landingChatbotEnabled}
          onChange={(e) => patch({ landingChatbotEnabled: e.target.checked })}
        />
        <span className="text-sm font-medium text-gray-900">Show chat widget on landing page</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="landing-chat-title" className="text-xs font-semibold text-gray-800">
            Button label
          </label>
          <input
            id="landing-chat-title"
            type="text"
            value={cms.landingChatbotTitle}
            onChange={(e) => patch({ landingChatbotTitle: e.target.value })}
            className={inputCls}
            placeholder="Ask us"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="landing-chat-welcome" className="text-xs font-semibold text-gray-800">
            Welcome message
          </label>
          <textarea
            id="landing-chat-welcome"
            value={cms.landingChatWelcome}
            onChange={(e) => patch({ landingChatWelcome: e.target.value })}
            rows={4}
            className={`${inputCls} min-h-[100px] resize-y leading-relaxed`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void load()}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
