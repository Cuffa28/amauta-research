/**
 * Loading skeleton for /fondos — shown instantly on click while the page
 * fetches data from CAFCI (Next.js App Router streaming).
 */
export default function FondosLoading() {
  return (
    <div className="min-h-full flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero skeleton */}
        <div className="relative overflow-hidden bg-surface-raised border border-brand-border rounded-lg p-6 sm:p-8 mb-6">
          <span className="absolute top-0 left-0 h-full w-1 bg-amauta-yellow" aria-hidden />
          <div className="h-3 w-52 bg-surface-overlay rounded animate-pulse mb-3" />
          <div className="h-9 w-80 max-w-full bg-surface-overlay rounded animate-pulse" />
          <div className="mt-3 h-4 w-64 bg-surface-overlay rounded animate-pulse" />
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-overlay border border-brand-border rounded-lg h-16 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-surface-raised rounded-lg border border-brand-border overflow-hidden">
          <div className="border-b border-brand-border h-12" />
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 px-3 py-3 border-b border-brand-border"
            >
              <div className="h-4 w-6 bg-surface-overlay rounded animate-pulse" />
              <div className="h-4 flex-1 bg-surface-overlay rounded animate-pulse" />
              <div className="h-4 w-24 bg-surface-overlay rounded animate-pulse" />
              <div className="h-4 w-28 bg-surface-overlay rounded animate-pulse" />
              <div className="h-4 w-20 bg-surface-overlay rounded animate-pulse" />
              <div className="h-4 w-24 bg-surface-overlay rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
