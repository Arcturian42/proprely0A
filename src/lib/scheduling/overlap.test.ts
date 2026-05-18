import { describe, expect, it } from 'vitest'
import {
  hasTimeOverlap,
  minutesToTime,
  timeToMinutes,
} from './overlap'

describe('timeToMinutes / minutesToTime', () => {
  it('round-trips standard times', () => {
    expect(timeToMinutes('09:30')).toBe(570)
    expect(minutesToTime(570)).toBe('09:30')
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59)
  })

  it('handles missing minutes', () => {
    expect(timeToMinutes('09')).toBe(540) // 09:undefined → 9h00
  })
})

describe('hasTimeOverlap', () => {
  it('detects classic overlap', () => {
    // A: 09:00-11:00, B: 10:00-12:00 → overlap [10:00-11:00]
    expect(
      hasTimeOverlap(
        { start_time: '09:00', planned_hours: 2 },
        { start_time: '10:00', planned_hours: 2 },
      ),
    ).toBe(true)
  })

  it('detects total inclusion', () => {
    // A: 09:00-15:00, B: 10:00-11:00 → B fully inside A
    expect(
      hasTimeOverlap(
        { start_time: '09:00', planned_hours: 6 },
        { start_time: '10:00', planned_hours: 1 },
      ),
    ).toBe(true)
  })

  it('back-to-back missions do NOT overlap', () => {
    // A: 09:00-11:00, B: 11:00-13:00 → adjacent but not overlapping
    expect(
      hasTimeOverlap(
        { start_time: '09:00', planned_hours: 2 },
        { start_time: '11:00', planned_hours: 2 },
      ),
    ).toBe(false)
  })

  it('non-overlapping with gap', () => {
    expect(
      hasTimeOverlap(
        { start_time: '09:00', planned_hours: 1 },
        { start_time: '14:00', planned_hours: 2 },
      ),
    ).toBe(false)
  })

  it('commutative — order independent', () => {
    const a = { start_time: '09:00', planned_hours: 2 }
    const b = { start_time: '10:00', planned_hours: 2 }
    expect(hasTimeOverlap(a, b)).toBe(hasTimeOverlap(b, a))
  })

  it('handles fractional hours (e.g. 1.5h)', () => {
    // A: 09:00-10:30, B: 10:15-11:00 → 15 min overlap
    expect(
      hasTimeOverlap(
        { start_time: '09:00', planned_hours: 1.5 },
        { start_time: '10:15', planned_hours: 0.75 },
      ),
    ).toBe(true)
  })

  it('zero-duration mission never overlaps', () => {
    expect(
      hasTimeOverlap(
        { start_time: '09:00', planned_hours: 0 },
        { start_time: '09:00', planned_hours: 2 },
      ),
    ).toBe(false)
  })
})
