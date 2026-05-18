import { ChevronRight, Mic, MicOff, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { STEP_TITLES } from './QuoteFlow.constants'
import { StepHeader } from './QuoteFlow.shared'

// Step 2 — free-form site visit notes + voice recording dummy.
// Extracted from QuoteFlow.tsx.

interface Props {
  notes: string
  onNotesChange: (v: string) => void
  isRecording: boolean
  recordingDuration: number
  onStartRecording: () => void
  onStopRecording: () => void
  onBack: () => void
  onNext: () => void
}

export function StepNotes({
  notes,
  onNotesChange,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onBack,
  onNext,
}: Props) {
  return (
    <div className="space-y-5">
      <StepHeader title={STEP_TITLES[2]} step={2} total={5} onBack={onBack} />

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        <Sparkles className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
        Vos notes seront utilisées par l&apos;IA pour améliorer l&apos;estimation
      </div>

      <div>
        <Label className="text-xs text-slate-600 mb-1.5 block">Notes de visite terrain</Label>
        <Textarea
          placeholder="Décrivez le site : accès, état des locaux, obstacles, contraintes logistiques, exigences particulières du client..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={6}
          className="text-sm resize-none"
        />
      </div>

      {/* Voice recording */}
      <div className="flex items-center gap-3">
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
            isRecording
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isRecording ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <MicOff className="w-4 h-4" />
              Arrêter ({recordingDuration}s)
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Note vocale
            </>
          )}
        </button>
        {recordingDuration > 0 && !isRecording && (
          <span className="text-xs text-slate-500">
            Enregistrement {recordingDuration}s sauvegardé
          </span>
        )}
      </div>

      <Button
        onClick={onNext}
        className="w-full gap-2 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
      >
        Continuer <ChevronRight className="w-4 h-4 ml-auto" />
      </Button>
    </div>
  )
}
