export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label="Chargement de l'annuaire">
      <div>
        <div className="h-7 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
