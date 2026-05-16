'use client'

import { useState } from 'react'
import { PipelineLead, PipelineStatus, PipelinePriority } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { PIPELINE_STATUS_LABELS, LOST_REASONS } from '@/lib/pipeline-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface TabSettingsProps {
  lead: PipelineLead
  onClose: () => void
}

const ALL_STATUSES: PipelineStatus[] = ['nouveau', 'a_qualifier', 'devis_a_preparer', 'devis_envoye', 'en_discussion', 'gagne', 'perdu', 'archive']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  )
}

export function TabSettings({ lead, onClose }: TabSettingsProps) {
  const { updateLead, deleteLead } = usePipelineStore()
  const [form, setForm] = useState({
    status: lead.status,
    priority: lead.priority,
    probability: lead.probability.toString(),
    assigned_to: lead.assigned_to,
    value_monthly: lead.value_monthly?.toString() ?? '',
    value_total: lead.value_total?.toString() ?? '',
    source: lead.source,
    lifecycle_stage: lead.lifecycle_stage,
    next_action_date: lead.next_action_date?.split('T')[0] ?? '',
    next_action_type: lead.next_action_type ?? '',
    estimated_close_date: lead.estimated_close_date?.split('T')[0] ?? '',
    tags: lead.tags.join(', '),
    lost_reason: lead.lost_reason ?? '',
    lost_comment: lead.lost_comment ?? '',
    won_reason: lead.won_reason ?? '',
    won_comment: lead.won_comment ?? '',
  })
  const [showDelete, setShowDelete] = useState(false)

  const handleSave = () => {
    updateLead(lead.id, {
      status: form.status as PipelineStatus,
      priority: form.priority as PipelinePriority,
      probability: parseInt(form.probability),
      assigned_to: form.assigned_to,
      value_monthly: form.value_monthly ? parseFloat(form.value_monthly) : undefined,
      value_total: form.value_total ? parseFloat(form.value_total) : undefined,
      source: form.source as PipelineLead['source'],
      lifecycle_stage: form.lifecycle_stage as PipelineLead['lifecycle_stage'],
      next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : undefined,
      next_action_type: form.next_action_type || undefined,
      estimated_close_date: form.estimated_close_date ? new Date(form.estimated_close_date).toISOString() : undefined,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      lost_reason: form.lost_reason || undefined,
      lost_comment: form.lost_comment || undefined,
      won_reason: form.won_reason || undefined,
      won_comment: form.won_comment || undefined,
    })
    toast.success('Paramètres sauvegardés')
  }

  const handleDelete = () => {
    deleteLead(lead.id)
    toast.success('Lead supprimé')
    onClose()
  }

  return (
    <div className="space-y-6 p-1">
      {/* Pipeline status */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-4">
        <h4 className="font-semibold text-sm text-slate-700">Statut pipeline</h4>
        <Field label="Statut *">
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as PipelineStatus }))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{PIPELINE_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {/* Status visual flow */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {ALL_STATUSES.filter(s => !['archive'].includes(s)).map((s, i, arr) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => setForm(f => ({ ...f, status: s }))}
                className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors ${form.status === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {PIPELINE_STATUS_LABELS[s].split(' ')[0]}
              </button>
              {i < arr.length - 1 && <span className="text-slate-300 text-xs">→</span>}
            </div>
          ))}
        </div>

        {form.status === 'perdu' && (
          <div className="space-y-2 rounded-lg bg-red-50 border border-red-200 p-3">
            <Field label="Raison de la perte">
              <Select value={form.lost_reason} onValueChange={v => setForm(f => ({ ...f, lost_reason: v }))}>
                <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Commentaire">
              <Textarea value={form.lost_comment} onChange={e => setForm(f => ({ ...f, lost_comment: e.target.value }))} rows={2} className="bg-white text-sm" placeholder="Leçons apprises..." />
            </Field>
          </div>
        )}

        {form.status === 'gagne' && (
          <div className="space-y-2 rounded-lg bg-green-50 border border-green-200 p-3">
            <Field label="Raison du succès">
              <Input value={form.won_reason} onChange={e => setForm(f => ({ ...f, won_reason: e.target.value }))} className="h-8 bg-white" placeholder="Prix, réactivité, qualité..." />
            </Field>
            <Field label="Commentaire">
              <Textarea value={form.won_comment} onChange={e => setForm(f => ({ ...f, won_comment: e.target.value }))} rows={2} className="bg-white text-sm" />
            </Field>
          </div>
        )}
      </div>

      {/* Opportunity details */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-4">
        <h4 className="font-semibold text-sm text-slate-700">Opportunité</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valeur mensuelle (€/m)">
            <Input type="number" value={form.value_monthly} onChange={e => setForm(f => ({ ...f, value_monthly: e.target.value }))} className="h-8" />
          </Field>
          <Field label="Valeur totale (€/an)">
            <Input type="number" value={form.value_total} onChange={e => setForm(f => ({ ...f, value_total: e.target.value }))} className="h-8" />
          </Field>
          <Field label="Probabilité (%)">
            <Input type="number" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} className="h-8" min="0" max="100" />
          </Field>
          <Field label="Priorité">
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as PipelinePriority }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chaud">🔴 Chaud</SelectItem>
                <SelectItem value="tiede">🟡 Tiède</SelectItem>
                <SelectItem value="froid">🔵 Froid</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Assigné à">
            <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Marie Dupont">Marie Dupont</SelectItem>
                <SelectItem value="Paul Moreau">Paul Moreau</SelectItem>
                <SelectItem value="Jean Durand">Jean Durand</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source">
            <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v as PipelineLead['source'] }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="website">Site web</SelectItem>
                <SelectItem value="referral">Référence</SelectItem>
                <SelectItem value="ai">IA</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-semibold text-sm text-slate-700">Prochaine action</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} className="h-8" />
          </Field>
          <Field label="Type">
            <Select value={form.next_action_type} onValueChange={v => setForm(f => ({ ...f, next_action_type: v }))}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {['appel', 'email', 'visite', 'devis', 'relance', 'negociation', 'signature'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Clôture estimée">
            <Input type="date" value={form.estimated_close_date} onChange={e => setForm(f => ({ ...f, estimated_close_date: e.target.value }))} className="h-8" />
          </Field>
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-2">
        <h4 className="font-semibold text-sm text-slate-700">Tags</h4>
        <Field label="Tags (séparés par virgule)">
          <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Industriel, Urgent, VIP..." className="h-8" />
        </Field>
      </div>

      <Button onClick={handleSave} className="w-full">Sauvegarder</Button>

      {/* Danger zone */}
      <Separator />
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
        <h4 className="font-semibold text-sm text-red-700">Zone dangereuse</h4>
        {!showDelete ? (
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>Supprimer ce lead</Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600">Cette action est irréversible. Toutes les données associées seront supprimées.</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete}>Confirmer la suppression</Button>
              <Button size="sm" variant="outline" onClick={() => setShowDelete(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
