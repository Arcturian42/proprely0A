'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error boundary:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-screen bg-[#FBFBFA] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">
          Une erreur est survenue
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          L&apos;application a rencontré un problème inattendu. Vous pouvez réessayer
          ou recharger la page.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-4">
            Ref : {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} className="gap-2">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Réessayer
          </Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
