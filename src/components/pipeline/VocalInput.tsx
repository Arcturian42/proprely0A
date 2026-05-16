'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, RotateCcw, Check } from 'lucide-react'
import { ParsedQuoteData } from '@/types/pipeline'
import { parseVocalInput, formatParsedData } from '@/lib/vocal-parser'
import { cn } from '@/lib/utils'

interface VocalInputProps {
  onParsed: (data: ParsedQuoteData, raw: string) => void
  className?: string
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

export function VocalInput({ onParsed, className }: VocalInputProps) {
  const [supported] = useState<boolean>(() => !!getSpeechRecognition())
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<ParsedQuoteData | null>(null)
  const [processingMs, setProcessingMs] = useState<number | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const startTimeRef = useRef<number>(0)

  const handleStart = useCallback(() => {
    const SpeechRec = getSpeechRecognition()
    if (!SpeechRec) return

    const rec = new SpeechRec()
    rec.lang = 'fr-FR'
    rec.continuous = true
    rec.interimResults = true

    let finalTranscript = ''

    rec.onstart = () => {
      setListening(true)
      startTimeRef.current = Date.now()
    }

    rec.onresult = (e) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript + ' '
      }
      finalTranscript = full.trim()
      setTranscript(finalTranscript)
    }

    rec.onend = () => {
      setListening(false)
      setProcessingMs(Date.now() - startTimeRef.current)
      // Auto-parse when speech recognition stops
      if (finalTranscript) {
        setParsed(parseVocalInput(finalTranscript))
      }
    }

    rec.onerror = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
  }, [])

  const handleStop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const handleConfirm = useCallback(() => {
    if (!parsed) return
    onParsed(parsed, transcript)
    setParsed(null)
    setTranscript('')
    setProcessingMs(null)
  }, [parsed, transcript, onParsed])

  const handleReset = useCallback(() => {
    setParsed(null)
    setTranscript('')
    setProcessingMs(null)
    handleStop()
  }, [handleStop])

  if (!supported) {
    return (
      <div className={cn('rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700', className)}>
        🎤 Microphone non disponible — saisie manuelle disponible ci-dessous
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">🎤 Saisie vocale</h3>
        {processingMs && (
          <span className="text-xs text-slate-400">Résultat : {(processingMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      {/* Transcript area */}
      <div className="min-h-[80px] rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
        {transcript ? (
          <p className="italic">&ldquo;{transcript}&rdquo;</p>
        ) : (
          <p className="text-slate-400">{listening ? 'En écoute...' : 'Appuyez sur 🎤 et parlez...'}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!listening ? (
          <Button
            onClick={handleStart}
            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Mic className="w-5 h-5" />
            {transcript ? 'Réessayer' : 'Appuyez et parlez'}
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            variant="destructive"
            className="flex-1 gap-2"
            size="lg"
          >
            <MicOff className="w-5 h-5" />
            <span className="animate-pulse">Arrêter</span>
          </Button>
        )}
        {transcript && (
          <Button variant="outline" onClick={handleReset} size="lg">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Parsed results */}
      {parsed && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-700">🤖 AI a compris :</p>
          {formatParsedData(parsed).map((line, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              {line}
            </div>
          ))}
          {parsed.surfaces.length === 0 && !parsed.service_type && (
            <p className="text-xs text-yellow-600">Aucun élément reconnu. Essayez : &ldquo;2000 m² bureaux, 2 fois par semaine&rdquo;</p>
          )}
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setParsed(null)}>
              ✏️ Modifier
            </Button>
            <Button size="sm" onClick={handleConfirm} className="gap-1">
              <Check className="w-3 h-3" /> C&apos;est correct
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
