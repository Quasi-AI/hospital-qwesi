'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Stethoscope, X } from 'lucide-react';
import { DoctorCard, DoctorCardSkeleton, type PublicDoctor } from './doctor-card';

type Sort = 'recommended' | 'price-asc' | 'price-desc' | 'rating' | 'experience';

export function usePublicDoctors() {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/booking/doctors')
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.error || 'Could not load doctors');
        if (!cancelled) setDoctors(Array.isArray(data) ? data : []);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load doctors'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { doctors, loading, error };
}

const specialtyOf = (d: PublicDoctor) => d.specialization || d.department || 'General Practice';

export function DoctorMarketplace({ initialSpecialty = '', portal = false }: { initialSpecialty?: string; portal?: boolean }) {
  const { doctors, loading, error } = usePublicDoctors();
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [kind, setKind] = useState<'' | 'doctor' | 'herbalist'>('');
  const [language, setLanguage] = useState('');
  const [maxFee, setMaxFee] = useState<number | null>(null);
  const [currency, setCurrency] = useState('');
  const [sort, setSort] = useState<Sort>('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const specialties = useMemo(
    () => Array.from(new Set(doctors.map(specialtyOf))).sort((a, b) => a.localeCompare(b)),
    [doctors]
  );
  const languages = useMemo(
    () => Array.from(new Set(doctors.flatMap((d) => d.languages))).sort((a, b) => a.localeCompare(b)),
    [doctors]
  );
  const currencies = useMemo(() => Array.from(new Set(doctors.map((d) => d.currency || 'GHS'))).sort(), [doctors]);
  // Fees in different currencies can't be compared, so price tools work within one currency
  const activeCurrency = currency || (currencies.length === 1 ? currencies[0] : '');
  const highestFee = useMemo(
    () => Math.max(0, ...doctors.filter((d) => !activeCurrency || (d.currency || 'GHS') === activeCurrency).map((d) => d.consultationFee)),
    [doctors, activeCurrency]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = doctors.filter((d) => {
      if (kind && (d.practitionerType || 'doctor') !== kind) return false;
      if (specialty && specialtyOf(d) !== specialty) return false;
      if (language && !d.languages.includes(language)) return false;
      if (currency && (d.currency || 'GHS') !== currency) return false;
      if (maxFee != null && d.consultationFee > maxFee) return false;
      if (!q) return true;
      return [d.name, specialtyOf(d), d.bio, ...d.qualifications, ...d.languages].join(' ').toLowerCase().includes(q);
    });
    const sorted = [...list];
    if (sort === 'price-asc' && activeCurrency) sorted.sort((a, b) => a.consultationFee - b.consultationFee);
    else if (sort === 'price-desc' && activeCurrency) sorted.sort((a, b) => b.consultationFee - a.consultationFee);
    else if (sort === 'rating') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sort === 'experience') sorted.sort((a, b) => (b.yearsOfExperience ?? 0) - (a.yearsOfExperience ?? 0));
    else sorted.sort((a, b) => (b.rating ?? 0) * Math.log(2 + b.ratingCount) - (a.rating ?? 0) * Math.log(2 + a.ratingCount));
    return sorted;
  }, [doctors, query, kind, specialty, language, currency, activeCurrency, maxFee, sort]);

  const activeFilters = [specialty, language, currency, maxFee != null ? `≤ ${activeCurrency} ${maxFee}` : ''].filter(Boolean).length;
  const clearAll = () => {
    setQuery('');
    setSpecialty('');
    setLanguage('');
    setCurrency('');
    setMaxFee(null);
  };

  const selectCls =
    'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

  return (
    <div>
      <div className="glass rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search doctors</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, specialty or language"
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-base text-gray-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Sort doctors"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-12 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-52 sm:flex-none"
            >
              <option value="recommended">Recommended</option>
              <option value="price-asc" disabled={!activeCurrency}>Fee: low to high</option>
              <option value="price-desc" disabled={!activeCurrency}>Fee: high to low</option>
              <option value="rating">Top rated</option>
              <option value="experience">Most experienced</option>
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="relative inline-flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilters > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] text-white">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-3 gap-3 sm:grid-cols-3 lg:grid`}>
          <select aria-label="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={selectCls}>
            <option value="">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} className={selectCls}>
            <option value="">Any language</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {currencies.length > 1 && (
            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setMaxFee(null);
              }}
              className={selectCls}
            >
              <option value="">All currencies</option>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <label className={`flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 ${activeCurrency ? '' : 'opacity-50'}`}>
            <span className="shrink-0 whitespace-nowrap">Max fee</span>
            <input
              type="range"
              min={0}
              max={Math.max(50, Math.ceil(highestFee / 10) * 10)}
              step={10}
              value={maxFee ?? Math.max(50, Math.ceil(highestFee / 10) * 10)}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMaxFee(v >= Math.max(50, Math.ceil(highestFee / 10) * 10) ? null : v);
              }}
              disabled={!activeCurrency}
              title={activeCurrency ? undefined : 'Pick a currency to filter by fee'}
              className="w-full accent-brand-600"
            />
            <span className="w-24 shrink-0 text-right font-semibold text-brand-800">{maxFee != null ? `${activeCurrency} ${maxFee}` : 'Any'}</span>
          </label>
        </div>
      </div>

      {doctors.some((d) => d.practitionerType === 'herbalist') && (
        <div className="mt-4 inline-flex rounded-full border border-gray-200 bg-white p-1 text-sm font-semibold" role="tablist" aria-label="Practitioner type">
          {([['', 'All'], ['doctor', 'Doctors'], ['herbalist', 'Herbalists']] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={kind === v}
              onClick={() => setKind(v)}
              className={`rounded-full px-4 py-1.5 transition ${kind === v ? 'bg-brand-600 text-white' : 'text-gray-700 hover:text-brand-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {specialties.length > 0 && (
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Specialties">
          <button
            type="button"
            onClick={() => setSpecialty('')}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              !specialty ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'
            }`}
          >
            All
          </button>
          {specialties.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecialty(specialty === s ? '' : s)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                specialty === s ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between text-sm text-gray-600" aria-live="polite">
        <p>
          {loading ? 'Loading doctors…' : `${results.length} doctor${results.length === 1 ? '' : 's'} available`}
        </p>
        {(activeFilters > 0 || query) && (
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
            <X className="h-4 w-4" /> Clear all
          </button>
        )}
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{error}</div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <DoctorCardSkeleton key={i} />)
            : results.map((d) => <DoctorCard key={d.id} doctor={d} portal={portal} />)}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-brand-300" />
          <p className="mt-3 font-semibold text-gray-900">
            {doctors.length === 0 ? 'No doctors are open for booking yet' : 'No doctors match your filters'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {doctors.length === 0 ? 'Please check back soon.' : 'Try a different specialty, raise the fee limit or clear your search.'}
          </p>
          {doctors.length > 0 && (
            <button type="button" onClick={clearAll} className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
