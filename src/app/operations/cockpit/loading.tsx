export default function Loading() {
  return (
    <div className="p-4 sm:p-8" role="status" aria-live="polite" aria-label="Chargement du cockpit">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-80 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[0, 1, 2, 3, 4].map(col => (
          <div key={col} className="w-72 shrink-0 space-y-3">
            <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
