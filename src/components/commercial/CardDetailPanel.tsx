'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'
import { Opportunity, OpportunityStage } from '@/types'
import { OPPORTUNITY_STAGE_LABELS, NEXT_ACTION_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  X, Phone, Mail, MapPin, Euro, Building2, Tag, Calendar, FileText,
  CheckCircle2, Clock, Edit3, Save, Trash2, Activity, LayoutGrid,
  ChevronRight, User, StickyNote, Files, History
} from 'lucide-react'
import { toast } from 'sonner'
import { QuoteFlow } from './QuoteFlow'

interface Props {
  opportunity: Opportunity
  onClose: () => void
  onDelete: (id: string) => void
  onWin: (id: string) => void
}

const STAGES: OpportunityStage[] = ['ouvert', 'decouverte', 'proposition', 'negociation', 'gagne', 'perdu']

const STAGE_COLORS: Record<OpportunityStage, string> = {
  ouvert: 'bg-slate-100 text-slate-700',
  decouverte: 'bg-blue-100 text-blue-700',
  proposition: 'bg-violet-100 text-violet-700',
  negociation: 'bg-amber-100 text-amber-700',
  gagne: 'bg-green-100 text-green-700',
  perdu: 'bg-red-100 text-red-700',
}

export function CardDetailPanel({ opportunity, onClose, onDelete, onWin }: Props) {
  const { updateOpportunity, moveOpportunity, quotes } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    title: opportunity.title,
    contact_name: opportunity.contact_name || '',
    email: opportunity.email || '',
    phone: opportunity.phone || '',
    city: opportunity.city || '',
    site_address: opportunity.site_address || '',
    service_type: opportunity.service_type || '',
    estimated_amount: opportunity.estimated_amount?.toString() || '',
    next_action_date: opportunity.next_action_date ? opportunity.next_action_date.split('T')[0] : '',
    notes: opportunity.notes || '',
  })

  const oppQuotes = quotes.filter(q => q.opportunity_id === opportunity.id)
  const hasSignedQuote = oppQuotes.some(q => q.status === 'signe')
  const hasSentQuote = oppQuotes.some(q => q.status === 'envoye')

  const handleSave = () => {
    updateOpportunity(opportunity.id, {
      ...form,
      estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
      next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    setIsEditing(false)
    toast.success('Opportunité mise à jour')
  }

  const handleStageChange = (stage: OpportunityStage) => {
    if (stage === 'gagne') {
      onWin(opportunity.id)
    } else {
      moveOpportunity(opportunity.id, stage)
      toast.success(`Déplacé en ${OPPORTUNITY_STAGE_LABELS[stage]}`)
    }
  }

  const nextActionLabel = opportunity.next_action_type
    ? NEXT_ACTION_TYPE_LABELS[opportunity.next_action_type] || opportunity.next_action_type
    : null

  const activities = [
    { date: opportunity.created_at, text: 'Opportunité créée', type: 'create' },
    opportunity.next_action_date || opportunity.next_action_note
      ? {
          date: opportunity.next_action_date || opportunity.updated_at,
          text: [
            `Prochaine action${nextActionLabel ? ` — ${nextActionLabel}` : ''}`,
            opportunity.next_action_note,
          ].filter(Boolean).join(' : '),
          type: 'next_action' as const,
        }
      : null,
    opportunity.notes
      ? { date: opportunity.updated_at, text: `Note : ${opportunity.notes}`, type: 'note' as const }
      : null,
    ...oppQuotes.map(q => ({ date: q.created_at, text: `Devis ${q.quote_number} créé`, type: 'quote' })),
    ...oppQuotes.filter(q => q.status === 'envoye').map(q => ({ date: q.updated_at, text: `Devis ${q.quote_number} envoyé`, type: 'sent' })),
    ...oppQuotes.filter(q => q.status === 'signe').map(q => ({ date: q.signed_at || q.updated_at, text: `Devis ${q.quote_number} signé ✓`, type: 'signed' })),
  ]
    .filter((a): a is { date: string; text: string; type: string } => a !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="font-semibold text-base border-0 p-0 focus-visible:ring-0 text-slate-900"
                  />
                ) : (
                  <h2 className="font-semibold text-base text-slate-900 leading-tight">{opportunity.title}</h2>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STAGE_COLORS[opportunity.stage]}`}>
                    {OPPORTUNITY_STAGE_LABELS[opportunity.stage]}
                  </span>
                  {opportunity.estimated_amount && (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                      {formatCurrency(opportunity.estimated_amount)}
                    </span>
                  )}
                  {hasSignedQuote && (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Signé
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-500" onClick={() => setIsEditing(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" className="h-8 px-3 gap-1 text-xs" onClick={handleSave}>
                      <Save className="w-3 h-3" /> Sauvegarder
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-500 hover:text-slate-700" onClick={() => setIsEditing(true)}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-slate-400 hover:text-red-500"
                      onClick={() => onDelete(opportunity.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-400 hover:text-slate-600" onClick={onClose}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stage selector */}
            {!isEditing && (
              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5">
                {STAGES.filter(s => s !== opportunity.stage).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStageChange(s)}
                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                      s === 'gagne'
                        ? 'border-green-200 text-green-700 hover:bg-green-50'
                        : s === 'perdu'
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    → {OPPORTUNITY_STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 pt-2 border-b border-slate-100 flex-shrink-0">
              <TabsList className="h-8 gap-1 bg-transparent p-0">
                <TabsTrigger value="overview" className="h-7 text-xs px-3 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500">
                  <LayoutGrid className="w-3 h-3 mr-1.5" />Vue
                </TabsTrigger>
                <TabsTrigger value="notes" className="h-7 text-xs px-3 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500">
                  <StickyNote className="w-3 h-3 mr-1.5" />Notes
                </TabsTrigger>
                <TabsTrigger value="devis" className="h-7 text-xs px-3 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500 relative">
                  <FileText className="w-3 h-3 mr-1.5" />Devis
                  {oppQuotes.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {oppQuotes.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity" className="h-7 text-xs px-3 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500">
                  <Activity className="w-3 h-3 mr-1.5" />Activité
                </TabsTrigger>
                <TabsTrigger value="timeline" className="h-7 text-xs px-3 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500">
                  <History className="w-3 h-3 mr-1.5" />Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={<Building2 className="w-3.5 h-3.5" />} label="Prospect" value={opportunity.prospect_name} />
                {opportunity.contact_name && (
                  <InfoCard
                    icon={<User className="w-3.5 h-3.5" />}
                    label={opportunity.contact_role ? `Contact · ${opportunity.contact_role}` : 'Contact'}
                    value={opportunity.contact_name}
                  />
                )}
                {opportunity.phone && <InfoCard icon={<Phone className="w-3.5 h-3.5" />} label="Téléphone" value={opportunity.phone} />}
                {opportunity.email && <InfoCard icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={opportunity.email} truncate />}
                {(opportunity.city || opportunity.postal_code) && (
                  <InfoCard
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    label="Ville"
                    value={[opportunity.postal_code, opportunity.city].filter(Boolean).join(' ')}
                  />
                )}
                {opportunity.service_type && <InfoCard icon={<Tag className="w-3.5 h-3.5" />} label="Type service" value={opportunity.service_type} />}
                {opportunity.estimated_amount && (
                  <InfoCard icon={<Euro className="w-3.5 h-3.5" />} label="Montant estimé" value={formatCurrency(opportunity.estimated_amount)} highlight />
                )}
                {opportunity.siret && <InfoCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="SIRET" value={opportunity.siret} truncate />}
                {opportunity.siren && !opportunity.siret && (
                  <InfoCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="SIREN" value={opportunity.siren} />
                )}
                {opportunity.naf_code && <InfoCard icon={<Tag className="w-3.5 h-3.5" />} label="Code NAF" value={opportunity.naf_code} />}
                {opportunity.legal_form && <InfoCard icon={<Building2 className="w-3.5 h-3.5" />} label="Forme juridique" value={opportunity.legal_form} truncate />}
                {opportunity.source && (
                  <InfoCard
                    icon={opportunity.source === 'sirene_api' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    label="Source"
                    value={opportunity.source === 'sirene_api' ? 'SIRENE vérifiée' : 'Saisie manuelle'}
                  />
                )}
              </div>

              {opportunity.site_address && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Adresse du site</p>
                  <p className="text-sm text-slate-700">{opportunity.site_address}</p>
                </div>
              )}

              {/* Next action block */}
              {(opportunity.next_action_type || opportunity.next_action_date || opportunity.next_action_note) && (
                <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Prochaine action
                  </div>
                  <div className="text-sm text-slate-800">
                    {opportunity.next_action_type
                      ? NEXT_ACTION_TYPE_LABELS[opportunity.next_action_type] || opportunity.next_action_type
                      : 'Action'}
                    {opportunity.next_action_date && (
                      <span className="text-slate-500 font-normal ml-1">
                        · {formatDate(opportunity.next_action_date)}
                      </span>
                    )}
                  </div>
                  {opportunity.next_action_note && (
                    <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">
                      {opportunity.next_action_note}
                    </p>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Modifier</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'contact_name', label: 'Contact', type: 'text' },
                      { key: 'phone', label: 'Téléphone', type: 'tel' },
                      { key: 'email', label: 'Email', type: 'email' },
                      { key: 'city', label: 'Ville', type: 'text' },
                      { key: 'estimated_amount', label: 'Montant €', type: 'number' },
                      { key: 'next_action_date', label: 'Prochaine action', type: 'date' },
                    ].map(f => (
                      <div key={f.key}>
                        <Label className="text-xs text-slate-500 mb-1 block">{f.label}</Label>
                        <Input
                          type={f.type}
                          value={(form as Record<string, string>)[f.key]}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-500 mb-1 block">Adresse site</Label>
                      <Input
                        value={form.site_address}
                        onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-4">
                {(opportunity.next_action_note || opportunity.next_action_type) && (
                  <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Prochaine action
                      {opportunity.next_action_type && (
                        <span className="font-medium text-amber-700">
                          · {NEXT_ACTION_TYPE_LABELS[opportunity.next_action_type] || opportunity.next_action_type}
                        </span>
                      )}
                      {opportunity.next_action_date && (
                        <span className="text-amber-700/70 font-normal">
                          · {formatDate(opportunity.next_action_date)}
                        </span>
                      )}
                    </div>
                    {opportunity.next_action_note && (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {opportunity.next_action_note}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Notes internes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={8}
                    placeholder="Ajoutez des notes sur cette opportunité..."
                    className="text-sm resize-none"
                  />
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      updateOpportunity(opportunity.id, {
                        notes: form.notes,
                        updated_at: new Date().toISOString(),
                      })
                      toast.success('Notes sauvegardées')
                    }}
                  >
                    <Save className="w-3.5 h-3.5" /> Sauvegarder
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Devis Tab */}
            <TabsContent value="devis" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <QuoteFlow
                opportunity={opportunity}
                onQuoteSent={() => {
                  toast.success('Opportunité déplacée en Proposition')
                }}
              />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Activité récente</p>
                {activities.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      a.type === 'signed' ? 'bg-green-500'
                      : a.type === 'quote' ? 'bg-blue-500'
                      : a.type === 'sent' ? 'bg-orange-500'
                      : a.type === 'next_action' ? 'bg-amber-500'
                      : a.type === 'note' ? 'bg-violet-500'
                      : 'bg-slate-300'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{a.text}</p>
                      <p className="text-xs text-slate-400">{formatDate(a.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-4">
                  {[
                    { date: opportunity.created_at, title: 'Opportunité créée', icon: '🎯', color: 'bg-blue-500' },
                    ...oppQuotes.map(q => ({
                      date: q.created_at,
                      title: `Devis ${q.quote_number} créé`,
                      icon: '📄',
                      color: 'bg-violet-500',
                    })),
                    ...oppQuotes.filter(q => q.status === 'envoye' || q.status === 'signe').map(q => ({
                      date: q.updated_at,
                      title: q.status === 'signe' ? `Devis signé ✓` : `Devis envoyé`,
                      icon: q.status === 'signe' ? '✅' : '📨',
                      color: q.status === 'signe' ? 'bg-green-500' : 'bg-orange-500',
                    })),
                    opportunity.converted_to_client ? {
                      date: opportunity.converted_at || opportunity.updated_at,
                      title: 'Client créé automatiquement',
                      icon: '🏆',
                      color: 'bg-green-600',
                    } : null,
                  ].filter(Boolean).sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime()).map((event, i) => (
                    <div key={i} className="pl-8 relative">
                      <div className={`absolute left-1.5 w-3 h-3 rounded-full border-2 border-white ${event!.color} top-0.5`} />
                      <p className="text-sm font-medium text-slate-800">{event!.title}</p>
                      <p className="text-xs text-slate-400">{formatDate(event!.date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function InfoCard({ icon, label, value, highlight, truncate }: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  truncate?: boolean
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-green-50' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={highlight ? 'text-green-500' : 'text-slate-400'}>{icon}</span>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={`text-sm font-medium ${highlight ? 'text-green-700' : 'text-slate-900'} ${truncate ? 'truncate' : ''}`}>
        {value}
      </p>
    </div>
  )
}
