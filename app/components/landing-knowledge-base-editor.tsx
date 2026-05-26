'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Braces,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

export type LandingKbKind = 'text' | 'json' | 'link' | 'file';

type ListRow = {
  _id: string;
  title: string;
  enabled: boolean;
  kind: LandingKbKind;
  sortOrder: number;
  hasFile: boolean;
  resolvedPreview: string;
  updatedAt?: string;
};

type FullEntry = {
  _id: string;
  title: string;
  enabled: boolean;
  kind: LandingKbKind;
  textBody: string;
  jsonBody: string;
  linkUrl: string;
  fileName: string;
  mimeType: string;
  sortOrder: number;
};

const MAX_FILE_BYTES = 400 * 1024;

const KIND_LABELS: Record<LandingKbKind, string> = {
  text: 'Text',
  json: 'JSON',
  link: 'Link',
  file: 'File',
};

const KIND_BORDER: Record<LandingKbKind, string> = {
  text: 'border-l-sky-500',
  json: 'border-l-violet-500',
  link: 'border-l-amber-500',
  file: 'border-l-slate-500',
};

const KIND_BADGE: Record<LandingKbKind, string> = {
  text: 'bg-sky-50 text-sky-900 ring-sky-200/90',
  json: 'bg-violet-50 text-violet-900 ring-violet-200/90',
  link: 'bg-amber-50 text-amber-950 ring-amber-200/90',
  file: 'bg-slate-100 text-slate-800 ring-slate-200/90',
};

const KIND_ICONS = {
  text: FileText,
  json: Braces,
  link: Link2,
  file: Upload,
} as const;

function stripDataUrlPrefix(dataUrl: string): string {
  const m = /^data:[^;]+;base64,(.+)$/s.exec(dataUrl.trim());
  return m ? m[1] : dataUrl.trim();
}

async function readFileAsRawBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      resolve(stripDataUrlPrefix(r));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';

const textareaCls = `${inputCls} min-h-[140px] resize-y leading-relaxed`;

function KindPicker({
  value,
  onChange,
  disabled,
}: {
  value: LandingKbKind;
  onChange: (k: LandingKbKind) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(Object.keys(KIND_LABELS) as LandingKbKind[]).map((id) => {
        const Icon = KIND_ICONS[id];
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all disabled:opacity-50 ${
              selected
                ? 'border-teal-500 bg-teal-50/90 shadow-md shadow-teal-600/10 ring-2 ring-teal-500/20'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${selected ? 'text-teal-700' : 'text-gray-500'}`}
              aria-hidden
            />
            <span className={`text-xs font-semibold ${selected ? 'text-teal-950' : 'text-gray-900'}`}>
              {KIND_LABELS[id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SourceFields({
  form,
  updateForm,
  pendingFile,
  onPickFile,
}: {
  form: FullEntry;
  updateForm: (patch: Partial<FullEntry>) => void;
  pendingFile: { base64: string; name: string; mime: string } | null;
  onPickFile: (file: File | null) => Promise<void>;
}) {
  return (
    <>
      {form.kind === 'text' ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-800">Content</label>
          <textarea
            value={form.textBody}
            onChange={(e) => updateForm({ textBody: e.target.value })}
            rows={10}
            className={textareaCls}
            spellCheck
          />
        </div>
      ) : null}

      {form.kind === 'json' ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-800">JSON</label>
          <textarea
            value={form.jsonBody}
            onChange={(e) => updateForm({ jsonBody: e.target.value })}
            rows={12}
            className={`${textareaCls} font-mono text-[13px] leading-snug`}
            spellCheck={false}
          />
        </div>
      ) : null}

      {form.kind === 'link' ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-800">HTTPS URL</label>
          <input
            type="url"
            placeholder="https://"
            value={form.linkUrl}
            onChange={(e) => updateForm({ linkUrl: e.target.value })}
            className={inputCls}
          />
        </div>
      ) : null}

      {form.kind === 'file' ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-800">File (max {MAX_FILE_BYTES / 1024} KB)</label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-6 transition hover:border-teal-400">
            <Upload className="h-7 w-7 text-gray-400" aria-hidden />
            <span className="text-xs text-gray-600">Choose file</span>
            <input
              type="file"
              accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv"
              className="sr-only"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {pendingFile ? (
            <p className="text-xs font-medium text-teal-800">{pendingFile.name}</p>
          ) : form.fileName ? (
            <p className="text-xs text-gray-600">
              {form.fileName} <span className="text-gray-400">({form.mimeType})</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function LandingKnowledgeBaseEditor() {
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<FullEntry | null>(null);
  const [pendingFile, setPendingFile] = useState<{ base64: string; name: string; mime: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const updateForm = useCallback((patch: Partial<FullEntry>) => {
    setEditForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/landing-knowledge');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Load failed');
      setRows(Array.isArray(data.entries) ? data.entries : []);
    } catch (e) {
      setNotice({ type: 'err', text: e instanceof Error ? e.message : 'Failed to load knowledge base' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openNew = () => {
    setExpandedId('new');
    setPendingFile(null);
    setEditForm({
      _id: '',
      title: '',
      enabled: true,
      kind: 'text',
      textBody: '',
      jsonBody: '',
      linkUrl: '',
      fileName: '',
      mimeType: '',
      sortOrder: rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0,
    });
  };

  const openEdit = async (id: string) => {
    setExpandedId(id);
    setPendingFile(null);
    setEditLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/landing-knowledge/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Load failed');
      const e = data.entry as Record<string, unknown>;
      setEditForm({
        _id: String(e._id),
        title: String(e.title ?? ''),
        enabled: Boolean(e.enabled),
        kind: (e.kind as LandingKbKind) || 'text',
        textBody: String(e.textBody ?? ''),
        jsonBody: String(e.jsonBody ?? ''),
        linkUrl: String(e.linkUrl ?? ''),
        fileName: String(e.fileName ?? ''),
        mimeType: String(e.mimeType ?? ''),
        sortOrder: typeof e.sortOrder === 'number' ? e.sortOrder : 0,
      });
    } catch (err) {
      setNotice({ type: 'err', text: err instanceof Error ? err.message : 'Failed to open entry' });
      setExpandedId(null);
      setEditForm(null);
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEdit = () => {
    setExpandedId(null);
    setEditForm(null);
    setPendingFile(null);
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/landing-knowledge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Update failed');
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, enabled } : r)));
    } catch (e) {
      setNotice({ type: 'err', text: e instanceof Error ? e.message : 'Toggle failed' });
    }
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return;
    try {
      const res = await fetch(`/api/admin/landing-knowledge/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Delete failed');
      setRows((prev) => prev.filter((r) => r._id !== id));
      if (expandedId === id) cancelEdit();
      setNotice({ type: 'ok', text: 'Entry deleted.' });
    } catch (e) {
      setNotice({ type: 'err', text: e instanceof Error ? e.message : 'Delete failed' });
    }
  };

  const onPickFile = async (file: File | null) => {
    setPendingFile(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setNotice({ type: 'err', text: `File too large (max ${MAX_FILE_BYTES / 1024} KB).` });
      return;
    }
    try {
      const base64 = await readFileAsRawBase64(file);
      setPendingFile({ base64, name: file.name, mime: file.type || 'application/octet-stream' });
    } catch {
      setNotice({ type: 'err', text: 'Could not read file.' });
    }
  };

  const submit = async (refreshLink?: boolean) => {
    if (!editForm) return;
    const title = editForm.title.trim();
    if (!title) {
      setNotice({ type: 'err', text: 'Title is required.' });
      return;
    }

    setSaving(true);
    setNotice(null);

    const body: Record<string, unknown> = {
      title,
      enabled: editForm.enabled,
      kind: editForm.kind,
      textBody: editForm.textBody,
      jsonBody: editForm.jsonBody,
      linkUrl: editForm.linkUrl,
      sortOrder: editForm.sortOrder,
      refreshLink: refreshLink === true,
    };

    if (editForm.kind === 'file') {
      if (pendingFile) {
        body.fileName = pendingFile.name;
        body.mimeType = pendingFile.mime;
        body.fileBase64 = pendingFile.base64;
      } else if (expandedId !== 'new') {
        body.keepExistingFile = true;
      }
    }

    try {
      const isNew = expandedId === 'new';
      const url = isNew ? '/api/admin/landing-knowledge' : `/api/admin/landing-knowledge/${editForm._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');

      await refresh();
      cancelEdit();
      setNotice({ type: 'ok', text: isNew ? 'Entry created.' : 'Entry saved.' });
    } catch (e) {
      setNotice({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const disabledOthers = expandedId !== null;

  return (
    <div className="space-y-5">
      {notice ? (
        <div
          role="alert"
          className={`relative flex gap-3 rounded-xl border px-4 py-3 pr-10 shadow-sm ${
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
          <p className="text-sm leading-relaxed">{notice.text}</p>
          <button
            type="button"
            className="absolute right-2 top-2 rounded-lg p-1.5 text-current opacity-60 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss"
            onClick={() => setNotice(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Reload
        </button>
        <button
          type="button"
          onClick={openNew}
          disabled={disabledOthers}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New entry
        </button>
      </div>

      {/* Create panel */}
      {expandedId === 'new' && editForm ? (
        <div className="overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
            <h4 className="text-sm font-semibold text-gray-900">New entry</h4>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-800">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-800">Sort order</label>
                <input
                  type="number"
                  value={editForm.sortOrder}
                  onChange={(e) => updateForm({ sortOrder: Number(e.target.value) || 0 })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-800">Type</label>
              <KindPicker value={editForm.kind} onChange={(k) => updateForm({ kind: k })} disabled={saving} />
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                checked={editForm.enabled}
                onChange={(e) => updateForm({ enabled: e.target.checked })}
              />
              <span className="text-sm text-gray-900">Enabled</span>
            </label>

            <SourceFields
              form={editForm}
              updateForm={updateForm}
              pendingFile={pendingFile}
              onPickFile={onPickFile}
            />

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16">
          <Loader2 className="h-9 w-9 animate-spin text-teal-600" aria-hidden />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      ) : rows.length === 0 && expandedId !== 'new' ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-gradient-to-b from-gray-50 to-white px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <BookOpen className="h-7 w-7" aria-hidden />
          </div>
          <p className="text-base font-semibold text-gray-900">No entries yet</p>
          <button
            type="button"
            onClick={openNew}
            disabled={disabledOthers}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-500 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New entry
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const RowIcon = KIND_ICONS[r.kind];
            return (
              <li
                key={r._id}
                className={`overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm transition hover:shadow-md ${KIND_BORDER[r.kind]} border-l-4`}
              >
                <div className="flex flex-wrap items-start gap-3 p-4 sm:gap-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.enabled}
                    aria-label={r.enabled ? 'Disable entry' : 'Enable entry'}
                    onClick={() => void toggleEnabled(r._id, !r.enabled)}
                    className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                      r.enabled ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-out ${
                        r.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <div className="flex min-w-0 flex-1 gap-3">
                    <div
                      className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 sm:flex ${KIND_BADGE[r.kind]}`}
                    >
                      <RowIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{r.title || '(Untitled)'}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${KIND_BADGE[r.kind]}`}
                        >
                          {KIND_LABELS[r.kind]}
                        </span>
                      </div>
                      {r.resolvedPreview ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">{r.resolvedPreview}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => void openEdit(r._id)}
                      disabled={expandedId !== null && expandedId !== r._id}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteRow(r._id)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedId === r._id ? (
                  <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/90 to-white px-4 py-5 sm:px-6 sm:py-6">
                    {editLoading || !editForm ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden />
                      </div>
                    ) : (
                      <div className="mx-auto max-w-3xl space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-800">Title</label>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) => updateForm({ title: e.target.value })}
                              className={inputCls}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-800">Sort order</label>
                            <input
                              type="number"
                              value={editForm.sortOrder}
                              onChange={(e) =>
                                updateForm({ sortOrder: Number(e.target.value) || 0 })
                              }
                              className={inputCls}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-800">Type</label>
                          <KindPicker
                            value={editForm.kind}
                            onChange={(k) => updateForm({ kind: k })}
                            disabled={saving}
                          />
                        </div>

                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            checked={editForm.enabled}
                            onChange={(e) => updateForm({ enabled: e.target.checked })}
                          />
                          <span className="text-sm text-gray-900">Enabled</span>
                        </label>

                        <SourceFields
                          form={editForm}
                          updateForm={updateForm}
                          pendingFile={pendingFile}
                          onPickFile={onPickFile}
                        />

                        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submit()}
                            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Save
                          </button>
                          {editForm.kind === 'link' ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void submit(true)}
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                            >
                              <RefreshCw className="h-4 w-4" aria-hidden />
                              Refresh URL
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
