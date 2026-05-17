import { Agent, AvailabilityBlock, FatigueLabel, FatigueScore, Mission } from '@/types'
import { addDays, differenceInCalendarDays, parseISO, startOfWeek } from 'date-fns'

export interface WorkloadSummary {
  weeklyHours: number
  capacityHours: number
  loadRatio: number // 0..1+
  missionsThisWeek: number
  consecutiveDays: number
  nightShifts: number
}

const NIGHT_HOUR_THRESHOLD = 21 // missions démarrant >=21h ou <6h
const NIGHT_END = 6

export function getMissionsForAgentInRange(
  agentId: string,
  missions: Mission[],
  startISO: string,
  endISO: string,
): Mission[] {
  const start = parseISO(startISO)
  const end = parseISO(endISO)
  return missions.filter(m => {
    if (!m.agents?.some(a => a.id === agentId)) return false
    const d = parseISO(m.scheduled_date + 'T12:00:00')
    return d >= start && d < end
  })
}

export function computeWeeklySummary(
  agent: Agent,
  missions: Mission[],
  weekStart: Date,
): WorkloadSummary {
  const weekEnd = addDays(weekStart, 7)
  const inWeek = missions.filter(m => {
    if (!m.agents?.some(a => a.id === agent.id)) return false
    const d = new Date(m.scheduled_date + 'T12:00:00')
    return d >= weekStart && d < weekEnd
  })

  const weeklyHours = inWeek.reduce((sum, m) => sum + (m.planned_hours || 0), 0)
  const dates = Array.from(new Set(inWeek.map(m => m.scheduled_date))).sort()

  // jours consécutifs
  let consecutive = 0
  let maxConsecutive = 0
  let prev: Date | null = null
  for (const d of dates) {
    const cur = parseISO(d)
    if (prev && differenceInCalendarDays(cur, prev) === 1) {
      consecutive += 1
    } else {
      consecutive = 1
    }
    maxConsecutive = Math.max(maxConsecutive, consecutive)
    prev = cur
  }

  const nightShifts = inWeek.filter(m => {
    if (!m.start_time) return false
    const h = parseInt(m.start_time.split(':')[0]!)
    return h >= NIGHT_HOUR_THRESHOLD || h < NIGHT_END
  }).length

  const capacityHours = agent.weekly_availability_hours || 35
  return {
    weeklyHours,
    capacityHours,
    loadRatio: weeklyHours / capacityHours,
    missionsThisWeek: inWeek.length,
    consecutiveDays: maxConsecutive,
    nightShifts,
  }
}

export function computeFatigueScore(
  agent: Agent,
  missions: Mission[],
  refDate: Date = new Date(),
): FatigueScore {
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 })
  const current = computeWeeklySummary(agent, missions, weekStart)
  const previous = computeWeeklySummary(agent, missions, addDays(weekStart, -7))

  // Pondération : charge actuelle (60) + jours consécutifs (15) + nuits (10) + carryover semaine précédente (15)
  const loadPart = Math.min(60, current.loadRatio * 60)
  const consecutivePart = Math.min(15, current.consecutiveDays * 3)
  const nightPart = Math.min(10, current.nightShifts * 5)
  const carryoverPart = Math.min(15, previous.loadRatio * 15)

  const score = Math.round(loadPart + consecutivePart + nightPart + carryoverPart)

  let label: FatigueLabel = 'ok'
  if (score >= 85) label = 'burnout'
  else if (score >= 70) label = 'surcharge'
  else if (score >= 50) label = 'charge'

  return {
    agent_id: agent.id,
    score,
    label,
    computed_at: new Date().toISOString(),
  }
}

export function isAgentBlockedAt(
  agentId: string,
  startISO: string,
  endISO: string,
  blocks: AvailabilityBlock[],
): boolean {
  const start = parseISO(startISO).getTime()
  const end = parseISO(endISO).getTime()
  return blocks.some(b => {
    if (b.agent_id !== agentId) return false
    if (b.kind === 'preferer') return false
    const bStart = parseISO(b.start_at).getTime()
    const bEnd = parseISO(b.end_at).getTime()
    return start < bEnd && end > bStart
  })
}
