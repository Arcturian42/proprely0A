'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePipelineStore } from '@/lib/pipeline-store'
import { uid } from '@/lib/uid'
import { PipelineLead, PipelinePriority, PipelineSource } from '@/types/pipeline'
import { toast } from 'sonner'

interface CreateLeadModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: (lead: PipelineLead) => void
}

const SECTORS = ['Bureaux', 'Médical', 'Industriel', 'Commerce', 'Éducation', 'Hôtellerie', 'Immobilier', 'Public', 'Tech', 'Autre']

export function CreateLeadModal({ open, onOpenChange, onCreated }: CreateLeadModalProps) {
  const { leads, contacts, addLead, addContact } = usePipelineStore()
  const [form, setForm] = useState({
    company_name: '',
    contact_first_name: '',
    contact_last_name: '',
    email: '',
    phone: '',
    value_monthly: '',
    sector: '',
    source: 'manual' as PipelineSource,
    priority: 'tiede' as PipelinePriority,
    assigned_to: 'Marie Dupont',
  })
  const [duplicate, setDuplicate] = useState(false)

  const set = (k: keyof typeof form, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'company_name') {
      setDuplicate(!!v && leads.some(l => l.company_name.toLowerCase() === v.toLowerCase()))
    }
    if (k === 'email') {
      setDuplicate(!!v && contacts.some(c => c.email?.toLowerCase() === v.toLowerCase()))
    }
  }

  const handleCreate = () => {
    if (!form.company_name || !form.contact_first_name || !form.contact_last_name) {
      toast.error('Nom société et contact requis')
      return
    }

    const now = new Date().toISOString()
    const leadId = uid('lead')

    const newLead: PipelineLead = {
      id: leadId,
      company_id: 'company-1',
      company_name: form.company_name,
      sector: form.sector || undefined,
      value_monthly: form.value_monthly ? parseFloat(form.value_monthly) : undefined,
      probability: 30,
      priority: form.priority,
      status: 'nouveau',
      source: form.source,
      tags: [],
      assigned_to: form.assigned_to,
      lifecycle_stage: 'prospect',
      created_at: now,
      updated_at: now,
    }

    addLead(newLead)

    if (form.contact_first_name) {
      addContact({
        id: uid('c'),
        lead_id: leadId,
        company_id: 'company-1',
        first_name: form.contact_first_name,
        last_name: form.contact_last_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        is_primary: true,
        created_at: now,
        updated_at: now,
      })
    }

    toast.success(`Lead "${form.company_name}" créé !`)
    onCreated?.(newLead)
    onOpenChange(false)
    setForm({ company_name: '', contact_first_name: '', contact_last_name: '', email: '', phone: '', value_monthly: '', sector: '', source: 'manual', priority: 'tiede', assigned_to: 'Marie Dupont' })
    setDuplicate(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {duplicate && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-700">
              ⚠️ Un lead avec ce nom existe déjà. Vérifiez avant de continuer.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom de la société *</Label>
              <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Ex: EDF Île-de-France" />
            </div>
            <div>
              <Label>Prénom contact *</Label>
              <Input value={form.contact_first_name} onChange={e => set('contact_first_name', e.target.value)} />
            </div>
            <div>
              <Label>Nom contact *</Label>
              <Input value={form.contact_last_name} onChange={e => set('contact_last_name', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="06 xx xx xx xx" />
            </div>
            <div>
              <Label>Valeur estimée (€/mois)</Label>
              <Input type="number" value={form.value_monthly} onChange={e => set('value_monthly', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Secteur</Label>
              <Select value={form.sector} onValueChange={v => set('sector', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => set('source', v as PipelineSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="website">Site web</SelectItem>
                  <SelectItem value="referral">Référence</SelectItem>
                  <SelectItem value="ai">IA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as PipelinePriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chaud">🔴 Chaud</SelectItem>
                  <SelectItem value="tiede">🟡 Tiède</SelectItem>
                  <SelectItem value="froid">🔵 Froid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigné à</Label>
              <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Marie Dupont">Marie Dupont</SelectItem>
                  <SelectItem value="Paul Moreau">Paul Moreau</SelectItem>
                  <SelectItem value="Jean Durand">Jean Durand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleCreate}>Créer le lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
