'use client'

import { useState, useMemo } from 'react'
import { Agent, SkillLevel, CertificationCategory, AvailabilityBlockKind } from '@/types'
import { useAppStore } from '@/lib/store'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computeFatigueScore, computeWeeklySummary } from '@/lib/workload'
import { cn, initials } from '@/lib/utils'
import {
  CLEANING_EXPERTISES, EXPERTISE_LABELS, SKILL_LEVEL_LABELS, SKILL_LEVEL_COLORS,
  CERTIFICATION_CATEGORY_LABELS, FATIGUE_LABEL_COLORS, FATIGUE_LABEL_TEXT, DAYS_KEYS, DAYS_FR,
  CONTRACT_TYPE_LABELS,
} from '@/lib/constants'
import {
  X, User, Sparkles, Award, Calendar as CalendarIcon, TrendingUp,
  Phone, Mail, MapPin, Plus, Trash2,
} from 'lucide-react'
import { addDays, startOfWeek, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

interface Props {
  agent: Agent | null
  open: boolean
  onClose: () => void
}

export function AgentProfilePanel({ agent, open, onClose }: Props) {
  const {
    missions, agentSkills, agentCertifications, availabilityBlocks,
    setAgentSkills, setAgentCertifications, addAvailabilityBlock, removeAvailabilityBlock,
  } = useAppStore()

  const summary = useMemo(() => {
    if (!agent) return null
    return computeWeeklySummary(agent, missions, startOfWeek(new Date(), { weekStartsOn: 1 }))
  }, [agent, missions])

  const fatigue = useMemo(() => {
    if (!agent) return null
    return computeFatigueScore(agent, missions)
  }, [agent, missions])

  const skills = useMemo(
    () => agent ? agentSkills.filter(s => s.agent_id === agent.id) : [],
    [agent, agentSkills],
  )
  const certs = useMemo(
    () => agent ? agentCertifications.filter(c => c.agent_id === agent.id) : [],
    [agent, agentCertifications],
  )
  const blocks = useMemo(
    () => agent ? availabilityBlocks.filter(b => b.agent_id === agent.id) : [],
    [agent, availabilityBlocks],
  )

  const [newSkill, setNewSkill] = useState({ skill: '', level: 'intermediaire' as SkillLevel })
  const [newCert, setNewCert] = useState({ name: '', category: 'machine' as CertificationCategory, expires_at: '' })
  const [newBlock, setNewBlock] = useState({ start: '', end: '', kind: 'vacances' as AvailabilityBlockKind, notes: '' })

  if (!open || !agent) return null

  const handleAddSkill = () => {
    if (!newSkill.skill) return
    const fresh = [...skills.map(s => ({ skill: s.skill, level: s.level })), newSkill]
    setAgentSkills(agent.id, fresh)
    setNewSkill({ skill: '', level: 'intermediaire' })
    toast.success('Expertise ajoutée')
  }

  const handleRemoveSkill = (skillName: string) => {
    setAgentSkills(agent.id, skills.filter(s => s.skill !== skillName).map(s => ({ skill: s.skill, level: s.level })))
  }

  const handleAddCert = () => {
    if (!newCert.name) return
    const fresh = [...certs.map(c => ({ name: c.name, category: c.category, issued_at: c.issued_at, expires_at: c.expires_at })), {
      name: newCert.name, category: newCert.category, issued_at: new Date().toISOString().slice(0, 10), expires_at: newCert.expires_at || null,
    }]
    setAgentCertifications(agent.id, fresh)
    setNewCert({ name: '', category: 'machine', expires_at: '' })
    toast.success('Certification ajoutée')
  }

  const handleRemoveCert = (id: string) => {
    setAgentCertifications(agent.id, certs.filter(c => c.id !== id).map(c => ({
      name: c.name, category: c.category, issued_at: c.issued_at, expires_at: c.expires_at,
    })))
  }

  const handleAddBlock = () => {
    if (!newBlock.start || !newBlock.end) {
      toast.error('Dates de début et fin requises')
      return
    }
    addAvailabilityBlock({
      agent_id: agent.id,
      start_at: new Date(newBlock.start).toISOString(),
      end_at: new Date(newBlock.end).toISOString(),
      kind: newBlock.kind,
      notes: newBlock.notes || null,
    })
    setNewBlock({ start: '', end: '', kind: 'vacances', notes: '' })
    toast.success('Indispo enregistrée')
  }

  const missionsLast30 = missions.filter(m => {
    if (!m.agents?.some(a => a.id === agent.id)) return false
    const d = new Date(m.scheduled_date)
    const limit = new Date()
    limit.setDate(limit.getDate() - 30)
    return d >= limit
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-full max-w-3xl bg-white z-50 shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-4 flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-bold text-lg flex items-center justify-center">
            {initials(agent.first_name, agent.last_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900">{agent.first_name} {agent.last_name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">{CONTRACT_TYPE_LABELS[agent.contract_type]}</span>
              {fatigue && (
                <Badge className={cn('text-[10px]', FATIGUE_LABEL_COLORS[fatigue.label])}>
                  Forme : {FATIGUE_LABEL_TEXT[fatigue.label]} ({fatigue.score}/100)
                </Badge>
              )}
              {summary && (
                <span className={cn('text-xs', summary.loadRatio > 0.9 ? 'text-rose-600' : 'text-slate-600')}>
                  {summary.weeklyHours}h / {summary.capacityHours}h cette semaine
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="identity" className="h-full flex flex-col">
            <div className="px-6 pt-4 border-b border-slate-200 flex-shrink-0">
              <TabsList>
                <TabsTrigger value="identity">Identité</TabsTrigger>
                <TabsTrigger value="expertise">Expertises</TabsTrigger>
                <TabsTrigger value="certs">Certifications</TabsTrigger>
                <TabsTrigger value="availability">Disponibilité</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Identity */}
              <TabsContent value="identity" className="mt-0 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-indigo-600" /> Coordonnées
                </h3>
                <Row icon={Phone} label="Téléphone" value={agent.phone ?? '—'} />
                <Row icon={Mail} label="Email" value={agent.email ?? '—'} />
                <Row icon={MapPin} label="Zone" value={agent.zone ?? '—'} />
                <Row icon={Award} label="Spécialité" value={agent.specialty ?? '—'} />
                <Row icon={TrendingUp} label="Coût horaire" value={agent.hourly_cost ? `${agent.hourly_cost} €/h` : '—'} />
                <Row icon={CalendarIcon} label="Capacité" value={`${agent.weekly_availability_hours}h / semaine`} />
                {agent.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{agent.notes}</p>
                  </div>
                )}
              </TabsContent>

              {/* Expertise */}
              <TabsContent value="expertise" className="mt-0">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-violet-600" /> Expertises & niveaux
                </h3>
                <div className="space-y-2 mb-4">
                  {skills.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Aucune expertise renseignée</p>
                  ) : skills.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{EXPERTISE_LABELS[s.skill] ?? s.skill}</span>
                        <Badge className={cn('text-[10px]', SKILL_LEVEL_COLORS[s.level])}>
                          {SKILL_LEVEL_LABELS[s.level]}
                        </Badge>
                      </div>
                      <button onClick={() => handleRemoveSkill(s.skill)} className="p-1 rounded hover:bg-rose-50 text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-700 mb-2">Ajouter une expertise</p>
                  <div className="flex gap-2">
                    <Select value={newSkill.skill} onValueChange={v => setNewSkill(s => ({ ...s, skill: v }))}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                      <SelectContent>
                        {CLEANING_EXPERTISES.filter(e => !skills.some(s => s.skill === e)).map(e => (
                          <SelectItem key={e} value={e}>{EXPERTISE_LABELS[e]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newSkill.level} onValueChange={v => setNewSkill(s => ({ ...s, level: v as SkillLevel }))}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SKILL_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddSkill} size="sm" className="bg-violet-600 hover:bg-violet-700">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Certifications */}
              <TabsContent value="certs" className="mt-0">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-amber-600" /> Certifications
                </h3>
                <div className="space-y-2 mb-4">
                  {certs.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Aucune certification</p>
                  ) : certs.map(c => {
                    const isExpired = c.expires_at && new Date(c.expires_at) < new Date()
                    return (
                      <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{CERTIFICATION_CATEGORY_LABELS[c.category]}</Badge>
                            {c.expires_at && (
                              <span className={cn('text-[10px]', isExpired ? 'text-rose-600 font-medium' : 'text-slate-500')}>
                                {isExpired ? 'Expirée le ' : 'Expire le '}
                                {format(new Date(c.expires_at), 'd MMM yyyy', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleRemoveCert(c.id)} className="p-1 rounded hover:bg-rose-50 text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-700 mb-2">Ajouter une certification</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input placeholder="Nom (ex : CACES R489)" value={newCert.name} onChange={e => setNewCert(c => ({ ...c, name: e.target.value }))} />
                    <Select value={newCert.category} onValueChange={v => setNewCert(c => ({ ...c, category: v as CertificationCategory }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CERTIFICATION_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={newCert.expires_at} onChange={e => setNewCert(c => ({ ...c, expires_at: e.target.value }))} />
                    <Button onClick={handleAddCert} size="sm" className="bg-amber-600 hover:bg-amber-700">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Availability */}
              <TabsContent value="availability" className="mt-0 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" /> Disponibilité hebdomadaire
                  </h3>
                  <div className="flex gap-2">
                    {DAYS_KEYS.map((day, idx) => {
                      const isAvail = agent.weekly_availability?.[day]
                      return (
                        <div key={day} className={cn(
                          'flex-1 py-3 rounded-lg text-center text-xs font-medium',
                          isAvail ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400',
                        )}>
                          {DAYS_FR[idx]}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Heatmap (4 semaines)</h3>
                  <AvailabilityHeatmap agent={agent} blocks={blocks} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Indisponibilités enregistrées</h3>
                  <div className="space-y-1.5 mb-3">
                    {blocks.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Aucune indispo</p>
                    ) : blocks.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{b.kind}</Badge>
                          <span className="text-sm">
                            {format(parseISO(b.start_at), 'd MMM', { locale: fr })} → {format(parseISO(b.end_at), 'd MMM yyyy', { locale: fr })}
                          </span>
                          {b.notes && <span className="text-xs text-slate-500 italic">· {b.notes}</span>}
                        </div>
                        <button onClick={() => removeAvailabilityBlock(b.id)} className="p-1 rounded hover:bg-rose-50 text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-slate-200 p-3">
                    <p className="text-xs font-medium text-slate-700 mb-2">Ajouter une indisponibilité</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <Label className="text-[10px]">Du</Label>
                        <Input type="date" value={newBlock.start} onChange={e => setNewBlock(b => ({ ...b, start: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Au</Label>
                        <Input type="date" value={newBlock.end} onChange={e => setNewBlock(b => ({ ...b, end: e.target.value }))} />
                      </div>
                      <Select value={newBlock.kind} onValueChange={v => setNewBlock(b => ({ ...b, kind: v as AvailabilityBlockKind }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacances">Vacances</SelectItem>
                          <SelectItem value="indispo">Indispo</SelectItem>
                          <SelectItem value="preferer">Préférence</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Notes (optionnel)" value={newBlock.notes} onChange={e => setNewBlock(b => ({ ...b, notes: e.target.value }))} />
                    </div>
                    <Button onClick={handleAddBlock} size="sm" className="w-full">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Performance */}
              <TabsContent value="performance" className="mt-0 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Performance & charge
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Missions / 30j" value={missionsLast30.length} />
                  <StatCard label="Heures cette semaine" value={summary?.weeklyHours ?? 0} suffix="h" />
                  <StatCard label="Jours consécutifs" value={summary?.consecutiveDays ?? 0} />
                  <StatCard label="Shifts nuit" value={summary?.nightShifts ?? 0} />
                </div>

                {fatigue && (
                  <div className="rounded-xl border border-slate-200 p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Score de fatigue</p>
                      <Badge className={cn('text-[10px]', FATIGUE_LABEL_COLORS[fatigue.label])}>
                        {FATIGUE_LABEL_TEXT[fatigue.label]}
                      </Badge>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          fatigue.score >= 85 ? 'bg-rose-500' :
                          fatigue.score >= 70 ? 'bg-orange-500' :
                          fatigue.score >= 50 ? 'bg-amber-500' : 'bg-emerald-500',
                        )}
                        style={{ width: `${fatigue.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>0</span><span>50</span><span>100</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Calculé sur la charge actuelle ({Math.round((summary?.loadRatio ?? 0) * 100)}%),
                      les jours consécutifs ({summary?.consecutiveDays ?? 0}),
                      les shifts nuit ({summary?.nightShifts ?? 0}) et la semaine précédente.
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  )
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-slate-500 w-32">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  )
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-2xl font-bold text-slate-900">{value}{suffix ?? ''}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function AvailabilityHeatmap({ agent, blocks }: { agent: Agent; blocks: { start_at: string; end_at: string; kind: string }[] }) {
  const today = new Date()
  const weeks = Array.from({ length: 4 }, (_, w) => {
    const weekStart = startOfWeek(addDays(today, w * 7), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, d) => addDays(weekStart, d))
  })

  const cellColor = (date: Date): string => {
    const dayKey = DAYS_KEYS[(date.getDay() + 6) % 7]!
    const baseAvail = agent.weekly_availability?.[dayKey]
    const isBlocked = blocks.some(b => {
      if (b.kind === 'preferer') return false
      const s = parseISO(b.start_at).getTime()
      const e = parseISO(b.end_at).getTime()
      const d = date.getTime()
      return d >= s && d <= e
    })
    if (isBlocked) return 'bg-rose-300'
    if (!baseAvail) return 'bg-slate-100'
    return 'bg-emerald-300'
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {DAYS_FR.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-400">{d[0]}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-1">
          {week.map(date => (
            <div
              key={date.toISOString()}
              title={format(date, 'd MMM yyyy', { locale: fr })}
              className={cn('flex-1 h-7 rounded text-[9px] text-slate-700 flex items-center justify-center', cellColor(date))}
            >
              {date.getDate()}
            </div>
          ))}
        </div>
      ))}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-300" /> Dispo</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-100" /> Non travaillé</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-rose-300" /> Bloqué</div>
      </div>
    </div>
  )
}
