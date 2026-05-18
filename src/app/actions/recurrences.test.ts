import { describe, expect, it } from 'vitest'
import { nextOccurrenceDates } from './recurrences'

describe('nextOccurrenceDates — weekly', () => {
  it('generates 4 weekly dates aligned to the target weekday', async () => {
    // 2026-05-18 is a Monday. Target weekday=1 (Monday).
    const dates = await nextOccurrenceDates({
      frequency: 'weekly',
      weekday: 1,
      day_of_month: null,
      starts_on: '2026-05-18',
      ends_on: null,
      count: 4,
    })
    expect(dates).toEqual(['2026-05-18', '2026-05-25', '2026-06-01', '2026-06-08'])
  })

  it('advances to the next target weekday when starts_on is mid-week', async () => {
    // 2026-05-20 = Wednesday. Target weekday=5 (Friday) → 2026-05-22.
    const dates = await nextOccurrenceDates({
      frequency: 'weekly',
      weekday: 5,
      day_of_month: null,
      starts_on: '2026-05-20',
      ends_on: null,
      count: 2,
    })
    expect(dates).toEqual(['2026-05-22', '2026-05-29'])
  })

  it('biweekly steps every 14 days', async () => {
    const dates = await nextOccurrenceDates({
      frequency: 'biweekly',
      weekday: 1,
      day_of_month: null,
      starts_on: '2026-05-18',
      ends_on: null,
      count: 3,
    })
    expect(dates).toEqual(['2026-05-18', '2026-06-01', '2026-06-15'])
  })

  it('respects ends_on as an upper bound', async () => {
    const dates = await nextOccurrenceDates({
      frequency: 'weekly',
      weekday: 1,
      day_of_month: null,
      starts_on: '2026-05-18',
      ends_on: '2026-06-01',
      count: 10,
    })
    expect(dates).toEqual(['2026-05-18', '2026-05-25', '2026-06-01'])
  })
})

describe('nextOccurrenceDates — monthly', () => {
  it('generates the same day-of-month each month', async () => {
    const dates = await nextOccurrenceDates({
      frequency: 'monthly',
      weekday: null,
      day_of_month: 15,
      starts_on: '2026-05-01',
      ends_on: null,
      count: 3,
    })
    expect(dates).toEqual(['2026-05-15', '2026-06-15', '2026-07-15'])
  })

  it('falls back to starts_on day-of-month when day_of_month is null', async () => {
    const dates = await nextOccurrenceDates({
      frequency: 'monthly',
      weekday: null,
      day_of_month: null,
      starts_on: '2026-05-07',
      ends_on: null,
      count: 2,
    })
    expect(dates).toEqual(['2026-05-07', '2026-06-07'])
  })
})
