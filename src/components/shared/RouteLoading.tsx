/**
 * Route-level loading fallback. Renders a centered spinner inside the
 * AdminLayout content area (sidebar stays visible), as opposed to the
 * full-screen variant in `src/app/loading.tsx`.
 */
export function RouteLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-slate-500">
        <div
          className="w-5 h-5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
          aria-hidden="true"
        />
        <span className="text-sm">Chargement…</span>
      </div>
    </div>
  )
}
