import { describe, expect, it } from 'vitest'
import {
  allRequiredStepsResolved,
  computeNextIncompleteStep,
  isOnboardingComplete,
} from './status'
import type { OnboardingStatus } from '@/types'

const baseStatus = (overrides: Partial<OnboardingStatus> = {}): OnboardingStatus => ({
  company_id: 'company-1',
  step_1_completed_at: '2026-05-18T10:00:00Z',
  step_2_team_completed_at: null,
  step_2_team_skipped_at: null,
  step_3_services_completed_at: null,
  step_3_services_skipped_at: null,
  step_4_pricing_completed_at: null,
  step_4_pricing_skipped_at: null,
  step_5_settings_completed_at: null,
  step_5_settings_skipped_at: null,
  completed_at: null,
  created_at: '2026-05-18T10:00:00Z',
  updated_at: '2026-05-18T10:00:00Z',
  ...overrides,
})

describe('computeNextIncompleteStep', () => {
  it('returns 2 when status is null (right after signup)', () => {
    expect(computeNextIncompleteStep(null)).toBe(2)
    expect(computeNextIncompleteStep(undefined)).toBe(2)
  })

  it('returns 2 when only step 1 is done', () => {
    expect(computeNextIncompleteStep(baseStatus())).toBe(2)
  })

  it('returns 3 when step 2 is completed', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({ step_2_team_completed_at: '2026-05-18T10:01:00Z' }),
      ),
    ).toBe(3)
  })

  it('returns 3 when step 2 is skipped', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({ step_2_team_skipped_at: '2026-05-18T10:01:00Z' }),
      ),
    ).toBe(3)
  })

  it('skips step 4 when step 3 (services) is skipped', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({
          step_2_team_skipped_at: '2026-05-18T10:01:00Z',
          step_3_services_skipped_at: '2026-05-18T10:02:00Z',
        }),
      ),
    ).toBe(5)
  })

  it('returns 6 when step 3 skipped and step 5 done', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({
          step_2_team_skipped_at: '2026-05-18T10:01:00Z',
          step_3_services_skipped_at: '2026-05-18T10:02:00Z',
          step_5_settings_completed_at: '2026-05-18T10:03:00Z',
        }),
      ),
    ).toBe(6)
  })

  it('returns 4 when steps 2 and 3 done', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({
          step_2_team_completed_at: '2026-05-18T10:01:00Z',
          step_3_services_completed_at: '2026-05-18T10:02:00Z',
        }),
      ),
    ).toBe(4)
  })

  it('returns 5 when steps 2, 3, 4 done', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({
          step_2_team_completed_at: '2026-05-18T10:01:00Z',
          step_3_services_completed_at: '2026-05-18T10:02:00Z',
          step_4_pricing_completed_at: '2026-05-18T10:03:00Z',
        }),
      ),
    ).toBe(5)
  })

  it('returns 6 when all required steps resolved but completed_at not set', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({
          step_2_team_completed_at: '2026-05-18T10:01:00Z',
          step_3_services_completed_at: '2026-05-18T10:02:00Z',
          step_4_pricing_completed_at: '2026-05-18T10:03:00Z',
          step_5_settings_completed_at: '2026-05-18T10:04:00Z',
        }),
      ),
    ).toBe(6)
  })

  it('returns last step when completed_at is set', () => {
    expect(
      computeNextIncompleteStep(
        baseStatus({
          step_2_team_skipped_at: '2026-05-18T10:01:00Z',
          step_3_services_skipped_at: '2026-05-18T10:02:00Z',
          step_5_settings_skipped_at: '2026-05-18T10:03:00Z',
          completed_at: '2026-05-18T10:04:00Z',
        }),
      ),
    ).toBe(6)
  })
})

describe('isOnboardingComplete', () => {
  it('returns false when completed_at is null', () => {
    expect(isOnboardingComplete(baseStatus())).toBe(false)
  })

  it('returns false when status is null/undefined', () => {
    expect(isOnboardingComplete(null)).toBe(false)
    expect(isOnboardingComplete(undefined)).toBe(false)
  })

  it('returns true when completed_at is set', () => {
    expect(
      isOnboardingComplete(baseStatus({ completed_at: '2026-05-18T10:04:00Z' })),
    ).toBe(true)
  })
})

describe('allRequiredStepsResolved', () => {
  it('returns false when status is null', () => {
    expect(allRequiredStepsResolved(null)).toBe(false)
  })

  it('returns false when step 2 is pending', () => {
    expect(allRequiredStepsResolved(baseStatus())).toBe(false)
  })

  it('returns true when all 4 steps resolved by completion', () => {
    expect(
      allRequiredStepsResolved(
        baseStatus({
          step_2_team_completed_at: '2026-05-18T10:01:00Z',
          step_3_services_completed_at: '2026-05-18T10:02:00Z',
          step_4_pricing_completed_at: '2026-05-18T10:03:00Z',
          step_5_settings_completed_at: '2026-05-18T10:04:00Z',
        }),
      ),
    ).toBe(true)
  })

  it('returns true when step 3 skipped (step 4 auto-considered resolved)', () => {
    expect(
      allRequiredStepsResolved(
        baseStatus({
          step_2_team_skipped_at: '2026-05-18T10:01:00Z',
          step_3_services_skipped_at: '2026-05-18T10:02:00Z',
          step_5_settings_skipped_at: '2026-05-18T10:03:00Z',
        }),
      ),
    ).toBe(true)
  })

  it('returns false when step 3 done but step 4 pending', () => {
    expect(
      allRequiredStepsResolved(
        baseStatus({
          step_2_team_completed_at: '2026-05-18T10:01:00Z',
          step_3_services_completed_at: '2026-05-18T10:02:00Z',
          step_5_settings_completed_at: '2026-05-18T10:04:00Z',
        }),
      ),
    ).toBe(false)
  })
})
