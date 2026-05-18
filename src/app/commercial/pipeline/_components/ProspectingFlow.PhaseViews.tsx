import { Check, Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { Filters } from './ProspectingFlow.constants'

// Two small phase views of the prospecting flow:
// - SearchingView: loading screen while the SIRENE API call is in-flight
// - DoneView: end-of-session summary with restart CTA
// Both are pure presentational, no state.

export function SearchingView({ filters }: { filters: Filters }) {
  return (
    <div className="p-12 flex flex-col items-center text-center text-slate-800">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Sparkles className="w-9 h-9 text-white animate-pulse" />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-400/30 to-indigo-400/30 blur-2xl animate-pulse" />
      </div>
      <h2 className="text-xl font-semibold mb-2">L&apos;IA cherche vos prospects…</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        Analyse de la base SIRENE, scoring des opportunités et estimation du potentiel
        contractuel.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-500">
        <Tag>API gouv · recherche-entreprises</Tag>
        <Tag>Scoring IA</Tag>
        <Tag>Estimation surface</Tag>
        <Tag>Valeur contrat</Tag>
      </div>
      <div className="mt-6">
        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
      </div>
      <div className="sr-only">{JSON.stringify(filters)}</div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-full bg-white/70 backdrop-blur border border-slate-200">
      {children}
    </span>
  )
}

interface DoneViewProps {
  accepted: number
  onAgain: () => void
  onClose: () => void
}

export function DoneView({ accepted, onAgain, onClose }: DoneViewProps) {
  return (
    <div className="p-12 text-center text-slate-800">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold mb-1">Session terminée</h2>
      <p className="text-sm text-slate-500 mb-6">
        {accepted > 0
          ? `${accepted} prospect${accepted > 1 ? 's' : ''} ajouté${accepted > 1 ? 's' : ''} au pipeline en étape "Ouvert".`
          : 'Aucun prospect ajouté cette fois-ci.'}
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
        <Button
          onClick={onAgain}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> Nouvelle recherche
        </Button>
      </div>
    </div>
  )
}
