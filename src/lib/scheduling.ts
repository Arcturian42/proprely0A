import {
  Agent, AgentSkill, AvailabilityBlock, ClientConstraint, FatigueScore,
  Mission, SchedulingProposal,
} from '@/types'
import { addDays, addHours, format, parseISO, startOfWeek } from 'date-fns'
import { computeFatigueScore, computeWeeklySummary, isAgentBlockedAt } from './workload'

const PROPOSAL_COUNT = 6
const HORIZON_DAYS = 21
const SLOT_START_HOUR = 7
const SLOT_END_HOUR = 19

export interface ProposeSlotsInput {
  mission: Mission
  agents: Agent[]
  missions: Mission[]
  agentSkills: AgentSkill[]
  availabilityBlocks: AvailabilityBlock[]
  fatigueScores: FatigueScore[]
  clientConstraint?: ClientConstraint | null
  from?: Date
}

interface SlotCandidate {
  startISO: string
  endISO: string
  dayOfWeek: string
  startHour: number
}

const DAY_KEYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function generateSlotCandidates(durationHours: number, from: Date): SlotCandidate[] {
  const out: SlotCandidate[] = []
  for (let d = 0; d < HORIZON_DAYS; d++) {
    const day = addDays(from, d)
    // Pas de candidats dans le passé
    if (day < new Date(new Date().setHours(0, 0, 0, 0))) continue
    for (let h = SLOT_START_HOUR; h + durationHours <= SLOT_END_HOUR; h += 1) {
      const start = new Date(day)
      start.setHours(h, 0, 0, 0)
      const end = addHours(start, durationHours)
      out.push({
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        dayOfWeek: DAY_KEYS[start.getDay()]!,
        startHour: h,
      })
    }
  }
  return out
}

function hasMissionConflict(
  agentId: string,
  slot: SlotCandidate,
  missions: Mission[],
): boolean {
  const slotStart = parseISO(slot.startISO).getTime()
  const slotEnd = parseISO(slot.endISO).getTime()
  return missions.some(m => {
    if (!m.agents?.some(a => a.id === agentId)) return false
    if (!m.start_time) return false
    const mStart = parseISO(`${m.scheduled_date}T${m.start_time}`).getTime()
    const mEnd = mStart + m.planned_hours * 3600 * 1000
    return slotStart < mEnd && slotEnd > mStart
  })
}

function scoreAgentForSlot(
  agent: Agent,
  slot: SlotCandidate,
  ctx: ProposeSlotsInput,
): { score: number; rationale: SchedulingProposal['rationale'] } | null {
  // Filtres durs
  if (agent.status === 'absent' || agent.status === 'inactif') return null
  if (hasMissionConflict(agent.id, slot, ctx.missions)) return null
  if (isAgentBlockedAt(agent.id, slot.startISO, slot.endISO, ctx.availabilityBlocks)) return null

  // Dispo hebdo (jours)
  const dayKey = slot.dayOfWeek
  const weeklyAvail = agent.weekly_availability || {}
  if (weeklyAvail[dayKey] === false) return null

  // Skills requis : intersection
  const requiredSkills = ctx.mission.required_skills || []
  const agentSkillsList = ctx.agentSkills
    .filter(s => s.agent_id === agent.id)
    .map(s => s.skill)
  // Fallback : agent.skills array
  const allAgentSkills = new Set<string>([...agentSkillsList, ...(agent.skills || [])])

  let skillMatchRatio = 1
  if (requiredSkills.length > 0) {
    const matched = requiredSkills.filter(s => allAgentSkills.has(s))
    skillMatchRatio = matched.length / requiredSkills.length
    if (skillMatchRatio === 0) return null // au moins 1 skill requis
  }

  // Workload (semaine du créneau)
  const slotWeekStart = startOfWeek(parseISO(slot.startISO), { weekStartsOn: 1 })
  const summary = computeWeeklySummary(agent, ctx.missions, slotWeekStart)
  const workloadScore = Math.max(0, 1 - summary.loadRatio) // 1=libre, 0=plein

  // Fatigue
  const fatigue = ctx.fatigueScores.find(f => f.agent_id === agent.id)
    ?? computeFatigueScore(agent, ctx.missions, parseISO(slot.startISO))
  const fatigueScore = Math.max(0, 1 - fatigue.score / 100)

  // Préférences client
  let preferenceScore = 1
  const cc = ctx.clientConstraint
  if (cc) {
    if (cc.preferred_days && cc.preferred_days.length > 0) {
      preferenceScore *= cc.preferred_days.includes(dayKey) ? 1 : 0.7
    }
    if (cc.preferred_hours_start && cc.preferred_hours_end) {
      const hStart = parseInt(cc.preferred_hours_start.split(':')[0]!)
      const hEnd = parseInt(cc.preferred_hours_end.split(':')[0]!)
      if (slot.startHour < hStart || slot.startHour >= hEnd) preferenceScore *= 0.75
    }
    if (cc.access_hours_start && cc.access_hours_end) {
      const hStart = parseInt(cc.access_hours_start.split(':')[0]!)
      const hEnd = parseInt(cc.access_hours_end.split(':')[0]!)
      // Dur : créneau doit être inclus
      if (slot.startHour < hStart) return null
      const slotEndHour = slot.startHour + ctx.mission.planned_hours
      if (slotEndHour > hEnd) return null
    }
  }

  // Pondération finale
  const score = (
    skillMatchRatio * 0.40 +
    workloadScore * 0.25 +
    fatigueScore * 0.20 +
    preferenceScore * 0.15
  )

  return {
    score,
    rationale: {
      skills_match: Math.round(skillMatchRatio * 100),
      workload: Math.round(workloadScore * 100),
      fatigue: Math.round(fatigueScore * 100),
      preferences: Math.round(preferenceScore * 100),
    },
  }
}

export function proposeSlots(input: ProposeSlotsInput): SchedulingProposal[] {
  const durationHours = Math.max(1, Math.ceil(input.mission.planned_hours || 2))
  const candidates = generateSlotCandidates(durationHours, input.from ?? new Date())
  const requiredWorkers = Math.max(1, input.mission.estimated_workers || 1)

  const proposals: Array<{ slot: SlotCandidate; score: number; agentIds: string[]; rationale: SchedulingProposal['rationale'] }> = []

  for (const slot of candidates) {
    // Score chaque agent pour ce slot, garde les meilleurs
    const ranked = input.agents
      .map(a => ({ agent: a, ...scoreAgentForSlot(a, slot, input)! }))
      .filter(r => r.score !== undefined)
      .sort((a, b) => b.score - a.score)

    if (ranked.length < requiredWorkers) continue
    const top = ranked.slice(0, requiredWorkers)
    const slotScore = top.reduce((s, r) => s + r.score, 0) / top.length

    // Rationale agrégée
    const aggRationale = top.reduce((acc, r) => ({
      skills_match: acc.skills_match + r.rationale.skills_match,
      workload: acc.workload + r.rationale.workload,
      fatigue: acc.fatigue + r.rationale.fatigue,
      preferences: acc.preferences + r.rationale.preferences,
    }), { skills_match: 0, workload: 0, fatigue: 0, preferences: 0 })

    proposals.push({
      slot,
      score: slotScore,
      agentIds: top.map(t => t.agent.id),
      rationale: {
        skills_match: Math.round(aggRationale.skills_match / top.length),
        workload: Math.round(aggRationale.workload / top.length),
        fatigue: Math.round(aggRationale.fatigue / top.length),
        preferences: Math.round(aggRationale.preferences / top.length),
      },
    })
  }

  // Diversifier : éviter de retourner 6 créneaux du même jour. On garde max 2 par jour.
  proposals.sort((a, b) => b.score - a.score)
  const perDay = new Map<string, number>()
  const picked: typeof proposals = []
  for (const p of proposals) {
    const dayKey = format(parseISO(p.slot.startISO), 'yyyy-MM-dd')
    const count = perDay.get(dayKey) ?? 0
    if (count >= 2) continue
    perDay.set(dayKey, count + 1)
    picked.push(p)
    if (picked.length >= PROPOSAL_COUNT) break
  }

  const now = new Date().toISOString()
  return picked.map((p, idx) => ({
    id: `prop-${input.mission.id}-${idx}-${Date.now()}`,
    mission_id: input.mission.id,
    proposed_start: p.slot.startISO,
    proposed_end: p.slot.endISO,
    score: Math.round(p.score * 100),
    recommended_agent_ids: p.agentIds,
    rationale: p.rationale,
    selected: false,
    created_at: now,
  }))
}

export interface AgentRecommendation {
  agent: Agent
  score: number
  fitsSkills: boolean
  conflicts: boolean
  loadRatio: number
  fatigueLabel: string
  rationale: { skills_match: number; workload: number; fatigue: number }
}

export function recommendAgentsForMission(
  mission: Mission,
  agents: Agent[],
  missions: Mission[],
  agentSkills: AgentSkill[],
  availabilityBlocks: AvailabilityBlock[],
  fatigueScores: FatigueScore[],
): AgentRecommendation[] {
  const slotStartISO = mission.start_time
    ? parseISO(`${mission.scheduled_date}T${mission.start_time}`).toISOString()
    : parseISO(`${mission.scheduled_date}T09:00:00`).toISOString()
  const slotEndISO = new Date(new Date(slotStartISO).getTime() + (mission.planned_hours || 2) * 3600 * 1000).toISOString()
  const weekStart = startOfWeek(parseISO(slotStartISO), { weekStartsOn: 1 })

  const requiredSkills = mission.required_skills || []

  return agents.map(agent => {
    const agentSkillList = new Set<string>([
      ...agentSkills.filter(s => s.agent_id === agent.id).map(s => s.skill),
      ...(agent.skills || []),
    ])
    const matched = requiredSkills.length === 0
      ? 1
      : requiredSkills.filter(s => agentSkillList.has(s)).length / requiredSkills.length

    const summary = computeWeeklySummary(agent, missions, weekStart)
    const workload = Math.max(0, 1 - summary.loadRatio)

    const fatigue = fatigueScores.find(f => f.agent_id === agent.id)
      ?? computeFatigueScore(agent, missions)
    const fatigueOk = Math.max(0, 1 - fatigue.score / 100)

    const conflicts = isAgentBlockedAt(agent.id, slotStartISO, slotEndISO, availabilityBlocks)
      || missions.some(m => {
        if (m.id === mission.id) return false
        if (!m.agents?.some(a => a.id === agent.id)) return false
        if (!m.start_time) return false
        const mStart = parseISO(`${m.scheduled_date}T${m.start_time}`).getTime()
        const mEnd = mStart + m.planned_hours * 3600 * 1000
        const sStart = new Date(slotStartISO).getTime()
        const sEnd = new Date(slotEndISO).getTime()
        return sStart < mEnd && sEnd > mStart
      })

    const unavailable = agent.status === 'absent' || agent.status === 'inactif' || conflicts
    const baseScore = matched * 0.45 + workload * 0.30 + fatigueOk * 0.25
    const score = unavailable ? 0 : baseScore

    return {
      agent,
      score: Math.round(score * 100),
      fitsSkills: matched > 0,
      conflicts,
      loadRatio: summary.loadRatio,
      fatigueLabel: fatigue.label,
      rationale: {
        skills_match: Math.round(matched * 100),
        workload: Math.round(workload * 100),
        fatigue: Math.round(fatigueOk * 100),
      },
    }
  }).sort((a, b) => b.score - a.score)
}
