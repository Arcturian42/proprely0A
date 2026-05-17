import type { Mission } from '@/types'

export function parseTimeToHours(time: string | null | undefined, fallback = 8): number {
  if (!time) return fallback
  const [h, m] = time.split(':')
  const hours = parseInt(h, 10)
  const minutes = parseInt(m ?? '0', 10)
  if (!Number.isFinite(hours)) return fallback
  return hours + (Number.isFinite(minutes) ? minutes / 60 : 0)
}

export function missionToSlot(mission: Pick<Mission, 'start_time' | 'planned_hours'>): { start: number; end: number } {
  const start = parseTimeToHours(mission.start_time)
  return { start, end: start + mission.planned_hours }
}

export function hasAgentConflict(
  agentId: string,
  date: string,
  startH: number,
  durationH: number,
  missions: Mission[],
  excludeMissionId?: string,
): boolean {
  const endH = startH + durationH
  return missions
    .filter(m => m.id !== excludeMissionId)
    .filter(m => m.scheduled_date === date && m.agents?.some(a => a.id === agentId))
    .some(m => {
      const slot = missionToSlot(m)
      return startH < slot.end && endH > slot.start
    })
}
