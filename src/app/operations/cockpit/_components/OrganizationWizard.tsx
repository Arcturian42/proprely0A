'use client'

import { useState, useMemo } from 'react'
import { Mission, ClientConstraint, SchedulingProposal } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { proposeSlots } from '@/lib/scheduling'
import { CLEANING_EXPERTISES, EXPERTISE_LABELS, DAYS_KEYS, DAYS_FR } from '@/lib/constants'
import { cn, initials } from '@/lib/utils'
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Wand2, Clock, Users, Building2, AlertTriangle, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

const STEPS = [
  { key: 'services', label: 'Services' },
  { key: 'constraints', label: 'Contraintes' },
  { key: 'requirements', label: 'Besoins agents' },
  { key: 'proposals', label: 'Propositions' },
]

interface Props {
  mission: Mission
  onClose: () => void
}

export function OrganizationWizard({ mission, onClose }: Props) {
  const {
    agents, clientConstraints, updateMission, upsertClientConstraint,
    setSchedulingProposals, selectSchedulingProposal, schedulingProposals,
    updateMissionOperationalStatus, assignAgentsToMission,
  } = useAppStore()

  const [step, setStep] = useState(mission.organization_step ?? 0)

  // Step 1 — services
  const [services, setServices] = useState({
    service_type: mission.service_type ?? '',
    planned_hours: String(mission.planned_hours ?? 3),
    estimated_workers: String(mission.estimated_workers ?? 1),
    estimated_profitability: String(mission.estimated_profitability ?? 0),
    urgency: mission.urgency ?? 'normale',
    recurrence: mission.recurrence ?? 'ponctuelle',
    surface_area: String(mission.site?.surface_area ?? ''),
  })

  // Step 2 — constraints
  const existingConstraint = clientConstraints.find(c => c.site_id === mission.site_id)
  const [constraints, setConstraints] = useState({
    preferred_days: existingConstraint?.preferred_days ?? [] as string[],
    preferred_hours_start: existingConstraint?.preferred_hours_start ?? '',
    preferred_hours_end: existingConstraint?.preferred_hours_end ?? '',
    access_hours_start: existingConstraint?.access_hours_start ?? '',
    access_hours_end: existingConstraint?.access_hours_end ?? '',
    keys_alarm: existingConstraint?.keys_alarm ?? '',
    parking: existingConstraint?.parking ?? '',
    elevator: existingConstraint?.elevator ?? false,
    noise_restrictions: existingConstraint?.noise_restrictions ?? '',
    floor_count: String(mission.floor_count ?? ''),
    parking_notes: mission.parking_notes ?? '',
  })

  // Step 3 — agent requirements
  const [requirements, setRequirements] = useState({
    required_skills: mission.required_skills ?? [] as string[],
    required_machines: (mission.required_machines ?? []).join(', '),
    consumables: (mission.consumables ?? []).join(', '),
    equipment: (mission.equipment ?? []).join(', '),
    min_experience: 'intermediaire',
    language: 'fr',
  })

  // Step 4 — proposals
  const existingProposals = schedulingProposals.filter(p => p.mission_id === mission.id)
  const [proposals, setProposals] = useState<SchedulingProposal[]>(existingProposals)
  const [generating, setGenerating] = useState(false)
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    existingProposals.find(p => p.selected)?.id ?? null,
  )

  const progress = ((step + 1) / STEPS.length) * 100

  const persistStep1 = () => {
    updateMission(mission.id, {
      service_type: services.service_type || null,
      planned_hours: parseFloat(services.planned_hours) || 3,
      estimated_workers: parseInt(services.estimated_workers) || 1,
      estimated_profitability: parseFloat(services.estimated_profitability) || 0,
      urgency: services.urgency,
      recurrence: services.recurrence,
      operational_status: 'en_preparation',
      organization_step: Math.max(1, mission.organization_step ?? 0),
      updated_at: new Date().toISOString(),
    })
  }

  const persistStep2 = () => {
    const constraintData: Omit<ClientConstraint, 'id' | 'site_id'> = {
      preferred_days: constraints.preferred_days,
      preferred_hours_start: constraints.preferred_hours_start || null,
      preferred_hours_end: constraints.preferred_hours_end || null,
      access_hours_start: constraints.access_hours_start || null,
      access_hours_end: constraints.access_hours_end || null,
      keys_alarm: constraints.keys_alarm || null,
      parking: constraints.parking || null,
      elevator: constraints.elevator,
      noise_restrictions: constraints.noise_restrictions || null,
      equipment_access: null,
      urgency: null,
      recurrence: null,
    }
    upsertClientConstraint(mission.site_id, constraintData)
    updateMission(mission.id, {
      floor_count: constraints.floor_count ? parseInt(constraints.floor_count) : null,
      parking_notes: constraints.parking_notes || null,
      organization_step: Math.max(2, mission.organization_step ?? 0),
      updated_at: new Date().toISOString(),
    })
  }

  const persistStep3 = () => {
    updateMission(mission.id, {
      required_skills: requirements.required_skills,
      required_machines: requirements.required_machines.split(',').map(s => s.trim()).filter(Boolean),
      consumables: requirements.consumables.split(',').map(s => s.trim()).filter(Boolean),
      equipment: requirements.equipment.split(',').map(s => s.trim()).filter(Boolean),
      organization_step: Math.max(3, mission.organization_step ?? 0),
      updated_at: new Date().toISOString(),
    })
  }

  const generateProposals = () => {
    setGenerating(true)
    // Latence simulée pour effet "moteur IA"
    setTimeout(() => {
      const ctx = useAppStore.getState()
      const latestMission = ctx.missions.find(m => m.id === mission.id)!
      const constraint = ctx.clientConstraints.find(c => c.site_id === latestMission.site_id) ?? null
      const result = proposeSlots({
        mission: latestMission,
        agents: ctx.agents,
        missions: ctx.missions.filter(m => m.id !== mission.id),
        agentSkills: ctx.agentSkills,
        availabilityBlocks: ctx.availabilityBlocks,
        fatigueScores: ctx.fatigueScores,
        clientConstraint: constraint,
      })
      setProposals(result)
      setSchedulingProposals(mission.id, result)
      setGenerating(false)
      if (result.length === 0) {
        toast.error('Aucun créneau trouvé. Élargis les contraintes ou vérifie la dispo des agents.')
      } else {
        toast.success(`${result.length} créneau${result.length > 1 ? 'x' : ''} générés`)
      }
    }, 700)
  }

  const handleNext = () => {
    if (step === 0) persistStep1()
    if (step === 1) persistStep2()
    if (step === 2) {
      persistStep3()
      // Au passage en step 4, on génère automatiquement
      setTimeout(() => generateProposals(), 100)
    }
    setStep(s => Math.min(STEPS.length - 1, s + 1))
  }

  const handleConfirmProposal = () => {
    const selected = proposals.find(p => p.id === selectedProposalId)
    if (!selected) {
      toast.error('Sélectionne un créneau d\'abord')
      return
    }
    const startDate = parseISO(selected.proposed_start)
    selectSchedulingProposal(mission.id, selected.id)
    assignAgentsToMission(mission.id, selected.recommended_agent_ids)
    updateMission(mission.id, {
      scheduled_date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      organization_step: 4,
      updated_at: new Date().toISOString(),
    })
    updateMissionOperationalStatus(mission.id, 'en_attente_validation_client')
    toast.success('Créneau proposé au client — mission en attente de validation')
    onClose()
  }

  const toggleDay = (day: string) => {
    setConstraints(c => ({
      ...c,
      preferred_days: c.preferred_days.includes(day)
        ? c.preferred_days.filter(d => d !== day)
        : [...c.preferred_days, day],
    }))
  }

  const toggleSkill = (skill: string) => {
    setRequirements(r => ({
      ...r,
      required_skills: r.required_skills.includes(skill)
        ? r.required_skills.filter(s => s !== skill)
        : [...r.required_skills, skill],
    }))
  }

  const agentById = useMemo(() => new Map(agents.map(a => [a.id, a])), [agents])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-600" />
            Organiser la mission
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {mission.client?.name} — {mission.site?.name}
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Fermer">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Stepper */}
      <div className="px-6 pt-4 pb-2 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, idx) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                idx === step ? 'bg-indigo-600 text-white' : idx < step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
              )}>
                {idx < step ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              <div className={cn(
                'ml-2 text-xs font-medium',
                idx === step ? 'text-slate-900' : idx < step ? 'text-emerald-700' : 'text-slate-400',
              )}>
                {s.label}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn('flex-1 mx-3 h-px', idx < step ? 'bg-emerald-300' : 'bg-slate-200')} />
              )}
            </div>
          ))}
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
        {step === 0 && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Décomposition des services
              </h3>
              <p className="text-xs text-slate-500 mb-4">Services inclus dans le contrat signé. Ajuste les estimations.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Type de service</Label>
                <Input value={services.service_type} onChange={e => setServices(s => ({ ...s, service_type: e.target.value }))} placeholder="Ex : Nettoyage bureaux" />
              </div>
              <div>
                <Label className="text-xs">Surface (m²)</Label>
                <Input type="number" value={services.surface_area} onChange={e => setServices(s => ({ ...s, surface_area: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Heures estimées</Label>
                <Input type="number" step="0.5" value={services.planned_hours} onChange={e => setServices(s => ({ ...s, planned_hours: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Agents requis</Label>
                <Input type="number" min="1" max="10" value={services.estimated_workers} onChange={e => setServices(s => ({ ...s, estimated_workers: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Rentabilité estimée (€)</Label>
                <Input type="number" value={services.estimated_profitability} onChange={e => setServices(s => ({ ...s, estimated_profitability: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Urgence</Label>
                <Select value={services.urgency} onValueChange={v => setServices(s => ({ ...s, urgency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Récurrence</Label>
                <Select value={services.recurrence} onValueChange={v => setServices(s => ({ ...s, recurrence: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ponctuelle">Ponctuelle</SelectItem>
                    <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="bi_mensuelle">Bi-mensuelle</SelectItem>
                    <SelectItem value="mensuelle">Mensuelle</SelectItem>
                    <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Contraintes opérationnelles</h3>
              <p className="text-xs text-slate-500 mb-4">Précise les contraintes du site pour optimiser le scheduling.</p>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Jours préférés</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_KEYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      constraints.preferred_days.includes(day)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
                    )}
                  >
                    {DAYS_FR[idx]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Heures préférées (début)</Label>
                <Input type="time" value={constraints.preferred_hours_start} onChange={e => setConstraints(c => ({ ...c, preferred_hours_start: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Heures préférées (fin)</Label>
                <Input type="time" value={constraints.preferred_hours_end} onChange={e => setConstraints(c => ({ ...c, preferred_hours_end: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Accès site (début)</Label>
                <Input type="time" value={constraints.access_hours_start} onChange={e => setConstraints(c => ({ ...c, access_hours_start: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Accès site (fin)</Label>
                <Input type="time" value={constraints.access_hours_end} onChange={e => setConstraints(c => ({ ...c, access_hours_end: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Étages</Label>
                <Input type="number" min="0" value={constraints.floor_count} onChange={e => setConstraints(c => ({ ...c, floor_count: e.target.value }))} />
              </div>
              <div className="flex items-end gap-2">
                <Checkbox id="elev" checked={constraints.elevator} onCheckedChange={v => setConstraints(c => ({ ...c, elevator: !!v }))} />
                <Label htmlFor="elev" className="text-xs cursor-pointer">Ascenseur disponible</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Clés / alarme</Label>
                <Input value={constraints.keys_alarm} onChange={e => setConstraints(c => ({ ...c, keys_alarm: e.target.value }))} placeholder="Ex : Coffre code 1234, alarme à désactiver à l'entrée" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Parking</Label>
                <Input value={constraints.parking} onChange={e => setConstraints(c => ({ ...c, parking: e.target.value }))} placeholder="Ex : Parking gratuit derrière le bâtiment" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Restrictions de bruit</Label>
                <Textarea rows={2} value={constraints.noise_restrictions} onChange={e => setConstraints(c => ({ ...c, noise_restrictions: e.target.value }))} placeholder="Ex : Aspirateur interdit avant 9h" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Besoins agents
              </h3>
              <p className="text-xs text-slate-500 mb-4">Définis l&apos;expertise et le matériel requis.</p>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Expertises requises</Label>
              <div className="flex gap-2 flex-wrap">
                {CLEANING_EXPERTISES.map(exp => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => toggleSkill(exp)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      requirements.required_skills.includes(exp)
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300',
                    )}
                  >
                    {EXPERTISE_LABELS[exp]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Expérience minimum</Label>
                <Select value={requirements.min_experience} onValueChange={v => setRequirements(r => ({ ...r, min_experience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debutant">Débutant accepté</SelectItem>
                    <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                    <SelectItem value="expert">Expert uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Langue</Label>
                <Select value={requirements.language} onValueChange={v => setRequirements(r => ({ ...r, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">Anglais</SelectItem>
                    <SelectItem value="fr_en">FR + EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Machines requises (séparées par virgule)</Label>
                <Input value={requirements.required_machines} onChange={e => setRequirements(r => ({ ...r, required_machines: e.target.value }))} placeholder="Ex : Autolaveuse, monobrosse" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Consommables</Label>
                <Input value={requirements.consumables} onChange={e => setRequirements(r => ({ ...r, consumables: e.target.value }))} placeholder="Ex : Détergent neutre, sacs poubelle 100L" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Équipement</Label>
                <Input value={requirements.equipment} onChange={e => setRequirements(r => ({ ...r, equipment: e.target.value }))} placeholder="Ex : Chariot ménage, EPI" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  Propositions de créneaux
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Le moteur a analysé dispo, expertise, charge et fatigue de l&apos;équipe.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={generateProposals} disabled={generating} className="gap-2">
                <Wand2 className="w-3.5 h-3.5" />
                {generating ? 'Calcul…' : 'Regénérer'}
              </Button>
            </div>

            {generating && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-slate-600">Analyse des disponibilités, expertises, charge et fatigue…</p>
              </div>
            )}

            {!generating && proposals.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm text-slate-700 font-medium">Aucun créneau trouvé</p>
                <p className="text-xs text-slate-500 mt-1">Élargis les contraintes (jours, horaires, expertises) puis regénère.</p>
              </div>
            )}

            {!generating && proposals.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {proposals.map((p, idx) => {
                  const start = parseISO(p.proposed_start)
                  const recommended = p.recommended_agent_ids.map(id => agentById.get(id)).filter(Boolean) as Array<{ id: string; first_name: string; last_name: string }>
                  const isSelected = selectedProposalId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProposalId(p.id)}
                      className={cn(
                        'text-left rounded-xl border-2 p-4 bg-white transition-all',
                        isSelected ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm',
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm text-slate-900">
                            {format(start, 'EEEE d MMMM', { locale: fr })}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(start, 'HH:mm')} — {format(parseISO(p.proposed_end), 'HH:mm')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">Score</span>
                          <span className={cn(
                            'text-lg font-bold',
                            p.score >= 80 ? 'text-emerald-600' : p.score >= 60 ? 'text-amber-600' : 'text-slate-600',
                          )}>
                            {p.score}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="text-[10px]">Skills {p.rationale.skills_match}%</Badge>
                        <Badge variant="outline" className="text-[10px]">Charge {p.rationale.workload}%</Badge>
                        <Badge variant="outline" className="text-[10px]">Forme {p.rationale.fatigue}%</Badge>
                        <Badge variant="outline" className="text-[10px]">Pref {p.rationale.preferences}%</Badge>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] uppercase text-slate-400 mb-1.5">Agents recommandés</p>
                        <div className="flex items-center gap-1.5">
                          {recommended.slice(0, 3).map(a => (
                            <div key={a.id} className="flex items-center gap-1 bg-slate-50 rounded-full pr-2">
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                                {initials(a.first_name, a.last_name)}
                              </div>
                              <span className="text-[10px] text-slate-600">{a.first_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {idx === 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600">
                          <Sparkles className="w-3 h-3" /> Meilleure proposition
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            Suivant <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleConfirmProposal}
            disabled={!selectedProposalId || generating}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            Proposer au client
          </Button>
        )}
      </div>
    </div>
  )
}
