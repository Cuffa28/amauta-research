/**
 * Loading skeleton for /fondo/[key]
 */
export default function FondoLoading() {
  return (
    <div className="min-h-full flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero card */}
        <div className="relative overflow-hidden bg-surface-raised border border-brand-border rounded-lg p-6 sm:p-8 mb-6 animate-pulse">
          <span className="absolute top-0 left-0 h-full w-1 bg-amauta-yellow" aria-hidden />
          <div className="h-4 w-48 bg-surface-overlay rounded mb-4" />
          <div className="flex gap-2 mb-2">
            <div className="h-5 w-24 bg-surface-overlay rounded" />
            <div className="h-5 w-20 bg-surface-overlay rounded" />
          </div>
          <div className="h-8 w-96 max-w-full bg-surface-overlay rounded" />
          <div className="mt-2 h-4 w-40 bg-surface-overlay rounded" />
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-overlay border border-brand-border rounded-lg px-4 py-3 h-16" />
            ))}
          </div>
        </div>

        {/* Rendimientos table */}
        <div className="bg-surface-raised rounded-lg border border-brand-border overflow-hidden mb-6">
          <div className="border-b border-brand-border h-12" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-brand-border">
              <div className="h-4 w-32 bg-surface-overlay rounded animate-pulse" />
              <div className="ml-auto h-4 w-20 bg-surface-overlay rounded animate-pulse" />
              <div className="h-4 w-20 bg-surface-overlay rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Composición */}
        <div className="bg-surface-raised rounded-lg border border-brand-border overflow-hidden mb-6">
          <div className="border-b border-brand-border h-12" />
          <div className="p-4 sm:p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-3">
                <div className="h-3 w-48 bg-surface-overlay rounded animate-pulse mb-1.5" />
                <div className="h-2.5 bg-surface-overlay rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-amauta-yellow/30 rounded-xs animate-pulse"
                    style={{ width: `${80 - i * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
