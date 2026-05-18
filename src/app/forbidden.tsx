import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldOff, ArrowLeft } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FBFBFA] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-6 h-6 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">
          Accès refusé
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Ton rôle actuel ne te permet pas d&apos;accéder à cette section. Demande à ton propriétaire ou administrateur si tu penses que c&apos;est une erreur.
        </p>
        <Button asChild className="gap-2">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Retour au tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  )
}
