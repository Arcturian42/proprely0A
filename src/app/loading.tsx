export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#FBFBFA]" role="status" aria-live="polite">
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
