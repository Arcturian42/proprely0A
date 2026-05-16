'use client'

import { useState, useCallback } from 'react'
import { PipelineLead, Quote, QuoteLineItem, ParsedQuoteData } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { generateAISuggestion, parsedDataToLineItems, recalculateQuote } from '@/lib/quote-calculator'
import { generateQuoteNumber } from '@/lib/pipeline-actions'
import { uid } from '@/lib/uid'
import { VocalInput } from './VocalInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Lightbulb, Save, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface QuoteBuilderProps {
  lead: PipelineLead
  onSaved: (quote: Quote) => void
  onCancel: () => void
}

const SERVICES = ['Nettoyage bureaux', 'Nettoyage moquette', 'Vitrerie', 'Nettoyage médical', 'Nettoyage industriel', 'Parties communes', 'Nettoyage fin de chantier', 'Autre']
const FREQUENCIES = ['5x/semaine', '3x/semaine', '2x/semaine', '1x/semaine', '2x/mois', '1x/mois']

interface AISuggestionPanelProps {
  data: ParsedQuoteData
  onApply: (items: QuoteLineItem[]) => void
}

function AISuggestionPanel({ data, onApply }: AISuggestionPanelProps) {
  const suggestion = generateAISuggestion(data)
  const margin = suggestion.margin_pct
  const marginColor = margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'
  const marginIcon = margin >= 30 ? '🟢' : margin >= 15 ? '🟡' : '🔴'

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-blue-600" />
        <p className="font-semibold text-sm text-blue-800">Suggestion IA</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-blue-600">SOP suggéré</p>
          <p className="font-medium text-slate-800">{suggestion.sop_label}</p>
        </div>
        <div>
          <p className="text-xs text-blue-600">Durée / visite</p>
          <p className="font-medium text-slate-800">{suggestion.estimated_hours_per_visit}h ({suggestion.agents_needed} agent{suggestion.agents_needed > 1 ? 's' : ''})</p>
        </div>
        <div>
          <p className="text-xs text-blue-600">Coût estimé</p>
          <p className="font-medium text-slate-800">{formatCurrency(suggestion.cost_per_month)}/mois</p>
        </div>
        <div>
          <p className="text-xs text-blue-600">Prix recommandé</p>
          <p className="font-semibold text-green-700">{formatCurrency(suggestion.recommended_price)}/mois</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-blue-600">Marge estimée</p>
          <p className={cn('font-semibold', marginColor)}>{marginIcon} {suggestion.margin_pct}%</p>
        </div>
      </div>
      <Button size="sm" onClick={() => onApply(parsedDataToLineItems(data, suggestion))} className="w-full gap-1">
        <Plus className="w-3 h-3" /> Appliquer cette suggestion
      </Button>
    </div>
  )
}

export function QuoteBuilder({ lead, onSaved, onCancel }: QuoteBuilderProps) {
  const { quotes, addQuote } = usePipelineStore()
  const [mode, setMode] = useState<'vocal' | 'manual'>('vocal')
  const [parsedData, setParsedData] = useState<ParsedQuoteData | null>(null)
  const [vocalRaw, setVocalRaw] = useState('')

  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([])
  const [laborCost, setLaborCost] = useState(0)
  const [productsCost, setProductsCost] = useState(0)
  const [travelCost, setTravelCost] = useState(0)
  const [equipmentCost, setEquipmentCost] = useState(0)
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  // Manual mode state
  const [manualService, setManualService] = useState('')
  const [manualSurface, setManualSurface] = useState('')
  const [manualFreq, setManualFreq] = useState('')
  const [manualPrice, setManualPrice] = useState('')

  const calc = recalculateQuote(lineItems, laborCost, productsCost, travelCost, equipmentCost)

  const handleVocalParsed = useCallback((data: ParsedQuoteData, raw: string) => {
    setParsedData(data)
    setVocalRaw(raw)
  }, [])

  const handleApplySuggestion = useCallback((items: QuoteLineItem[]) => {
    setLineItems(items)
    // Auto-fill costs
    const suggestion = parsedData ? generateAISuggestion(parsedData) : null
    if (suggestion) {
      const total = items.reduce((s, i) => s + i.total, 0)
      setLaborCost(Math.round(total * 0.65))
      setProductsCost(Math.round(total * 0.08))
      setTravelCost(Math.round(total * 0.03))
      setEquipmentCost(Math.round(total * 0.02))
    }
  }, [parsedData])

  const addManualLine = () => {
    if (!manualService) { toast.error('Service requis'); return }
    const price = parseFloat(manualPrice) || 0
    const qty = 1
    setLineItems(l => [...l, {
      id: uid('li'),
      service: manualService,
      surface: manualSurface ? parseFloat(manualSurface) : undefined,
      frequency: manualFreq || undefined,
      unit_price: price,
      quantity: qty,
      total: price * qty,
    }])
    setManualService(''); setManualSurface(''); setManualFreq(''); setManualPrice('')
  }

  const updateLineItem = (id: string, field: keyof QuoteLineItem, value: string | number) => {
    setLineItems(items => items.map(li => {
      if (li.id !== id) return li
      const updated = { ...li, [field]: value }
      if (field === 'unit_price' || field === 'quantity') {
        updated.total = (updated.unit_price ?? 0) * (updated.quantity ?? 1)
      }
      return updated
    }))
  }

  const handleSave = async (status: 'brouillon' | 'envoye' = 'brouillon') => {
    if (lineItems.length === 0) { toast.error('Ajoutez au moins un service'); return }
    setSaving(true)
    const quoteNumber = generateQuoteNumber(quotes.length)
    const newQuote: Quote = {
      id: uid('q'),
      lead_id: lead.id,
      company_id: lead.company_id,
      quote_number: quoteNumber,
      status,
      line_items: lineItems,
      labor_cost: laborCost,
      products_cost: productsCost,
      travel_cost: travelCost,
      equipment_cost: equipmentCost,
      tva_rate: 20,
      ...calc,
      notes: notes || undefined,
      valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
      vocal_input_raw: vocalRaw || undefined,
      parsed_data: parsedData || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await new Promise(r => setTimeout(r, 300))
    addQuote(newQuote)
    setSaving(false)
    toast.success(`Devis ${quoteNumber} ${status === 'brouillon' ? 'enregistré' : 'envoyé'}`)
    onSaved(newQuote)
  }

  const marginColor = calc.margin_pct >= 30 ? 'text-green-600 bg-green-50 border-green-200' : calc.margin_pct >= 15 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-red-600 bg-red-50 border-red-200'
  const marginIcon = calc.margin_pct >= 30 ? '🟢' : calc.margin_pct >= 15 ? '🟡' : '🔴'

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={v => setMode(v as 'vocal' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vocal">🎤 Vocal</TabsTrigger>
          <TabsTrigger value="manual">⌨️ Formulaire</TabsTrigger>
        </TabsList>

        <TabsContent value="vocal" className="mt-4 space-y-4">
          <VocalInput onParsed={handleVocalParsed} />
          {parsedData && <AISuggestionPanel data={parsedData} onApply={handleApplySuggestion} />}
        </TabsContent>

        <TabsContent value="manual" className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600">Ajouter un service</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Select value={manualService} onValueChange={setManualService}>
                  <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Type de service..." /></SelectTrigger>
                  <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input type="number" placeholder="Surface m²" value={manualSurface} onChange={e => setManualSurface(e.target.value)} className="h-8 bg-white" />
              <Select value={manualFreq} onValueChange={setManualFreq}>
                <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Fréquence..." /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Prix unitaire €" value={manualPrice} onChange={e => setManualPrice(e.target.value)} className="h-8 bg-white" />
              <Button size="sm" onClick={addManualLine} className="gap-1 h-8"><Plus className="w-3 h-3" /> Ajouter</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Line items table */}
      {lineItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Service</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Qté</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">P.U.</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Total</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map(li => (
                <tr key={li.id}>
                  <td className="px-3 py-2">
                    <p className="text-xs font-medium text-slate-800">{li.service}</p>
                    {li.surface && <p className="text-xs text-slate-400">{li.surface} {li.surface_unit ?? 'm²'}</p>}
                    {li.frequency && <p className="text-xs text-slate-400">{li.frequency}</p>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={li.quantity}
                      onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value))}
                      className="w-12 text-right text-xs border border-slate-200 rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={li.unit_price}
                      onChange={e => updateLineItem(li.id, 'unit_price', parseFloat(e.target.value))}
                      className="w-16 text-right text-xs border border-slate-200 rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium text-slate-800">{formatCurrency(li.total)}</td>
                  <td className="px-2 py-2">
                    <button onClick={() => setLineItems(l => l.filter(x => x.id !== li.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cost breakdown */}
      {lineItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600">Ventilation des coûts</p>
          <div className="grid grid-cols-2 gap-2">
            {([['Main d\'œuvre', laborCost, setLaborCost], ['Produits', productsCost, setProductsCost], ['Déplacements', travelCost, setTravelCost], ['Équipement', equipmentCost, setEquipmentCost]] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <Label className="text-xs text-slate-500">{label} €</Label>
                <Input type="number" value={val} onChange={e => setter(parseFloat(e.target.value) || 0)} className="h-7 text-xs mt-0.5" />
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t border-slate-100 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total HT</span>
              <span className="font-semibold">{formatCurrency(calc.subtotal_ht)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>TVA 20%</span>
              <span>{formatCurrency(calc.tva_amount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1">
              <span>Total TTC</span>
              <span className="text-blue-600">{formatCurrency(calc.total_ttc)}</span>
            </div>
            <div className={cn('flex justify-between text-sm mt-2 px-2 py-1 rounded-lg border', marginColor)}>
              <span>Marge</span>
              <span className="font-bold">{marginIcon} {calc.margin_pct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes + validity */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Notes / Conditions</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm" placeholder="Conditions particulières..." />
        </div>
        <div>
          <Label className="text-xs">Valide jusqu&apos;au</Label>
          <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-8" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Annuler</Button>
        <Button variant="outline" onClick={() => handleSave('brouillon')} disabled={saving || lineItems.length === 0} className="gap-1">
          <Save className="w-3 h-3" /> {saving ? '...' : 'Brouillon'}
        </Button>
        <Button onClick={() => handleSave('envoye')} disabled={saving || lineItems.length === 0} className="flex-1 gap-1">
          <Mail className="w-3 h-3" />{saving ? 'Envoi...' : 'Créer & Envoyer'}
        </Button>
      </div>
    </div>
  )
}
