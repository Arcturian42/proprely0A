export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label="Chargement de mon agenda">
      <div>
        <div className="h-7 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <div className="h-3 w-12 bg-slate-100 rounded animate-pulse" />
            <div className="h-6 w-10 bg-slate-200 rounded animate-pulse" />
            <div className="h-16 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
