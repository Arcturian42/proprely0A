'use client'

import { useState } from 'react'
import { PipelineLead, Quote } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { QuoteBuilder } from '../QuoteBuilder'
import { QuotePDF } from '../QuotePDF'
import { sendQuoteEmail } from '@/lib/resend'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Plus, Mail, Copy, Trash2, CheckCircle, Clock, X } from 'lucide-react'
import { generateQuoteNumber } from '@/lib/pipeline-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TabQuotesProps {
  lead: PipelineLead
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: Clock },
  envoye: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700', icon: Mail },
  signe: { label: 'Signé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  refuse: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: X },
  expire: { label: 'Expiré', color: 'bg-slate-100 text-slate-500', icon: Clock },
}

function QuoteCard({ quote, lead, onUpdate, onDelete, onDuplicate }: { quote: Quote; lead: PipelineLead; onUpdate: (id: string, data: Partial<Quote>) => void; onDelete: (id: string) => void; onDuplicate: (q: Quote) => void }) {
  const [sending, setSending] = useState(false)
  const cfg = STATUS_CONFIG[quote.status] ?? { label: quote.status, color: 'bg-slate-100 text-slate-600', icon: Clock }
  const StatusIcon = cfg.icon
  const contacts = usePipelineStore(s => s.contacts.filter(c => c.lead_id === lead.id && c.is_primary))
  const primaryContact = contacts[0]

  const handleSend = async () => {
    if (!primaryContact?.email) { toast.error('Aucun email de contact principal'); return }
    setSending(true)
    const result = await sendQuoteEmail({
      to: primaryContact.email,
      contactName: `${primaryContact.first_name} ${primaryContact.last_name}`,
      companyName: lead.company_name,
      quoteNumber: quote.quote_number,
      totalTTC: quote.total_ttc,
      validUntil: quote.valid_until,
      pdfBase64: '',
    })
    setSending(false)
    if (result.success) {
      onUpdate(quote.id, { status: 'envoye', email_sent_at: new Date().toISOString() })
      toast.success(`Devis envoyé à ${primaryContact.email}`)
    } else {
      toast.error(`Erreur : ${result.error}`)
    }
  }

  const handleDuplicate = () => {
    onDuplicate(quote)
  }

  const handleMarkSigned = () => {
    onUpdate(quote.id, { status: 'signe', signed_at: new Date().toISOString(), signed_by: 'Client (signature numérique)' })
    toast.success('Devis marqué comme signé ! 🎉')
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Quote header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-slate-800">{quote.quote_number}</p>
          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg.color)}>
            <StatusIcon className="w-3 h-3" />{cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <QuotePDF quote={quote} lead={lead} />
          {quote.status === 'brouillon' && (
            <Button size="sm" variant="outline" onClick={handleSend} disabled={sending} className="gap-1 text-xs h-7">
              <Mail className="w-3 h-3" />{sending ? '...' : 'Envoyer'}
            </Button>
          )}
          {quote.status === 'envoye' && (
            <Button size="sm" variant="outline" onClick={handleMarkSigned} className="gap-1 text-xs h-7 text-green-600 border-green-200">
              <CheckCircle className="w-3 h-3" /> Signé
            </Button>
          )}
          <button onClick={handleDuplicate} className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors" title="Dupliquer">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(quote.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quote body */}
      <div className="px-4 py-3 space-y-2">
        {/* Line items summary */}
        {quote.line_items.slice(0, 2).map(li => (
          <div key={li.id} className="flex items-center justify-between text-xs text-slate-600">
            <span className="truncate mr-2">{li.service}{li.surface ? ` — ${li.surface}m²` : ''}</span>
            <span className="shrink-0 font-medium">{formatCurrency(li.total)}</span>
          </div>
        ))}
        {quote.line_items.length > 2 && (
          <p className="text-xs text-slate-400">+{quote.line_items.length - 2} service{quote.line_items.length - 2 > 1 ? 's' : ''}</p>
        )}

        {/* Totals */}
        <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Total TTC</p>
            <p className="font-bold text-slate-800">{formatCurrency(quote.total_ttc)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Marge</p>
            <p className={cn('text-sm font-semibold', quote.margin_pct >= 30 ? 'text-green-600' : quote.margin_pct >= 15 ? 'text-yellow-600' : 'text-red-600')}>
              {quote.margin_pct >= 30 ? '🟢' : quote.margin_pct >= 15 ? '🟡' : '🔴'} {quote.margin_pct}%
            </p>
          </div>
          {quote.valid_until && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Valide jusqu'au</p>
              <p className="text-xs text-slate-600">{new Date(quote.valid_until).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
        </div>

        {/* Vocal input indicator */}
        {quote.vocal_input_raw && (
          <div className="rounded-lg bg-violet-50 border border-violet-100 px-2 py-1.5">
            <p className="text-xs text-violet-600 font-medium">🎤 Créé par saisie vocale</p>
            <p className="text-xs text-violet-500 line-clamp-1 italic mt-0.5">&ldquo;{quote.vocal_input_raw}&rdquo;</p>
          </div>
        )}

        {/* Signed info */}
        {quote.status === 'signe' && quote.signed_at && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-2 py-1.5">
            <p className="text-xs text-green-700">✅ Signé le {new Date(quote.signed_at).toLocaleDateString('fr-FR')}</p>
            {quote.signed_by && <p className="text-xs text-green-600">{quote.signed_by}</p>}
          </div>
        )}

        {/* Email sent indicator */}
        {quote.email_sent_at && (
          <p className="text-xs text-slate-400">📧 Envoyé le {new Date(quote.email_sent_at).toLocaleDateString('fr-FR')}</p>
        )}
      </div>
    </div>
  )
}

export function TabQuotes({ lead }: TabQuotesProps) {
  const { quotes, updateQuote, deleteQuote, addQuote } = usePipelineStore()
  const leadQuotes = quotes.filter(q => q.lead_id === lead.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const [creating, setCreating] = useState(false)

  const handleSaved = () => {
    setCreating(false)
  }

  const handleDelete = (id: string) => {
    deleteQuote(id)
    toast.success('Devis supprimé')
  }

  const handleDuplicate = (source: Quote) => {
    const now = new Date().toISOString()
    const newNumber = generateQuoteNumber(quotes.length)
    addQuote({
      ...source,
      id: `q-${Date.now()}`,
      quote_number: newNumber,
      status: 'brouillon',
      email_sent_at: undefined,
      signed_at: undefined,
      signed_by: undefined,
      signature_status: 'pending',
      created_at: now,
      updated_at: now,
    })
    toast.success(`Devis ${newNumber} dupliqué`)
  }

  if (creating) {
    return (
      <div className="p-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Nouveau devis — {lead.company_name}</h3>
        </div>
        <QuoteBuilder
          lead={lead}
          existingQuoteCount={leadQuotes.length}
          onSaved={() => handleSaved()}
          onCancel={() => setCreating(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{leadQuotes.length} devis</p>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1">
          <Plus className="w-3 h-3" /> Nouveau devis
        </Button>
      </div>

      {leadQuotes.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
            <Plus className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-sm text-slate-500">Aucun devis — créez votre premier devis</p>
          <Button onClick={() => setCreating(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Créer un devis
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {leadQuotes.map(q => (
            <QuoteCard key={q.id} quote={q} lead={lead} onUpdate={updateQuote} onDelete={handleDelete} onDuplicate={handleDuplicate} />
          ))}
        </div>
      )}
    </div>
  )
}
