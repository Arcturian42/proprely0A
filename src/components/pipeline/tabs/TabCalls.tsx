'use client'

import { useState } from 'react'
import { PipelineLead, PipelineCall } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TabCallsProps {
  lead: PipelineLead
}

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  no_answer: { label: 'Sans réponse', color: 'text-slate-500' },
  voicemail: { label: 'Messagerie', color: 'text-yellow-600' },
  connected: { label: 'Connecté', color: 'text-green-600' },
  scheduled: { label: 'RDV planifié', color: 'text-blue-600' },
  qualified: { label: 'Qualifié', color: 'text-violet-600' },
  not_interested: { label: 'Pas intéressé', color: 'text-red-600' },
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m${s > 0 ? ` ${s}s` : ''}`
}

export function TabCalls({ lead }: TabCallsProps) {
  const { calls, addCall, deleteCall, contacts } = usePipelineStore()
  const leadCalls = calls.filter(c => c.lead_id === lead.id).sort((a, b) => new Date(b.made_at).getTime() - new Date(a.made_at).getTime())
  const primaryContact = contacts.find(c => c.lead_id === lead.id && c.is_primary)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    direction: 'outbound' as 'inbound' | 'outbound',
    duration_minutes: '5',
    summary: '',
    outcome: 'connected' as PipelineCall['outcome'],
    rating: '3',
  })

  const handleCreate = () => {
    addCall({
      id: `cl-${Date.now()}`,
      lead_id: lead.id,
      company_id: lead.company_id,
      contact_id: primaryContact?.id,
      direction: form.direction,
      duration_seconds: parseInt(form.duration_minutes) * 60,
      summary: form.summary || undefined,
      outcome: form.outcome,
      rating: form.rating ? parseInt(form.rating) : undefined,
      made_by: 'Marie Dupont',
      made_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    setShowForm(false)
    setForm({ direction: 'outbound', duration_minutes: '5', summary: '', outcome: 'connected', rating: '3' })
    toast.success('Appel enregistré')
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Phone className="w-3 h-3" /> Enregistrer un appel
        </Button>
        {primaryContact?.phone && (
          <a href={`tel:${primaryContact.phone}`} className="text-sm text-blue-600 flex items-center gap-1 hover:underline">
            <PhoneOutgoing className="w-4 h-4" /> {primaryContact.phone}
          </a>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Direction</Label>
              <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v as 'inbound' | 'outbound' }))}>
                <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Sortant</SelectItem>
                  <SelectItem value="inbound">Entrant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Durée (minutes)</Label>
              <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className="h-8 bg-white" min="0" />
            </div>
            <div>
              <Label className="text-xs">Résultat</Label>
              <Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v as PipelineCall['outcome'] }))}>
                <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Qualité (1-5)</Label>
              <Input type="number" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="h-8 bg-white" min="1" max="5" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Résumé</Label>
              <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2} className="bg-white text-sm" placeholder="Points importants de la conversation..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} className="flex-1">Enregistrer</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Call history */}
      <div className="space-y-2">
        {leadCalls.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">Aucun appel enregistré</div>
        ) : (
          leadCalls.map(call => {
            const outcome = OUTCOME_CONFIG[call.outcome]
            return (
              <div key={call.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {call.direction === 'outbound'
                      ? <PhoneOutgoing className="w-4 h-4 text-blue-500" />
                      : <PhoneIncoming className="w-4 h-4 text-green-500" />
                    }
                    <span className={cn('text-sm font-medium', outcome.color)}>{outcome.label}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatDuration(call.duration_seconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {call.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('w-3 h-3', i < call.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200')} />
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(call.made_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <button onClick={() => { deleteCall(call.id); toast.success('Appel supprimé') }} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {call.summary && <p className="text-sm text-slate-600 bg-slate-50 rounded p-2">{call.summary}</p>}
                <p className="text-xs text-slate-400">Par {call.made_by}</p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
