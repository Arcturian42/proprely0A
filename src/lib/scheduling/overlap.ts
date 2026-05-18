// Pure utilities for agent scheduling conflict detection. Extracted from
// the assignAgentsToMission server action so it's trivially testable.

export interface TimeWindow {
  /** HH:MM (24h, 5 chars) */
  start_time: string
  planned_hours: number
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((s) => Number(s))
  return (h ?? 0) * 60 + (m ?? 0)
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Two same-day time windows overlap if A starts before B ends AND
 * B starts before A ends. Equal endpoints don't count as overlap
 * (back-to-back missions are fine).
 */
export function hasTimeOverlap(a: TimeWindow, b: TimeWindow): boolean {
  const aStart = timeToMinutes(a.start_time)
  const aEnd = aStart + Math.round(a.planned_hours * 60)
  const bStart = timeToMinutes(b.start_time)
  const bEnd = bStart + Math.round(b.planned_hours * 60)
  return aStart < bEnd && bStart < aEnd
}
