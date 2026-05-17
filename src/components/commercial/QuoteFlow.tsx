'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { Quote, Opportunity, ServiceCategory, SiteVisitExtraction, QuoteCostBreakdown } from '@/types'
import { calculateQuotePrice, estimateFromSurface, PricingInput } from '@/lib/pricing-engine'
import { SERVICE_CATEGORY_LABELS, QUOTE_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Mic, MicOff, ImagePlus, FileText, Sparkles, ChevronRight,
  CheckCircle2, Send, Eye, RefreshCw, Euro, Users, Clock, Wrench,
  AlertTriangle, Download, ExternalLink, Plus, Trash2
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  opportunity: Opportunity
  onQuoteSent?: () => void
}

type FlowStep = 'list' | 'input' | 'extraction' | 'pricing' | 'preview'

const STEP_LABELS: Record<FlowStep, string> = {
  list: 'Devis',
  input: 'Visite terrain',
  extraction: 'Analyse IA',
  pricing: 'Tarification',
  preview: 'Aperçu & envoi',
}

// Simulated AI extraction from notes
function simulateAIExtraction(notes: string, category: ServiceCategory, surfaceM2: number): SiteVisitExtraction {
  const complexityHints = ['difficile', 'complexe', 'encombré', 'accès difficile', 'haute'].some(w => notes.toLowerCase().includes(w))
  const urgencyHints = ['urgent', 'rapide', 'vite', 'asap'].some(w => notes.toLowerCase().includes(w))

  const categoryMachines: Record<ServiceCategory, string[]> = {
    fin_chantier: ['Aspirateur industriel', 'Karcher', 'Grattoir vitre'],
    terrasse: ['Nettoyeur haute pression', 'Balayeuse'],
    sols_mecanises: ['Monobrosse', 'Autolaveuse', 'Décapeuse'],
    moquette: ['Extracteur à injection/extraction', 'Aspirateur eau et poussière'],
    bureaux_recurrent: ['Aspirateur professionnel', 'Chariot de ménage'],
    vitres: ['Raclette professionnelle', 'Perche télescopique', 'Nacelle si >3m'],
    autre: ['Équipement standard'],
  }

  const categoryConsumables: Record<ServiceCategory, string[]> = {
    fin_chantier: ['Détergent dégraissant', 'Sacs poubelle 200L', 'Microfibre'],
    terrasse: ['Désincrustant', 'Anti-mousse', 'Neutralisant'],
    sols_mecanises: ['Décapant sol', 'Spray lustrant', 'Pad abrasif'],
    moquette: ['Shampooing moquette', 'Détachant professionnel'],
    bureaux_recurrent: ['Détergent multi-surfaces', 'Désinfectant', 'Papier essuie-tout'],
    vitres: ['Produit vitres', 'Eau déminéralisée', 'Chiffon microfibre'],
    autre: ['Produits standards'],
  }

  const hoursPerWorker = Math.max(2, (surfaceM2 / 100) * (complexityHints ? 1.4 : 1.0))
  const workers = Math.max(1, Math.ceil(surfaceM2 / 150))

  return {
    service_type: SERVICE_CATEGORY_LABELS[category],
    surface_m2: surfaceM2,
    complexity_level: complexityHints ? 'élevé' : surfaceM2 > 500 ? 'moyen' : 'faible',
    floors: notes.toLowerCase().includes('étage') ? 2 : 1,
    obstacles: complexityHints ? ['Mobilier dense', 'Accès restreint'] : ['Aucun obstacle majeur'],
    machines_needed: categoryMachines[category],
    consumables: categoryConsumables[category],
    estimated_duration_hours: Math.round(hoursPerWorker * workers * 10) / 10,
    workers_needed: workers,
    frequency: notes.toLowerCase().includes('quotidien') ? 'quotidien'
      : notes.toLowerCase().includes('hebdo') ? 'hebdomadaire'
      : 'ponctuel',
    access_constraints: notes.toLowerCase().includes('code') ? 'Code d\'accès requis' : 'Accès standard',
    parking_logistics: notes.toLowerCase().includes('parking') ? 'Parking disponible sur site' : 'Stationnement à prévoir',
    urgency: urgencyHints ? 'urgent' : 'normale',
    client_requirements: notes.length > 20 ? notes.substring(0, 120) : 'Prestations standards',
    operational_recommendation: `Prévoir ${workers} agent${workers > 1 ? 's' : ''} pour ${Math.round(hoursPerWorker)}h. Matériel: ${categoryMachines[category].slice(0, 2).join(', ')}.`,
  }
}

export function QuoteFlow({ opportunity, onQuoteSent }: Props) {
  const { quotes, addQuote, updateQuote, deleteQuote, sendQuote, companySettings } = useAppStore()
  const oppQuotes = quotes.filter(q => q.opportunity_id === opportunity.id)

  const [step, setStep] = useState<FlowStep>('list')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState<ServiceCategory>('bureaux_recurrent')
  const [surface, setSurface] = useState('')
  const [extraction, setExtraction] = useState<SiteVisitExtraction | null>(null)
  const [pricingInput, setPricingInput] = useState<PricingInput | null>(null)
  const [costs, setCosts] = useState<QuoteCostBreakdown | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)

  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStartRecording = () => {
    setIsRecording(true)
    setRecordingDuration(0)
    recordingTimer.current = setInterval(() => {
      setRecordingDuration(d => d + 1)
    }, 1000)
    toast.info('Enregistrement en cours...')
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    if (recordingTimer.current) clearInterval(recordingTimer.current)
    toast.success(`Enregistrement de ${recordingDuration}s sauvegardé`)
    if (!notes) {
      setNotes(`[Note vocale ${recordingDuration}s] Visite terrain effectuée. Analyse en cours...`)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newImages = Array.from(files).map((f, i) => `photo_${Date.now()}_${i + 1}`)
    setUploadedImages(prev => [...prev, ...newImages])
    toast.success(`${files.length} photo(s) ajoutée(s)`)
  }

  const handleAnalyze = async () => {
    if (!surface || parseFloat(surface) <= 0) {
      toast.error('Veuillez saisir la surface en m²')
      return
    }
    setIsAnalyzing(true)
    setStep('extraction')
    await new Promise(r => setTimeout(r, 1800))
    const surfaceNum = parseFloat(surface)
    const ext = simulateAIExtraction(notes, category, surfaceNum)
    setExtraction(ext)
    const estimated = estimateFromSurface(
      category,
      surfaceNum,
      ext.complexity_level as 'faible' | 'moyen' | 'élevé'
    )
    setPricingInput(estimated)
    const computed = calculateQuotePrice(estimated)
    setCosts(computed)
    setIsAnalyzing(false)
  }

  const handleConfirmExtraction = () => {
    if (!pricingInput) return
    const computed = calculateQuotePrice(pricingInput)
    setCosts(computed)
    setStep('pricing')
  }

  const handlePricingUpdate = (field: keyof PricingInput, value: number) => {
    if (!pricingInput) return
    const updated = { ...pricingInput, [field]: value }
    setPricingInput(updated)
    setCosts(calculateQuotePrice(updated))
  }

  const handleCreateDraft = () => {
    if (!costs || !extraction) return
    const quoteNumber = `DEV-${Date.now().toString().slice(-6)}`
    const now = new Date().toISOString()
    const draft: Quote = {
      id: `quote-${Date.now()}`,
      company_id: 'company-1',
      opportunity_id: opportunity.id,
      quote_number: quoteNumber,
      title: `Devis ${SERVICE_CATEGORY_LABELS[category]} — ${opportunity.prospect_name}`,
      service_category: category,
      surface_m2: parseFloat(surface),
      status: 'brouillon',
      costs,
      line_items: [
        { id: 'li-1', description: `Main d'œuvre (${extraction.workers_needed} agent${(extraction.workers_needed || 1) > 1 ? 's' : ''})`, quantity: extraction.estimated_duration_hours || 1, unit: 'h', unit_price: costs.labor_cost / (extraction.estimated_duration_hours || 1), total: costs.labor_cost },
        { id: 'li-2', description: 'Machines & équipements', quantity: 1, unit: 'forfait', unit_price: costs.machines_cost, total: costs.machines_cost },
        { id: 'li-3', description: 'Consommables', quantity: 1, unit: 'forfait', unit_price: costs.consumables_cost, total: costs.consumables_cost },
        { id: 'li-4', description: 'Déplacement & transport', quantity: 1, unit: 'forfait', unit_price: costs.transport_cost, total: costs.transport_cost },
      ],
      site_visit_notes: notes,
      extraction_data: extraction,
      yousign_procedure_id: null,
      yousign_signature_url: null,
      signed_at: null,
      client_name: opportunity.prospect_name,
      client_email: opportunity.email,
      created_at: now,
      updated_at: now,
    }
    addQuote(draft)
    setCurrentDraftId(draft.id)
    setStep('preview')
  }

  const handleSendQuote = (quoteId: string) => {
    sendQuote(quoteId)
    toast.success('Devis envoyé via Yousign — Opportunité déplacée en Proposition', { duration: 5000 })
    setStep('list')
    setCurrentDraftId(null)
    onQuoteSent?.()
  }

  const handleDeleteQuote = (quoteId: string) => {
    deleteQuote(quoteId)
    toast.success('Devis supprimé')
  }

  const resetFlow = () => {
    setStep('input')
    setNotes('')
    setSurface('')
    setUploadedImages([])
    setExtraction(null)
    setPricingInput(null)
    setCosts(null)
    setCurrentDraftId(null)
    setIsAnalyzing(false)
    setRecordingDuration(0)
  }

  const currentDraft = currentDraftId ? quotes.find(q => q.id === currentDraftId) : null

  // Step: List
  if (step === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Devis ({oppQuotes.length})</h3>
          <Button size="sm" onClick={resetFlow} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> Créer un devis
          </Button>
        </div>

        {oppQuotes.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Aucun devis</p>
            <p className="text-xs text-slate-400 mt-1">Créez votre premier devis avec assistance IA</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={resetFlow}>
              <Sparkles className="w-3.5 h-3.5" /> Générer un devis IA
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {oppQuotes.map(q => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{q.quote_number}</span>
                      <QuoteStatusBadge status={q.status} />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">{q.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(q.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-slate-900">{formatCurrency(q.costs.price_ttc)}</p>
                    <p className="text-xs text-slate-500">TTC</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex-1 text-xs text-slate-500">
                    Marge: <span className="font-medium text-green-600">{Math.round(q.costs.margin_rate * 100)}%</span>
                    {q.surface_m2 && <span className="ml-2">• {q.surface_m2} m²</span>}
                  </div>
                  {q.status === 'brouillon' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                      setCurrentDraftId(q.id)
                      setStep('preview')
                    }}>
                      <Eye className="w-3 h-3" /> Aperçu
                    </Button>
                  )}
                  {q.status === 'brouillon' && (
                    <Button size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleSendQuote(q.id)}>
                      <Send className="w-3 h-3" /> Envoyer
                    </Button>
                  )}
                  {q.status === 'envoye' && (
                    <Badge className="bg-orange-100 text-orange-700 text-xs">En attente signature</Badge>
                  )}
                  {q.status === 'signe' && (
                    <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Signé
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => handleDeleteQuote(q.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Step: Input
  if (step === 'input') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <StepHeader title="Visite terrain" step={1} total={4} onBack={() => setStep('list')} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Type de prestation</Label>
            <Select value={category} onValueChange={v => setCategory(v as ServiceCategory)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Surface (m²) *</Label>
            <Input
              type="number"
              placeholder="Ex: 250"
              value={surface}
              onChange={e => setSurface(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs text-slate-600 mb-1.5 block">Notes de visite</Label>
          <Textarea
            placeholder="Décrivez le site : accès, état des sols, obstacles, exigences particulières, contraintes logistiques..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="text-sm resize-none"
          />
        </div>

        {/* Voice recording */}
        <div className="flex items-center gap-3">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              isRecording
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? `Arrêter (${recordingDuration}s)` : 'Note vocale'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            Photos / Vidéos
            {uploadedImages.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {uploadedImages.length}
              </span>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleImageUpload} />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={!surface || parseFloat(surface) <= 0}
          className="w-full gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 h-10"
        >
          <Sparkles className="w-4 h-4" /> Analyser avec l'IA
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </motion.div>
    )
  }

  // Step: Extraction (analyzing)
  if (step === 'extraction') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <StepHeader title="Analyse IA" step={2} total={4} onBack={() => setStep('input')} />

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center animate-spin">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-600">Analyse en cours...</p>
            <p className="text-xs text-slate-400">Extraction des données de visite</p>
          </div>
        ) : extraction ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">Résumé IA de la visite</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{extraction.operational_recommendation}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <ExtractionRow label="Surface" value={`${extraction.surface_m2} m²`} />
              <ExtractionRow label="Complexité" value={extraction.complexity_level} />
              <ExtractionRow label="Durée estimée" value={`${extraction.estimated_duration_hours}h`} />
              <ExtractionRow label="Agents" value={`${extraction.workers_needed} agent(s)`} />
              <ExtractionRow label="Fréquence" value={extraction.frequency} />
              <ExtractionRow label="Urgence" value={extraction.urgency} />
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-medium text-slate-700">Machines nécessaires</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.machines_needed.map(m => (
                  <span key={m} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-medium text-slate-700">Consommables</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.consumables.map(c => (
                  <span key={c} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>

            {extraction.access_constraints !== 'Accès standard' && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{extraction.access_constraints}</p>
              </div>
            )}

            <Button onClick={handleConfirmExtraction} className="w-full gap-2 h-10">
              Confirmer et calculer le prix <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        ) : null}
      </motion.div>
    )
  }

  // Step: Pricing
  if (step === 'pricing' && pricingInput && costs) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <StepHeader title="Tarification" step={3} total={4} onBack={() => setStep('extraction')} />

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
          <p className="text-xs text-slate-400 mb-1">Prix de vente HT</p>
          <p className="text-3xl font-bold">{formatCurrency(costs.price_ht)}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
            <span>{formatCurrency(costs.price_ttc)} TTC</span>
            <span>•</span>
            <span className={`font-semibold ${costs.margin_rate >= 0.35 ? 'text-green-400' : 'text-red-400'}`}>
              Marge {Math.round(costs.margin_rate * 100)}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Décomposition des coûts</p>
          <PricingRow
            icon={<Users className="w-4 h-4 text-blue-500" />}
            label={`Main d'œuvre (${pricingInput.workers} ag. × ${pricingInput.hoursPerWorker}h @ ${pricingInput.hourlyLaborRate}€/h)`}
            value={costs.labor_cost}
          />
          <PricingRow
            icon={<Wrench className="w-4 h-4 text-violet-500" />}
            label="Machines & équipements"
            value={costs.machines_cost}
            editable
            onChange={v => handlePricingUpdate('machinesCost', v)}
          />
          <PricingRow
            icon={<FileText className="w-4 h-4 text-green-500" />}
            label="Consommables"
            value={costs.consumables_cost}
            editable
            onChange={v => handlePricingUpdate('consumablesCost', v)}
          />
          <PricingRow
            icon={<Euro className="w-4 h-4 text-amber-500" />}
            label="Déplacement"
            value={costs.transport_cost}
            editable
            onChange={v => handlePricingUpdate('transportCost', v)}
          />

          <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Coût total HT</span>
              <span className="font-medium">{formatCurrency(costs.total_cost_ht)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Marge brute</span>
              <span className="font-medium text-green-600">{formatCurrency(costs.price_ht - costs.total_cost_ht)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Prix HT</span>
              <span>{formatCurrency(costs.price_ht)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-xs">
              <span>TVA 20%</span>
              <span>{formatCurrency(costs.price_ttc - costs.price_ht)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-200">
              <span>Prix TTC</span>
              <span>{formatCurrency(costs.price_ttc)}</span>
            </div>
          </div>
        </div>

        {costs.margin_rate < 0.35 && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">Marge insuffisante. Prix ajusté automatiquement au minimum requis.</p>
          </div>
        )}

        <Button onClick={handleCreateDraft} className="w-full gap-2 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700">
          Générer le devis PDF <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </motion.div>
    )
  }

  // Step: Preview
  if (step === 'preview' && (currentDraft || oppQuotes.find(q => q.id === currentDraftId))) {
    const draft = currentDraft || oppQuotes.find(q => q.id === currentDraftId)!
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <StepHeader title="Aperçu & envoi" step={4} total={4} onBack={() => setStep('pricing')} />

        {/* PDF Preview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{companySettings.name}</p>
                <p className="text-slate-300 text-xs mt-1">{companySettings.address}</p>
                <p className="text-slate-300 text-xs">{companySettings.email} — {companySettings.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Devis n°</p>
                <p className="font-mono font-bold text-lg">{draft.quote_number}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(draft.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Client */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">CLIENT</p>
              <p className="font-semibold text-slate-900">{draft.client_name}</p>
              {draft.client_email && <p className="text-xs text-slate-500">{draft.client_email}</p>}
            </div>

            {/* Service */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Objet de la prestation</p>
              <p className="font-semibold text-slate-900">{draft.title}</p>
              {draft.surface_m2 && <p className="text-xs text-slate-500 mt-0.5">Surface concernée : {draft.surface_m2} m²</p>}
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Détail</p>
              <div className="space-y-1">
                {draft.line_items.map(li => (
                  <div key={li.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 flex-1 pr-2">{li.description}</span>
                    <span className="text-slate-500 text-xs whitespace-nowrap">{li.quantity} {li.unit}</span>
                    <span className="font-medium text-slate-900 ml-4 text-right w-20">{formatCurrency(li.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Total HT</span><span>{formatCurrency(draft.costs.price_ht)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>TVA (20%)</span><span>{formatCurrency(draft.costs.price_ttc - draft.costs.price_ht)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t border-slate-200">
                <span>Total TTC</span><span>{formatCurrency(draft.costs.price_ttc)}</span>
              </div>
            </div>

            {/* Signature area */}
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center mt-4">
              <p className="text-xs text-slate-400">Zone de signature électronique</p>
              <p className="text-xs text-slate-400 mt-1">Envoyé via Yousign</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 flex-1"
            onClick={() => {
              setStep('pricing')
              toast.info('Modifiez les paramètres de tarification')
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Regénérer
          </Button>
          {draft.status === 'brouillon' && (
            <Button
              size="sm"
              className="gap-1.5 flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleSendQuote(draft.id)}
            >
              <Send className="w-3.5 h-3.5" /> Envoyer via Yousign
            </Button>
          )}
          {draft.status === 'envoye' && (
            <Button size="sm" className="gap-1.5 flex-1 bg-green-600 hover:bg-green-700" disabled>
              <CheckCircle2 className="w-3.5 h-3.5" /> Envoyé — en attente
            </Button>
          )}
        </div>

        <button
          onClick={() => { setStep('list'); setCurrentDraftId(null) }}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1"
        >
          ← Retour à la liste des devis
        </button>
      </motion.div>
    )
  }

  return null
}

function StepHeader({ title, step, total, onBack }: { title: string; step: number; total: number; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180" />
      </button>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <div className="flex gap-1 mt-1">
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? 'bg-blue-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ExtractionRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 capitalize">{value}</p>
    </div>
  )
}

function PricingRow({ icon, label, value, editable, onChange }: {
  icon: React.ReactNode
  label: string
  value: number
  editable?: boolean
  onChange?: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-xs text-slate-600 flex-1">{label}</span>
      {editable && onChange ? (
        <input
          type="number"
          defaultValue={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 text-right text-sm font-medium border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <span className="text-sm font-medium text-slate-900 w-20 text-right">{formatCurrency(value)}</span>
      )}
    </div>
  )
}

function QuoteStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    brouillon: { bg: 'bg-slate-100', text: 'text-slate-600' },
    envoye: { bg: 'bg-orange-100', text: 'text-orange-700' },
    signe: { bg: 'bg-green-100', text: 'text-green-700' },
    refuse: { bg: 'bg-red-100', text: 'text-red-700' },
    expire: { bg: 'bg-slate-100', text: 'text-slate-400' },
  }
  const c = config[status] || config.brouillon
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
      {QUOTE_STATUS_LABELS[status] || status}
    </span>
  )
}
