'use client';

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Languages, RefreshCw, Plus, Search } from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations, clearMessagesCache } from '@/app/hooks/useTranslations';
import { flattenStringLeaves, mergeStringLeaves } from '@/lib/i18n-message-editor';

type AdminLanguageRow = {
  code: string;
  name: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
  fileExists?: boolean;
};

function topLevelSegment(path: string): string {
  const i = path.indexOf('.');
  return i === -1 ? path : path.slice(0, i);
}

const TranslationFieldRow = memo(function TranslationFieldRow({
  path,
  value,
  onValueChange,
}: {
  path: string;
  value: string;
  onValueChange: (path: string, next: string) => void;
}) {
  const inputId = `i18n-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const rows = Math.min(10, Math.max(2, value.split('\n').length + 1));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,38%)_minmax(0,1fr)] gap-x-3 gap-y-0.5 py-2 border-b border-gray-100 last:border-b-0">
      <label htmlFor={inputId} className="font-mono text-[11px] text-gray-700 break-all pt-1 select-text leading-snug">
        {path}
      </label>
      <textarea
        id={inputId}
        name={path}
        value={value}
        onChange={(e) => onValueChange(path, e.target.value)}
        spellCheck
        rows={rows}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[2.25rem]"
      />
    </div>
  );
});

export default function SettingsLanguagesPage() {
  const { t, translationsLoaded } = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<AdminLanguageRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newFlag, setNewFlag] = useState('🌐');
  const [newDir, setNewDir] = useState<'ltr' | 'rtl'>('ltr');
  const [copyFrom, setCopyFrom] = useState('en');
  const [metaSavingCode, setMetaSavingCode] = useState<string | null>(null);
  const [metaMessage, setMetaMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [editLocale, setEditLocale] = useState<string>('en');
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const baseTreeRef = useRef<unknown>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [valueMap, setValueMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSnapshot, setFilterSnapshot] = useState<Record<string, string>>({});

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch('/api/admin/i18n/languages');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || res.statusText);
      }
      const data = (await res.json()) as { languages: AdminLanguageRow[] };
      setRows(data.languages || []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      loadList();
    }
  }, [status, session, loadList]);

  const tRef = useRef(t);
  tRef.current = t;

  const loadEditor = useCallback(async (code: string) => {
    if (!code) return;
    setEditorLoading(true);
    setEditorMessage(null);
    setSearchQuery('');
    try {
      const res = await fetch(`/api/admin/i18n/messages/${encodeURIComponent(code)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || res.statusText);
      }
      const data = await res.json();
      baseTreeRef.current = data;
      const flat = flattenStringLeaves(data);
      const sortedPaths = flat.map((f) => f.path).sort((a, b) => a.localeCompare(b));
      setPaths(sortedPaths);
      setValueMap(Object.fromEntries(flat.map((f) => [f.path, f.value])));
    } catch (e) {
      baseTreeRef.current = null;
      setPaths([]);
      setValueMap({});
      setEditorMessage({
        type: 'err',
        text: e instanceof Error ? e.message : tRef.current('settings.languagesLoadError'),
      });
    } finally {
      setEditorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'admin') return;
    loadEditor(editLocale);
  }, [editLocale, status, session?.user?.role, loadEditor]);

  useLayoutEffect(() => {
    setFilterSnapshot({ ...valueMap });
  }, [searchQuery, editLocale, paths]);

  const updateString = useCallback((path: string, next: string) => {
    setValueMap((prev) => ({ ...prev, [path]: next }));
  }, []);

  const referenceOptions =
    rows.filter((r) => r.fileExists !== false).length > 0
      ? rows.filter((r) => r.fileExists !== false)
      : [{ code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' as const, fileExists: true as const }];

  const patchLanguageMeta = useCallback(
    async (code: string, patch: { dir?: 'ltr' | 'rtl' }) => {
      setMetaSavingCode(code);
      setMetaMessage(null);
      try {
        const res = await fetch(`/api/admin/i18n/languages/${encodeURIComponent(code)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || tRef.current('settings.languagesMetaError'));
        }
        await loadList();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('i18n-registry-updated'));
        }
        setMetaMessage({ type: 'ok', text: tRef.current('settings.languagesMetaSaved') });
      } catch (err) {
        setMetaMessage({
          type: 'err',
          text: err instanceof Error ? err.message : tRef.current('settings.languagesMetaError'),
        });
      } finally {
        setMetaSavingCode(null);
      }
    },
    [loadList]
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const snap = filterSnapshot;
    let pathList = paths;
    if (q) {
      pathList = paths.filter((path) => {
        if (path.toLowerCase().includes(q)) return true;
        const frozen = snap[path] ?? '';
        return frozen.toLowerCase().includes(q);
      });
    }
    return pathList.map((path) => ({
      path,
      value: valueMap[path] ?? '',
    }));
  }, [paths, valueMap, searchQuery, filterSnapshot]);

  const groupedEntries = useMemo(() => {
    const m = new Map<string, { path: string; value: string }[]>();
    for (const row of filteredEntries) {
      const seg = topLevelSegment(row.path);
      if (!m.has(seg)) m.set(seg, []);
      m.get(seg)!.push(row);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEntries]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMessage(null);
    try {
      const res = await fetch('/api/admin/i18n/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          flag: newFlag,
          dir: newDir,
          copyFrom,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((j as { error?: string }).error || t('settings.languagesCreateError'));
      }
      setCreateMessage({ type: 'ok', text: t('settings.languagesCreatedOk') });
      setNewCode('');
      setNewName('');
      setNewFlag('🌐');
      setNewDir('ltr');
      setCopyFrom('en');
      await loadList();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('i18n-registry-updated'));
      }
    } catch (err) {
      setCreateMessage({
        type: 'err',
        text: err instanceof Error ? err.message : t('settings.languagesCreateError'),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTranslations = async () => {
    if (baseTreeRef.current === null) return;
    setEditorSaving(true);
    setEditorMessage(null);
    try {
      const merged = mergeStringLeaves(baseTreeRef.current, valueMap);
      const res = await fetch(`/api/admin/i18n/messages/${encodeURIComponent(editLocale)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((j as { error?: string }).error || t('settings.languagesSaveError'));
      }
      baseTreeRef.current = merged;
      clearMessagesCache(editLocale);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('i18n-messages-updated', { detail: { locale: editLocale } })
        );
      }
      setEditorMessage({ type: 'ok', text: t('settings.languagesSavedOk') });
    } catch (err) {
      setEditorMessage({
        type: 'err',
        text: err instanceof Error ? err.message : t('settings.languagesSaveError'),
      });
    } finally {
      setEditorSaving(false);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('settings.languages')} description={t('settings.languagesDescription')} dense>
        <div className="max-w-6xl mx-auto space-y-4">
          <Link
            href="/settings"
            className="inline-flex items-center text-xs text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            {t('settings.title')}
          </Link>

          <section className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-900">{t('settings.languagesList')}</h2>
              <button
                type="button"
                onClick={() => loadList()}
                disabled={listLoading}
                className="ml-auto inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${listLoading ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </button>
            </div>
            {listError ? <p className="text-xs text-red-600">{listError}</p> : null}
            {metaMessage ? (
              <p
                className={`text-xs ${metaMessage.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}
              >
                {metaMessage.text}
              </p>
            ) : null}
            {!listLoading && !listError ? (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                {rows.map((row) => (
                  <li
                    key={row.code}
                    className="flex flex-col gap-2 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="text-base mr-1.5">{row.flag}</span>
                      <span className="font-medium text-gray-900">{row.name}</span>
                      <span className="text-gray-500 ml-1.5">({row.code})</span>
                      {row.fileExists === false ? (
                        <span className="ml-1.5 text-amber-600 text-[11px]">
                          — {t('settings.languagesMissingFile')}
                        </span>
                      ) : null}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor={`dir-${row.code}`}
                          className="text-[11px] text-gray-500 whitespace-nowrap"
                        >
                          {t('settings.languagesTextDirection')}
                        </label>
                        <select
                          id={`dir-${row.code}`}
                          value={row.dir === 'rtl' ? 'rtl' : 'ltr'}
                          disabled={metaSavingCode === row.code}
                          onChange={(e) => {
                            const dir = e.target.value === 'rtl' ? 'rtl' : 'ltr';
                            patchLanguageMeta(row.code, { dir });
                          }}
                          className="px-1.5 py-1 border border-gray-300 rounded-md text-[11px] bg-white disabled:opacity-50"
                        >
                          <option value="ltr">{t('settings.languagesDirLtr')}</option>
                          <option value="rtl">{t('settings.languagesDirRtl')}</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditLocale(row.code)}
                        className={`text-xs text-blue-600 hover:text-blue-800 ${editLocale === row.code ? 'font-semibold' : ''}`}
                      >
                        {t('common.edit')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-gray-900">{t('settings.languagesCreate')}</h2>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  {t('settings.languagesLocaleCode')}
                </label>
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="de"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{t('settings.languagesLocaleCodeHint')}</p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  {t('settings.languagesDisplayName')}
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Deutsch"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  {t('settings.languagesFlagEmoji')}
                </label>
                <input
                  value={newFlag}
                  onChange={(e) => setNewFlag(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  {t('settings.languagesCopyFrom')}
                </label>
                <select
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                >
                  {referenceOptions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.flag} {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  {t('settings.languagesTextDirection')}
                </label>
                <select
                  value={newDir}
                  onChange={(e) => setNewDir(e.target.value === 'rtl' ? 'rtl' : 'ltr')}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                >
                  <option value="ltr">{t('settings.languagesDirLtr')}</option>
                  <option value="rtl">{t('settings.languagesDirRtl')}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {creating ? t('common.saving') : t('settings.languagesCreate')}
                </button>
                {createMessage ? (
                  <p
                    className={`mt-1.5 text-xs ${createMessage.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {createMessage.text}
                  </p>
                ) : null}
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 space-y-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-gray-900">{t('settings.languagesJsonEditor')}</h2>
              <p className="text-xs text-gray-500">{t('settings.languagesSelectToEdit')}</p>
              <p className="text-[11px] text-gray-500 max-w-3xl leading-snug">
                {t('settings.languagesFileSourceHint')}
              </p>
            </div>

            {editorMessage ? (
              <p
                className={`text-xs ${editorMessage.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}
              >
                {editorMessage.text}
              </p>
            ) : null}

            {editorLoading ? (
              <p className="text-xs text-gray-500 py-8 text-center">{t('common.loading')}</p>
            ) : baseTreeRef.current === null ? (
              editorMessage?.type === 'err' ? null : (
                <p className="text-xs text-gray-500 py-8 text-center">
                  {t('settings.languagesLoadError')}
                </p>
              )
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveTranslations();
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                      {t('settings.languagesSelectToEdit')}
                    </label>
                    <select
                      value={editLocale}
                      onChange={(e) => setEditLocale(e.target.value)}
                      className="w-full max-w-md px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                    >
                      {rows.map((r) => (
                        <option key={r.code} value={r.code} disabled={r.fileExists === false}>
                          {r.flag} {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadEditor(editLocale)}
                      disabled={editorLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${editorLoading ? 'animate-spin' : ''}`} />
                      {t('settings.languagesReload')}
                    </button>
                    <button
                      type="submit"
                      disabled={editorSaving || editorLoading || baseTreeRef.current === null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {editorSaving ? t('common.saving') : t('settings.languagesSaveTranslations')}
                    </button>
                  </div>
                </div>

                <div className="rounded-md border border-gray-200 bg-slate-50/50 p-2 space-y-1.5">
                  <label className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                    {t('common.search')}
                  </label>
                  <div className="relative max-w-xl">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('settings.languagesSearchPlaceholder')}
                      className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {filteredEntries.length} / {paths.length}
                  </p>
                </div>

                <div className="space-y-2">
                  {filteredEntries.length === 0 ? (
                    <p className="text-xs text-gray-500 py-6 text-center">
                      {t('settings.languagesNoMatches')}
                    </p>
                  ) : (
                    groupedEntries.map(([section, entries]) => (
                      <fieldset
                        key={section}
                        className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                      >
                        <legend className="sr-only">
                          {section} ({entries.length})
                        </legend>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-900 bg-gray-50/90 border-b border-gray-100">
                          {section}
                          <span className="ml-1.5 font-normal text-gray-500">({entries.length})</span>
                        </div>
                        <div className="px-3 pb-1">
                          {entries.map((row) => (
                            <TranslationFieldRow
                              key={row.path}
                              path={row.path}
                              value={row.value}
                              onValueChange={updateString}
                            />
                          ))}
                        </div>
                      </fieldset>
                    ))
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
