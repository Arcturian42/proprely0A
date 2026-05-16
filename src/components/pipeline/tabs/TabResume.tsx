'use client'

import { PipelineLead } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { formatCurrency } from '@/lib/utils'
import { PRIORITY_CONFIG, SOURCE_CONFIG } from '@/lib/pipeline-actions'
import { cn } from '@/lib/utils'
import { Mail, Phone, Building2, MapPin, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TabResumeProps {
  lead: PipelineLead
}

export function TabResume({ lead }: TabResumeProps) {
  const contacts = usePipelineStore(s => s.contacts.filter(c => c.lead_id === lead.id))
  const quotes = usePipelineStore(s => s.quotes.filter(q => q.lead_id === lead.id))
  const files = usePipelineStore(s => s.files.filter(f => f.lead_id === lead.id).slice(0, 3))
  const priority = PRIORITY_CONFIG[lead.priority]
  const source = SOURCE_CONFIG[lead.source]

  return (
    <div className="space-y-4 p-1">
      {/* Company profile */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">{lead.company_name}</h3>
            {lead.sector && <p className="text-sm text-slate-500">{lead.sector}</p>}
          </div>
          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium', priority.color)}>
            {priority.icon} {priority.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {lead.siret && (
            <div>
              <p className="text-xs text-slate-400">SIRET</p>
              <p className="font-mono text-slate-700">{lead.siret}</p>
            </div>
          )}
          {lead.address && (
            <div className="flex items-start gap-1">
              <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-slate-700">{lead.address}</p>
            </div>
          )}
          {lead.company_size && (
            <div>
              <p className="text-xs text-slate-400">Taille</p>
              <p className="text-slate-700">{lead.company_size} employés</p>
            </div>
          )}
          {lead.annual_revenue && lead.annual_revenue > 0 && (
            <div>
              <p className="text-xs text-slate-400">CA annuel</p>
              <p className="text-slate-700">{formatCurrency(lead.annual_revenue)}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', source.color)}>
            {source.label}
          </span>
          {lead.ai_score && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
              Score IA : {lead.ai_score}/100
            </span>
          )}
        </div>
      </div>

      {/* Opportunity details */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-semibold text-sm text-slate-700">Opportunité</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {lead.value_monthly && (
            <div>
              <p className="text-xs text-slate-400">Valeur mensuelle</p>
              <p className="font-semibold text-green-700">{formatCurrency(lead.value_monthly)}/m</p>
            </div>
          )}
          {lead.value_total && (
            <div>
              <p className="text-xs text-slate-400">Valeur annuelle</p>
              <p className="font-semibold text-green-700">{formatCurrency(lead.value_total)}/an</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400">Probabilité</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.probability}%` }} />
              </div>
              <span className="text-slate-700 font-medium">{lead.probability}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400">Assigné à</p>
            <p className="text-slate-700">{lead.assigned_to}</p>
          </div>
          {lead.estimated_close_date && (
            <div>
              <p className="text-xs text-slate-400">Clôture estimée</p>
              <p className="text-slate-700">{new Date(lead.estimated_close_date).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contacts */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-semibold text-sm text-slate-700">Contacts ({contacts.length})</h4>
        <div className="space-y-2">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-800">{contact.first_name} {contact.last_name}</span>
                  {contact.is_primary && <Badge variant="outline" className="text-xs h-4 py-0 text-blue-600 border-blue-200">Principal</Badge>}
                </div>
                {contact.role && <p className="text-xs text-slate-500">{contact.role}</p>}
                <div className="flex gap-3 mt-1">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Mail className="w-3 h-3" />{contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />{contact.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {contacts.length === 0 && <p className="text-sm text-slate-400">Aucun contact</p>}
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-2">
        <h4 className="font-semibold text-sm text-slate-700">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {lead.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-slate-600">
              <Tag className="w-3 h-3 mr-1" />{tag}
            </Badge>
          ))}
          {lead.tags.length === 0 && <p className="text-sm text-slate-400">Aucun tag</p>}
        </div>
      </div>

      {/* Documents preview */}
      {files.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-2">
          <h4 className="font-semibold text-sm text-slate-700">Derniers fichiers</h4>
          <div className="space-y-1">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline value hint */}
      {lead.value_monthly && quotes.length > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-xs text-green-700 font-semibold">💡 {quotes.length} devis généré{quotes.length > 1 ? 's' : ''}</p>
          <p className="text-sm text-green-800 mt-1">
            Potentiel : {formatCurrency(lead.value_monthly * 12)}/an
            <span className="text-green-600 ml-2">({lead.probability}% de probabilité)</span>
          </p>
        </div>
      )}
    </div>
  )
}
