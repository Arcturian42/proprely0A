export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label="Chargement de mes missions">
      <div>
        <div className="h-7 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
            </div>
            <div className="flex gap-3 pt-1">
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-12 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
