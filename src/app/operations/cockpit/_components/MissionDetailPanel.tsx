'use client'

import { useState, useMemo } from 'react'
import { Mission, OperationalMissionStatus } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { OrganizationWizard } from './OrganizationWizard'
import { AgentRecommendationList } from './AgentRecommendationList'
import {
  OPERATIONAL_MISSION_STATUS_COLORS, OPERATIONAL_MISSION_STATUS_LABELS,
  OPERATIONAL_MISSION_STATUS_ORDER, EXPERTISE_LABELS,
} from '@/lib/constants'
import { cn, getOperationalStatus, formatHours } from '@/lib/utils'
import {
  X, Building2, MapPin, Phone, User, Clock, Users, Calendar, Sparkles,
  CheckCircle2, AlertTriangle, Wrench, Package, FileText, History, PlayCircle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

interface Props {
  mission: Mission | null
  open: boolean
  onClose: () => void
}

export function MissionDetailPanel({ mission, open, onClose }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const { updateMissionOperationalStatus, schedulingProposals, clientConstraints } = useAppStore()

  const operationalStatus = mission ? getOperationalStatus(mission) : 'a_organiser'
  const colors = OPERATIONAL_MISSION_STATUS_COLORS[operationalStatus]!

  const proposals = useMemo(
    () => mission ? schedulingProposals.filter(p => p.mission_id === mission.id) : [],
    [mission, schedulingProposals],
  )
  const constraint = useMemo(
    () => mission ? clientConstraints.find(c => c.site_id === mission.site_id) : null,
    [mission, clientConstraints],
  )

  if (!open || !mission) return null

  const handleStatusChange = (newStatus: OperationalMissionStatus) => {
    updateMissionOperationalStatus(mission.id, newStatus)
    toast.success(`Statut → ${OPERATIONAL_MISSION_STATUS_LABELS[newStatus]}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-screen bg-white z-50 shadow-2xl border-l border-slate-200',
          'w-full max-w-4xl flex flex-col',
          'animate-in slide-in-from-right duration-300',
        )}
      >
        {wizardOpen ? (
          <OrganizationWizard mission={mission} onClose={() => setWizardOpen(false)} />
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', colors.badge)}>
                    {OPERATIONAL_MISSION_STATUS_LABELS[operationalStatus]}
                  </span>
                  {mission.urgency === 'urgente' && (
                    <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 truncate">{mission.client?.name}</h2>
                <p className="text-sm text-slate-500 truncate">{mission.site?.name} · {mission.site?.address}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 ml-3 flex-shrink-0" aria-label="Fermer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Action bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
              {operationalStatus === 'a_organiser' && (
                <Button onClick={() => setWizardOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Sparkles className="w-4 h-4" />
                  Lancer l&apos;organisation
                </Button>
              )}
              {operationalStatus === 'en_preparation' && (
                <Button onClick={() => setWizardOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Sparkles className="w-4 h-4" />
                  Reprendre l&apos;organisation
                </Button>
              )}
              {operationalStatus === 'en_attente_validation_client' && (
                <Button onClick={() => handleStatusChange('planifie')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Marquer validé par le client
                </Button>
              )}
              {operationalStatus === 'planifie' && (
                <Button onClick={() => handleStatusChange('en_cours')} className="gap-2 bg-violet-600 hover:bg-violet-700">
                  <PlayCircle className="w-4 h-4" />
                  Démarrer la mission
                </Button>
              )}
              {operationalStatus === 'en_cours' && (
                <Button onClick={() => handleStatusChange('terminee')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Terminer
                </Button>
              )}
              {operationalStatus !== 'incident' && operationalStatus !== 'terminee' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('incident')}
                  className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Signaler incident
                </Button>
              )}
            </div>

            {/* Tabs body */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <div className="px-6 pt-4 border-b border-slate-200 bg-white flex-shrink-0">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="overview">Aperçu</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="planning">Planning</TabsTrigger>
                    <TabsTrigger value="agents">Agents</TabsTrigger>
                    <TabsTrigger value="equipment">Équipement</TabsTrigger>
                    <TabsTrigger value="consumables">Consommables</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <TabsContent value="overview" className="mt-0 space-y-5">
                    <Section title="Client & site" icon={Building2}>
                      <Field label="Entreprise" value={mission.client?.name ?? '—'} />
                      <Field label="Site" value={mission.site?.name ?? '—'} />
                      <Field label="Adresse" value={mission.site?.address ?? '—'} icon={MapPin} />
                      <Field label="Contact" value={mission.contact_name ?? mission.client?.contact_name ?? '—'} icon={User} />
                      <Field label="Téléphone" value={mission.contact_phone ?? mission.client?.phone ?? '—'} icon={Phone} />
                    </Section>
                    <Separator />
                    <Section title="Mission" icon={Clock}>
                      <Field label="Type de service" value={mission.service_type ?? '—'} />
                      <Field label="Heures estimées" value={formatHours(mission.planned_hours)} />
                      <Field label="Agents requis" value={String(mission.estimated_workers ?? 1)} icon={Users} />
                      <Field label="Rentabilité estimée" value={mission.estimated_profitability != null ? `${Math.round(mission.estimated_profitability)} €` : '—'} />
                      <Field label="Urgence" value={mission.urgency ?? mission.priority} />
                      <Field label="Récurrence" value={mission.recurrence ?? '—'} />
                    </Section>
                  </TabsContent>

                  <TabsContent value="services" className="mt-0 space-y-3">
                    <h3 className="text-sm font-semibold">Services du contrat</h3>
                    <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                      <p className="font-medium text-sm">{mission.service_type ?? 'Service principal'}</p>
                      <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                        <div><span className="text-slate-500">Surface : </span>{mission.site?.surface_area ?? '—'} m²</div>
                        <div><span className="text-slate-500">Heures : </span>{formatHours(mission.planned_hours)}</div>
                        <div><span className="text-slate-500">Workers : </span>{mission.estimated_workers ?? 1}</div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="planning" className="mt-0 space-y-4">
                    {mission.scheduled_date && operationalStatus !== 'a_organiser' && operationalStatus !== 'en_preparation' && (
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Créneau confirmé</p>
                        <p className="text-base font-bold text-slate-900 mt-1">
                          {format(parseISO(mission.scheduled_date), 'EEEE d MMMM yyyy', { locale: fr })}
                          {mission.start_time && ` · ${mission.start_time.slice(0, 5)}`}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">Durée : {formatHours(mission.planned_hours)}</p>
                      </div>
                    )}
                    {proposals.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Propositions générées</h3>
                        <div className="space-y-2">
                          {proposals.map(p => (
                            <div key={p.id} className={cn(
                              'rounded-lg border p-3 flex items-center justify-between',
                              p.selected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white',
                            )}>
                              <div>
                                <p className="text-sm font-medium">
                                  {format(parseISO(p.proposed_start), 'EEE d MMM HH:mm', { locale: fr })}
                                </p>
                                <p className="text-[11px] text-slate-500">Score : {p.score}/100</p>
                              </div>
                              {p.selected && <Badge className="bg-emerald-600">Sélectionnée</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {constraint && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 mt-4">Contraintes du site</h3>
                        <div className="text-xs text-slate-600 space-y-1">
                          {constraint.preferred_days?.length > 0 && <p>Jours préférés : {constraint.preferred_days.join(', ')}</p>}
                          {constraint.preferred_hours_start && <p>Heures préférées : {constraint.preferred_hours_start} – {constraint.preferred_hours_end}</p>}
                          {constraint.access_hours_start && <p>Accès : {constraint.access_hours_start} – {constraint.access_hours_end}</p>}
                          {constraint.keys_alarm && <p>Clés/alarme : {constraint.keys_alarm}</p>}
                          {constraint.parking && <p>Parking : {constraint.parking}</p>}
                          {constraint.noise_restrictions && <p>Bruit : {constraint.noise_restrictions}</p>}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="agents" className="mt-0">
                    <AgentRecommendationList mission={mission} />
                  </TabsContent>

                  <TabsContent value="equipment" className="mt-0 space-y-4">
                    <Section title="Machines requises" icon={Wrench}>
                      {(mission.required_machines?.length ?? 0) === 0 ? (
                        <p className="text-xs text-slate-400 italic">Aucune machine spécifiée</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {mission.required_machines!.map(m => (
                            <Badge key={m} variant="outline">{m}</Badge>
                          ))}
                        </div>
                      )}
                    </Section>
                    <Section title="Équipement" icon={Package}>
                      {(mission.equipment?.length ?? 0) === 0 ? (
                        <p className="text-xs text-slate-400 italic">Aucun équipement spécifié</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {mission.equipment!.map(m => <Badge key={m} variant="outline">{m}</Badge>)}
                        </div>
                      )}
                    </Section>
                    <Section title="Expertises requises" icon={Sparkles}>
                      {(mission.required_skills?.length ?? 0) === 0 ? (
                        <p className="text-xs text-slate-400 italic">Aucune expertise spécifiée</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {mission.required_skills!.map(s => (
                            <Badge key={s} className="bg-violet-100 text-violet-700">{EXPERTISE_LABELS[s] ?? s}</Badge>
                          ))}
                        </div>
                      )}
                    </Section>
                  </TabsContent>

                  <TabsContent value="consumables" className="mt-0 space-y-4">
                    <Section title="Consommables" icon={Package}>
                      {(mission.consumables?.length ?? 0) === 0 ? (
                        <p className="text-xs text-slate-400 italic">Aucun consommable spécifié</p>
                      ) : (
                        <ul className="text-sm text-slate-700 space-y-1">
                          {mission.consumables!.map(c => <li key={c}>· {c}</li>)}
                        </ul>
                      )}
                    </Section>
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 space-y-4">
                    <Section title="Notes opérationnelles" icon={FileText}>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {mission.notes || <span className="italic text-slate-400">Aucune note</span>}
                      </p>
                    </Section>
                    {mission.parking_notes && (
                      <Section title="Parking" icon={MapPin}>
                        <p className="text-sm text-slate-700">{mission.parking_notes}</p>
                      </Section>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-0">
                    <Timeline mission={mission} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Footer — status pipeline visual */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Pipeline opérationnel</p>
              <div className="flex items-center gap-1">
                {OPERATIONAL_MISSION_STATUS_ORDER.filter(s => s !== 'incident').map((s, idx) => {
                  const isActive = s === operationalStatus
                  const isPast = OPERATIONAL_MISSION_STATUS_ORDER.indexOf(operationalStatus) > idx
                  const c = OPERATIONAL_MISSION_STATUS_COLORS[s]!
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-all',
                          isActive ? c.dot : isPast ? 'bg-emerald-400' : 'bg-slate-200',
                        )}
                        title={OPERATIONAL_MISSION_STATUS_LABELS[s]}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-600" />
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
      <span className="text-slate-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-slate-900 font-medium truncate">{value}</span>
    </div>
  )
}

function Timeline({ mission }: { mission: Mission }) {
  const events = [
    { date: mission.created_at, label: 'Mission créée', icon: Sparkles, color: 'text-slate-500' },
    ...(mission.organization_step && mission.organization_step >= 1 ? [{ date: mission.updated_at, label: 'Services définis', icon: Building2, color: 'text-blue-500' }] : []),
    ...(mission.organization_step && mission.organization_step >= 3 ? [{ date: mission.updated_at, label: 'Propositions générées', icon: Sparkles, color: 'text-violet-500' }] : []),
    ...(mission.start_time ? [{ date: mission.updated_at, label: `Créneau retenu : ${format(parseISO(mission.scheduled_date), 'd MMM', { locale: fr })} ${mission.start_time}`, icon: Calendar, color: 'text-indigo-500' }] : []),
  ]
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-indigo-600" /> Historique
      </h3>
      <div className="relative pl-6 space-y-4 border-l-2 border-slate-100">
        {events.map((e, idx) => (
          <div key={idx} className="relative">
            <div className={cn('absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-current', e.color)}>
              <e.icon className="w-2.5 h-2.5" />
            </div>
            <p className="text-sm font-medium text-slate-900">{e.label}</p>
            <p className="text-[11px] text-slate-400">{format(parseISO(e.date), 'd MMM yyyy · HH:mm', { locale: fr })}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
