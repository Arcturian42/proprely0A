'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Route-level error boundary. Lives inside the AdminLayout (the sidebar
 * stays visible) and renders a contained error block rather than the
 * full-screen fallback in `src/app/error.tsx`.
 *
 * Used by `error.tsx` files in each route group (dashboard/, commercial/,
 * operations/, rh/, rentabilite/, parametres/, agent/) so a thrown page
 * doesn't blow up the whole app shell.
 */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error boundary:', error)
  }, [error])

  return (
    <div className="p-8">
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">
          Cette page n&apos;a pas pu se charger
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Une erreur inattendue est survenue côté serveur ou pendant le rendu.
          Tu peux réessayer — si le problème persiste, recharge l&apos;app.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-4">Ref : {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} size="sm" className="gap-2">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      </div>
    </div>
  )
}
