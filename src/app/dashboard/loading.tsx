export default function Loading() {
  return (
    <div className="p-4 sm:p-8 space-y-6" role="status" aria-live="polite" aria-label="Chargement du tableau de bord">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-80 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
