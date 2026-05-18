import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FBFBFA] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-6 h-6 text-slate-500" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">
          Page introuvable
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Cette page n&apos;existe pas ou plus. Vérifie l&apos;URL ou retourne à ton tableau de bord.
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
