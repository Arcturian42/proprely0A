/**
 * Loading skeleton générique pour les pages admin (Sprint 3 — UX bêta).
 *
 * Mutualisé entre toutes les `loading.tsx` créées dans ce sprint pour
 * uniformiser le ressenti : titre + sous-titre + variant adapté au type
 * de page (table, kanban, calendrier, cards).
 *
 * Pas de prop `description` — Next.js sert `loading.tsx` pendant que la page
 * RSC fetche, donc l'utilisateur voit le skeleton ~200-500 ms. Pas le moment
 * d'afficher du texte qui change la mise en page au cut-over.
 */

type Variant = 'table' | 'kanban' | 'calendar' | 'cards'

const VARIANT_LABEL: Record<Variant, string> = {
  table: 'Chargement de la liste',
  kanban: 'Chargement du tableau',
  calendar: 'Chargement du calendrier',
  cards: 'Chargement des fiches',
}

export function PageSkeleton({
  label,
  variant = 'table',
}: {
  /** Titre custom — par défaut "Chargement…" générique. */
  label?: string
  variant?: Variant
}) {
  const ariaLabel = label ?? VARIANT_LABEL[variant]

  return (
    <div className="p-4 sm:p-8 space-y-6" role="status" aria-live="polite" aria-label={ariaLabel}>
      {/* Header — titre + sous-titre */}
      <div className="space-y-2">
        <div className="h-7 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-80 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* Filter strip — search + 2-3 selects */}
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-full sm:w-64 bg-slate-100 rounded animate-pulse" />
        <div className="h-9 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-9 w-40 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* Contenu — variant adapté */}
      {variant === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
              {[0, 1, 2].map(j => (
                <div key={j} className="h-20 bg-white border border-slate-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      )}

      {variant === 'calendar' && (
        <div className="grid grid-cols-7 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-full bg-slate-200 rounded animate-pulse" />
              <div className="h-32 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {variant === 'table' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="h-10 bg-slate-50 border-b border-slate-200" />
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 border-b border-slate-100 px-4 flex items-center gap-3">
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      )}

      <span className="sr-only">Chargement…</span>
    </div>
  )
}
