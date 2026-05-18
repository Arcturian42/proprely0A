'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { useCurrentCompanyId } from '@/lib/auth'
import { Quote, ServiceCategory, QuoteCostBreakdown, QuoteLineItem } from '@/types'
import { calculateQuotePrice, estimateFromSurface } from '@/lib/pricing-engine'
import type {
  ComputedServiceLine,
  FlowStep,
  QuoteFlowProps,
  ServiceLine,
} from './QuoteFlow.types'
import {
  SERVICE_ICONS,
  STEP_TITLES,
  slideVariants,
} from './QuoteFlow.constants'
import { CostRow, QuoteStatusBadge, StepHeader } from './QuoteFlow.shared'
import { StepList } from './QuoteFlow.StepList'
import { StepServices } from './QuoteFlow.StepServices'
import { StepNotes } from './QuoteFlow.StepNotes'
import { StepMedia } from './QuoteFlow.StepMedia'
import { SERVICE_CATEGORY_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Send,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { track } from '@/lib/analytics/posthog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

// ─── Main component ───────────────────────────────────────────────────────────

export function QuoteFlow({ opportunity, onQuoteSent }: QuoteFlowProps) {
  const companyId = useCurrentCompanyId()
  const { quotes, addQuote, updateQuote, deleteQuote, sendQuote, companySettings } = useAppStore()
  const oppQuotes = quotes.filter(q => q.opportunity_id === opportunity.id)

  // Navigation
  const [step, setStep] = useState<FlowStep>(0)
  const [prevStep, setPrevStep] = useState<FlowStep>(0)

  // Step 1 — Services
  const [services, setServices] = useState<ServiceLine[]>([])
  const [expandedService, setExpandedService] = useState<string | null>(null)

  // Step 2 — Notes
  const [visitNotes, setVisitNotes] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Step 3 — Media
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Step 4 — AI Calculation
  const [isCalculating, setIsCalculating] = useState(false)
  const [computedLines, setComputedLines] = useState<ComputedServiceLine[]>([])

  // Step 5 — Preview
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)

  // ─── Navigation helper ─────────────────────────────────────────────────────

  const goTo = useCallback((next: FlowStep) => {
    setPrevStep(step)
    setStep(next)
  }, [step])

  // ─── Step 1 helpers ────────────────────────────────────────────────────────

  const addService = useCallback((category: ServiceCategory) => {
    const id = `svc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newLine: ServiceLine = { id, category, surface: '', complexity: 'moyen', frequency: 'Ponctuel', notes: '' }
    setServices(prev => [...prev, newLine])
    setExpandedService(id)
  }, [])

  const removeService = useCallback((id: string) => {
    setServices(prev => prev.filter(s => s.id !== id))
    setExpandedService(prev => prev === id ? null : prev)
  }, [])

  const updateServiceField = useCallback(<K extends keyof ServiceLine>(id: string, field: K, value: ServiceLine[K]) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }, [])

  // ─── Step 2 helpers ────────────────────────────────────────────────────────

  const handleStartRecording = () => {
    setIsRecording(true)
    setRecordingDuration(0)
    recordingTimer.current = setInterval(() => setRecordingDuration(d => d + 1), 1000)
    toast.info('Enregistrement en cours...')
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    if (recordingTimer.current) clearInterval(recordingTimer.current)
    toast.success(`Enregistrement de ${recordingDuration}s sauvegardé`)
    if (!visitNotes) {
      setVisitNotes(`[Note vocale ${recordingDuration}s] Visite terrain effectuée.`)
    }
  }

  // ─── Step 3 helpers ────────────────────────────────────────────────────────

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return
    const names = Array.from(files).map(f => f.name)
    setUploadedFiles(prev => [...prev, ...names])
    toast.success(`${files.length} fichier(s) ajouté(s)`)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFilesAdded(e.dataTransfer.files)
  }

  // ─── Step 4 — AI calculation ───────────────────────────────────────────────

  const runCalculation = useCallback(async () => {
    setIsCalculating(true)
    await new Promise(r => setTimeout(r, 2000))
    const results: ComputedServiceLine[] = services.map(line => {
      const surfaceNum = parseFloat(line.surface) || 0
      const pricingInput = estimateFromSurface(line.category, surfaceNum, line.complexity)
      const costs = calculateQuotePrice(pricingInput)
      return { line, pricingInput, costs }
    })
    setComputedLines(results)
    setIsCalculating(false)
  }, [services])

  const handleGoToCalculation = useCallback(async () => {
    goTo(4)
    await runCalculation()
  }, [goTo, runCalculation])

  // ─── Aggregated totals ─────────────────────────────────────────────────────

  const aggregatedCosts = useCallback((): QuoteCostBreakdown => {
    if (computedLines.length === 0) {
      return {
        labor_cost: 0, machines_cost: 0, consumables_cost: 0, transport_cost: 0,
        other_costs: 0, total_cost_ht: 0, margin_rate: 0, price_ht: 0, vat_rate: 0.20, price_ttc: 0,
      }
    }
    const totals = computedLines.reduce((acc, { costs }) => ({
      labor_cost: acc.labor_cost + costs.labor_cost,
      machines_cost: acc.machines_cost + costs.machines_cost,
      consumables_cost: acc.consumables_cost + costs.consumables_cost,
      transport_cost: acc.transport_cost + costs.transport_cost,
      other_costs: acc.other_costs + costs.other_costs,
      total_cost_ht: acc.total_cost_ht + costs.total_cost_ht,
      price_ht: acc.price_ht + costs.price_ht,
      price_ttc: acc.price_ttc + costs.price_ttc,
    }), { labor_cost: 0, machines_cost: 0, consumables_cost: 0, transport_cost: 0, other_costs: 0, total_cost_ht: 0, price_ht: 0, price_ttc: 0 })

    const margin_rate = totals.price_ht > 0
      ? (totals.price_ht - totals.total_cost_ht) / totals.price_ht
      : 0

    return {
      ...totals,
      margin_rate: Math.round(margin_rate * 1000) / 1000,
      vat_rate: 0.20,
      price_ttc: Math.round(totals.price_ttc * 100) / 100,
      price_ht: Math.round(totals.price_ht * 100) / 100,
    }
  }, [computedLines])

  // ─── Create draft quote ────────────────────────────────────────────────────

  const handleCreateDraft = useCallback(() => {
    const costs = aggregatedCosts()
    const totalSurface = services.reduce((sum, s) => sum + (parseFloat(s.surface) || 0), 0)
    const serviceNames = services.map(s => SERVICE_CATEGORY_LABELS[s.category]).join(', ')
    const quoteNumber = `DEV-${Date.now().toString().slice(-6)}`
    const now = new Date().toISOString()

    // Build line items from all services
    const lineItems: QuoteLineItem[] = []
    computedLines.forEach(({ line, pricingInput, costs: sc }, idx) => {
      const prefix = computedLines.length > 1 ? `[${SERVICE_CATEGORY_LABELS[line.category]}] ` : ''
      const duration = Math.round(pricingInput.workers * pricingInput.hoursPerWorker * 10) / 10
      lineItems.push(
        { id: `li-${idx}-1`, description: `${prefix}Main d'œuvre (${pricingInput.workers} agent${pricingInput.workers > 1 ? 's' : ''})`, quantity: duration, unit: 'h', unit_price: duration > 0 ? sc.labor_cost / duration : 0, total: sc.labor_cost },
        { id: `li-${idx}-2`, description: `${prefix}Machines & équipements`, quantity: 1, unit: 'forfait', unit_price: sc.machines_cost, total: sc.machines_cost },
        { id: `li-${idx}-3`, description: `${prefix}Consommables`, quantity: 1, unit: 'forfait', unit_price: sc.consumables_cost, total: sc.consumables_cost },
        { id: `li-${idx}-4`, description: `${prefix}Déplacement & transport`, quantity: 1, unit: 'forfait', unit_price: sc.transport_cost, total: sc.transport_cost },
      )
    })

    const draft: Quote = {
      id: `quote-${Date.now()}`,
      company_id: companyId,
      opportunity_id: opportunity.id,
      quote_number: quoteNumber,
      title: `Devis ${serviceNames} — ${opportunity.prospect_name}`,
      service_category: services[0]?.category ?? 'autre',
      surface_m2: totalSurface || null,
      status: 'brouillon',
      costs,
      line_items: lineItems,
      site_visit_notes: visitNotes || null,
      extraction_data: null,
      docuseal_submission_id: null,
      docuseal_signature_url: null,
      signed_at: null,
      client_name: opportunity.prospect_name,
      client_email: opportunity.email,
      created_at: now,
      updated_at: now,
    }
    addQuote(draft)
    setCurrentDraftId(draft.id)
    goTo(5)
  }, [aggregatedCosts, services, computedLines, visitNotes, opportunity, addQuote, goTo, companyId])

  // ─── Send quote ────────────────────────────────────────────────────────────
  // `sendingQuoteId` is non-null while a Docuseal call is in flight — used to
  // disable the Envoyer button against double-click (else the user can fire
  // 2-3 Docuseal submissions per devis).
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null)

  const handleSendQuote = async (quoteId: string) => {
    if (sendingQuoteId) return // already in flight
    const quote = quotes.find(q => q.id === quoteId)
    if (!quote) return
    if (!quote.client_email) {
      toast.error('Email client requis pour envoyer le devis')
      return
    }
    setSendingQuoteId(quoteId)
    const toastId = toast.loading('Envoi via Docuseal...')
    try {
      const res = await fetch('/api/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          company: companySettings,
          signerEmail: quote.client_email,
          signerFirstName: quote.client_name.split(' ')[0] || quote.client_name,
          signerLastName: quote.client_name.split(' ').slice(1).join(' ') || '.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      sendQuote(quoteId)
      track('quote_sent', { quote_id: quoteId, opportunity_id: opportunity.id })
      updateQuote(quoteId, {
        docuseal_submission_id: data.submissionId ?? data.signatureRequestId,
        docuseal_signature_url: data.signerUrl,
      })
      toast.dismiss(toastId)
      toast.success('Devis envoyé ! Le client recevra un email de signature.', { duration: 6000 })
      goTo(0)
      setCurrentDraftId(null)
      onQuoteSent?.()
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnu'}`)
    } finally {
      setSendingQuoteId(null)
    }
  }

  const [confirmDeleteQuoteId, setConfirmDeleteQuoteId] = useState<string | null>(null)
  const handleDeleteQuote = (quoteId: string) => {
    setConfirmDeleteQuoteId(quoteId)
  }
  const confirmQuoteDeletion = () => {
    if (!confirmDeleteQuoteId) return
    deleteQuote(confirmDeleteQuoteId)
    toast.success('Devis supprimé')
    setConfirmDeleteQuoteId(null)
  }

  // ─── Reset / start flow ────────────────────────────────────────────────────

  const startNewFlow = () => {
    setServices([])
    setExpandedService(null)
    setVisitNotes('')
    setIsRecording(false)
    setRecordingDuration(0)
    setUploadedFiles([])
    setComputedLines([])
    setCurrentDraftId(null)
    setIsCalculating(false)
    goTo(1)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const direction = step >= prevStep ? 'right' : 'left'

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {step === 0 && (
          <motion.div key="step-0" variants={slideVariants(direction)} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: 'easeInOut' }}>
            <StepList
              oppQuotes={oppQuotes}
              onNew={startNewFlow}
              onSend={handleSendQuote}
              onDelete={handleDeleteQuote}
              onPreview={(id) => { setCurrentDraftId(id); goTo(5) }}
              sendingQuoteId={sendingQuoteId}
            />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="step-1" variants={slideVariants(direction)} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: 'easeInOut' }}>
            <StepServices
              services={services}
              expandedService={expandedService}
              onToggleExpand={(id) => setExpandedService(prev => prev === id ? null : id)}
              onAddService={addService}
              onRemoveService={removeService}
              onUpdateField={updateServiceField}
              onBack={() => goTo(0)}
              onNext={() => {
                if (services.length === 0) { toast.error('Ajoutez au moins un service'); return }
                const invalid = services.find(s => !s.surface || parseFloat(s.surface) <= 0)
                if (invalid) { toast.error('Saisissez la surface pour chaque service'); return }
                goTo(2)
              }}
            />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step-2" variants={slideVariants(direction)} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: 'easeInOut' }}>
            <StepNotes
              notes={visitNotes}
              onNotesChange={setVisitNotes}
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
            />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="step-3" variants={slideVariants(direction)} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: 'easeInOut' }}>
            <StepMedia
              uploadedFiles={uploadedFiles}
              isDragging={isDragging}
              photoInputRef={photoInputRef}
              videoInputRef={videoInputRef}
              onFilesAdded={handleFilesAdded}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onRemoveFile={(name) => setUploadedFiles(prev => prev.filter(f => f !== name))}
              onBack={() => goTo(2)}
              onNext={handleGoToCalculation}
              onSkip={handleGoToCalculation}
            />
          </motion.div>
        )}
        {step === 4 && (
          <motion.div key="step-4" variants={slideVariants(direction)} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: 'easeInOut' }}>
            <StepCalculation
              isCalculating={isCalculating}
              computedLines={computedLines}
              aggregatedCosts={aggregatedCosts()}
              onBack={() => goTo(3)}
              onNext={handleCreateDraft}
            />
          </motion.div>
        )}
        {step === 5 && (
          <motion.div key="step-5" variants={slideVariants(direction)} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: 'easeInOut' }}>
            <StepPreview
              quote={currentDraftId ? quotes.find(q => q.id === currentDraftId) ?? null : null}
              companySettings={companySettings}
              onBack={() => goTo(4)}
              onRegenerate={() => { goTo(1) }}
              onSend={(id) => handleSendQuote(id)}
              onBackToList={() => { goTo(0); setCurrentDraftId(null) }}
              sendingQuoteId={sendingQuoteId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDeleteQuoteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteQuoteId(null) }}
        title="Supprimer ce devis ?"
        description="Cette action est irréversible. Le devis et tous ses détails seront définitivement perdus."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={confirmQuoteDeletion}
      />
    </div>
  )
}

// ─── Step 4: AI Calculation ───────────────────────────────────────────────────

function StepCalculation({
  isCalculating,
  computedLines,
  aggregatedCosts,
  onBack,
  onNext,
}: {
  isCalculating: boolean
  computedLines: ComputedServiceLine[]
  aggregatedCosts: QuoteCostBreakdown
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-5">
      <StepHeader title={STEP_TITLES[4]} step={4} total={5} onBack={onBack} />

      {isCalculating ? (
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          {/* Pulsing gradient orb */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 opacity-20 animate-ping absolute inset-0" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center relative">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-800">Calcul IA en cours...</p>
            <p className="text-xs text-slate-500">Analyse des services et estimation des coûts</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Services analysés</p>

          {/* Per-service breakdowns */}
          {computedLines.map(({ line, pricingInput, costs }) => (
            <div key={line.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="text-slate-600">{SERVICE_ICONS[line.category]}</span>
                <span className="text-sm font-semibold text-slate-900 flex-1">
                  {SERVICE_CATEGORY_LABELS[line.category]} {line.surface}m²
                </span>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-2 text-xs">
                <CostRow label="Main d'œuvre" value={formatCurrency(costs.labor_cost)} />
                <CostRow label="Machines" value={formatCurrency(costs.machines_cost)} />
                <CostRow label="Consommables" value={formatCurrency(costs.consumables_cost)} />
                <CostRow label="Transport" value={formatCurrency(costs.transport_cost)} />
                <div className="col-span-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Prix HT</span>
                  <span className="font-bold text-slate-900">{formatCurrency(costs.price_ht)}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-slate-500">Marge</span>
                  <span className={`font-semibold ${costs.margin_rate >= 0.35 ? 'text-green-600' : 'text-red-500'}`}>
                    {Math.round(costs.margin_rate * 100)}% {costs.margin_rate >= 0.35 ? '✅' : '⚠️'}
                  </span>
                </div>
                <div className="col-span-2 text-slate-400 text-[10px]">
                  {pricingInput.workers} agent{pricingInput.workers > 1 ? 's' : ''} × {pricingInput.hoursPerWorker}h @ {pricingInput.hourlyLaborRate}€/h
                </div>
              </div>
            </div>
          ))}

          {/* Aggregated total */}
          {computedLines.length > 1 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Total combiné</p>
              <div className="flex justify-between text-sm text-slate-300">
                <span>TOTAL HT</span>
                <span className="font-semibold text-white">{formatCurrency(aggregatedCosts.price_ht)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>TVA 20%</span>
                <span>{formatCurrency(aggregatedCosts.price_ttc - aggregatedCosts.price_ht)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-slate-700 pt-2 mt-1">
                <span>TOTAL TTC</span>
                <span>{formatCurrency(aggregatedCosts.price_ttc)}</span>
              </div>
              <p className={`text-xs ${aggregatedCosts.margin_rate >= 0.35 ? 'text-green-400' : 'text-red-400'}`}>
                Marge globale : {Math.round(aggregatedCosts.margin_rate * 100)}% {aggregatedCosts.margin_rate >= 0.35 ? '✅' : '⚠️'}
              </p>
            </div>
          )}

          <Button onClick={onNext} className="w-full gap-2 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white">
            Générer le devis <ChevronRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Step 5: Preview & Send ───────────────────────────────────────────────────

function StepPreview({
  quote,
  companySettings,
  onBack,
  onRegenerate,
  onSend,
  onBackToList,
  sendingQuoteId,
}: {
  quote: Quote | null
  companySettings: { name: string; address?: string; email?: string; phone?: string }
  onBack: () => void
  onRegenerate: () => void
  onSend: (id: string) => void
  onBackToList: () => void
  sendingQuoteId: string | null
}) {
  if (!quote) {
    return (
      <div className="space-y-4">
        <StepHeader title={STEP_TITLES[5]} step={5} total={5} onBack={onBack} />
        <p className="text-sm text-slate-500 text-center py-8">Devis introuvable</p>
        <button onClick={onBackToList} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1">
          ← Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <StepHeader title={STEP_TITLES[5]} step={5} total={5} onBack={onBack} />

      {/* PDF-style preview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="font-bold text-base">{companySettings.name}</p>
              {companySettings.address && <p className="text-slate-300 text-xs mt-0.5">{companySettings.address}</p>}
              {companySettings.email && <p className="text-slate-300 text-xs">{companySettings.email}{companySettings.phone ? ` — ${companySettings.phone}` : ''}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Devis n°</p>
              <p className="font-mono font-bold text-base">{quote.quote_number}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDate(quote.created_at)}</p>
              <QuoteStatusBadge status={quote.status} />
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Client */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-wide font-medium">Client</p>
            <p className="font-semibold text-slate-900">{quote.client_name}</p>
            {quote.client_email && <p className="text-xs text-slate-500">{quote.client_email}</p>}
          </div>

          {/* Object */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Objet</p>
            <p className="font-semibold text-slate-900 text-sm">{quote.title}</p>
            {quote.surface_m2 && <p className="text-xs text-slate-500 mt-0.5">Surface totale : {quote.surface_m2} m²</p>}
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Détail des prestations</p>
            <div className="space-y-0.5">
              {quote.line_items.map(li => (
                <div key={li.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0 gap-2">
                  <span className="text-slate-700 flex-1 pr-2 text-xs">{li.description}</span>
                  <span className="text-slate-400 text-xs whitespace-nowrap">{li.quantity} {li.unit}</span>
                  <span className="font-medium text-slate-900 text-xs text-right w-16 flex-shrink-0">{formatCurrency(li.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Total HT</span><span>{formatCurrency(quote.costs.price_ht)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>TVA (20%)</span><span>{formatCurrency(quote.costs.price_ttc - quote.costs.price_ht)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total TTC</span><span>{formatCurrency(quote.costs.price_ttc)}</span>
            </div>
            <p className={`text-xs ${quote.costs.margin_rate >= 0.35 ? 'text-green-600' : 'text-amber-600'}`}>
              Marge : {Math.round(quote.costs.margin_rate * 100)}%
            </p>
          </div>

          {/* Signature zone */}
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center mt-2">
            <p className="text-xs text-slate-400">Zone de signature électronique</p>
            <p className="text-xs text-slate-300 mt-0.5">Envoyé via SignNow</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={onRegenerate}>
          <RefreshCw className="w-3.5 h-3.5" /> Régénérer
        </Button>
        {quote.status === 'brouillon' && (
          <Button
            size="sm"
            className="gap-1.5 flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onSend(quote.id)}
            disabled={sendingQuoteId !== null}
          >
            {sendingQuoteId === quote.id ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi via Docuseal...</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Envoyer via Docuseal →</>
            )}
          </Button>
        )}
        {quote.status === 'envoye' && (
          <Button size="sm" className="gap-1.5 flex-1 bg-green-600 hover:bg-green-700 text-white" disabled>
            <CheckCircle2 className="w-3.5 h-3.5" /> Envoyé
          </Button>
        )}
      </div>

      <button onClick={onBackToList} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
        ← Retour à la liste des devis
      </button>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

