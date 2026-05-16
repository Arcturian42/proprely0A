'use client'

import { useState } from 'react'
import { PipelineLead, PipelineEmail } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { EMAIL_TEMPLATES } from '@/lib/pipeline-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Send, Clock, CheckCheck, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TabEmailsProps {
  lead: PipelineLead
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent: <Send className="w-3 h-3 text-blue-500" />,
  delivered: <CheckCheck className="w-3 h-3 text-green-500" />,
  opened: <Eye className="w-3 h-3 text-violet-500" />,
}
const STATUS_LABELS: Record<string, string> = { sent: 'Envoyé', delivered: 'Reçu', opened: 'Ouvert' }

export function TabEmails({ lead }: TabEmailsProps) {
  const { emails, addEmail, contacts } = usePipelineStore()
  const leadEmails = emails.filter(e => e.lead_id === lead.id).sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
  const primaryContact = contacts.find(c => c.lead_id === lead.id && c.is_primary)

  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    to: primaryContact?.email ?? '',
    subject: '',
    body: '',
    template: '',
  })

  const handleTemplate = (key: string) => {
    const tpl = EMAIL_TEMPLATES[key]
    setForm(f => ({ ...f, template: key, subject: tpl.subject, body: tpl.body }))
  }

  const handleSend = async () => {
    if (!form.to || !form.subject || !form.body) { toast.error('Destinataire, objet et message requis'); return }
    setSending(true)
    await new Promise(r => setTimeout(r, 600))
    addEmail({
      id: `e-${Date.now()}`,
      lead_id: lead.id,
      company_id: lead.company_id,
      direction: 'sent',
      to_address: form.to,
      from_address: 'contact@proprely.fr',
      subject: form.subject,
      body: form.body,
      sent_at: new Date().toISOString(),
      status: 'sent',
      template: form.template || undefined,
    })
    setSending(false)
    setShowCompose(false)
    setForm({ to: primaryContact?.email ?? '', subject: '', body: '', template: '' })
    toast.success('Email envoyé !')
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setShowCompose(!showCompose)} className="gap-1">
          <Mail className="w-3 h-3" /> Composer
        </Button>
        <div className="flex gap-1">
          {Object.entries(EMAIL_TEMPLATES).map(([key, tpl]) => (
            <Button key={key} size="sm" variant="outline" className="text-xs h-7" onClick={() => { setShowCompose(true); handleTemplate(key) }}>
              {key === 'introduction' ? 'Intro' : key === 'follow_up' ? 'Suivi' : key === 'quote' ? 'Devis' : key === 'reminder' ? 'Rappel' : 'Merci'}
            </Button>
          ))}
        </div>
      </div>

      {showCompose && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div>
            <Label className="text-xs">À *</Label>
            <Input value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} className="h-8 bg-white" placeholder="email@example.com" />
          </div>
          <div>
            <Label className="text-xs">Objet *</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="h-8 bg-white" />
          </div>
          <div>
            <Label className="text-xs">Message *</Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} className="bg-white text-sm" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSend} disabled={sending} className="gap-1 flex-1">
              <Send className="w-3 h-3" /> {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCompose(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Email history */}
      <div className="space-y-2">
        {leadEmails.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">Aucun email</div>
        ) : (
          leadEmails.map(email => (
            <div key={email.id} className={cn('rounded-xl border p-4 space-y-2', email.direction === 'sent' ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {email.direction === 'sent' ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Envoyé</span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">Reçu</span>
                  )}
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    {STATUS_ICONS[email.status] ?? null}
                    {STATUS_LABELS[email.status] ?? email.status}
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(email.sent_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-800">{email.subject}</p>
              <p className="text-xs text-slate-500">→ {email.to_address}</p>
              <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 rounded p-2">{email.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
