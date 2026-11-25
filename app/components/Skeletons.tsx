/** Skeleton loaders: grey placeholder shapes that pulse where content will appear (instead of spinners). */
const bar = 'animate-pulse rounded-md bg-gray-200/80';

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`${bar} h-3 ${className}`} />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}>
      <div className={`${bar} h-3 w-1/3`} />
      <div className={`${bar} mt-3 h-6 w-1/2`} />
      <div className={`${bar} mt-3 h-2.5 w-2/3`} />
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className={`${bar} h-10 w-10 shrink-0 rounded-full`} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`${bar} h-3 w-2/5`} />
            <div className={`${bar} h-2.5 w-3/5`} />
          </div>
          <div className={`${bar} hidden h-6 w-16 sm:block`} />
        </div>
      ))}
    </div>
  );
}

/**
 * Drop-in replacement for a spinner. Sized to fit small containers (it never grows past its parent: overflow is clipped).
 *  - "list" (default): a few list rows        - for lists / tables / cards that are loading
 *  - "form": label + input blocks             - for a record loading into an edit / create form
 *  - "page": heading + stat cards + rows      - only for whole-page loads (route transitions, session loading)
 */
export function ContentSkeleton({
  variant = 'list',
  rows,
  stats = 3,
}: {
  variant?: 'list' | 'form' | 'page';
  rows?: number;
  stats?: number;
}) {
  if (variant === 'page') {
    return (
      <div className="w-full max-w-full space-y-4 overflow-hidden" role="status" aria-busy="true" aria-label="Loading">
        <div className={`${bar} h-6 w-48`} />
        {stats > 0 && (
          <div className={`grid grid-cols-1 gap-3 ${stats === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
            {Array.from({ length: stats }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
        <SkeletonRows rows={rows ?? 4} />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  if (variant === 'form') {
    return (
      <div className="w-full min-w-[16rem] max-w-2xl max-h-full space-y-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" role="status" aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows ?? 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className={`${bar} h-3 w-28`} />
            <div className={`${bar} h-10 w-full`} />
          </div>
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  return (
    <div className="w-full min-w-[16rem] max-h-full overflow-hidden" role="status" aria-busy="true" aria-label="Loading">
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white/80">
        {Array.from({ length: rows ?? 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className={`${bar} h-8 w-8 shrink-0 rounded-full`} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className={`${bar} h-3 w-2/5`} />
              <div className={`${bar} h-2.5 w-3/5`} />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Small spinner + label for work that is being GENERATED (AI analysis etc.), where a skeleton would mislead. */
export function InlineLoading({ label = 'Analyzing…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-600" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
      {label}
    </div>
  );
}

/** Whole-page skeleton for route transitions (used by loading.tsx files). */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
      <div className="mb-5 space-y-2">
        <div className={`${bar} h-7 w-56`} />
        <div className={`${bar} h-3.5 w-80 max-w-full`} />
      </div>
      <ContentSkeleton variant="page" rows={6} stats={4} />
    </div>
  );
}

/** Full-screen skeleton of the dashboard frame (sidebar + navbar + content) while the session / translations load. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-gray-50" role="status" aria-busy="true" aria-label="Loading">
      <aside className="hidden w-64 shrink-0 border-r border-gray-100 bg-white p-4 lg:block">
        <div className={`${bar} mb-6 h-7 w-32`} />
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`${bar} h-5 w-5`} />
              <div className={`${bar} h-3 ${i % 3 === 0 ? 'w-28' : i % 3 === 1 ? 'w-36' : 'w-24'}`} />
            </div>
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-end gap-3 border-b border-gray-100 bg-white px-5">
          <div className={`${bar} h-8 w-8 rounded-full`} />
          <div className={`${bar} h-8 w-8 rounded-full`} />
          <div className={`${bar} h-8 w-28`} />
        </div>
        <PageSkeleton />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
