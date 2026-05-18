import type { OnboardingStatus } from '@/types'

export const ONBOARDING_FIRST_STEP = 2
export const ONBOARDING_LAST_STEP = 6
export type OnboardingStep = 2 | 3 | 4 | 5 | 6

// Workflow note: when step 3 (services) is explicitly skipped, step 4
// (per-service pricing rules) is meaningless — there's nothing to price —
// so we fast-forward to step 5.
export function computeNextIncompleteStep(
  status: OnboardingStatus | null | undefined,
): OnboardingStep {
  if (!status) return 2
  if (status.completed_at) return ONBOARDING_LAST_STEP

  if (!status.step_2_team_completed_at && !status.step_2_team_skipped_at) return 2
  if (!status.step_3_services_completed_at && !status.step_3_services_skipped_at) return 3

  if (status.step_3_services_skipped_at) {
    if (!status.step_5_settings_completed_at && !status.step_5_settings_skipped_at) return 5
    return 6
  }

  if (!status.step_4_pricing_completed_at && !status.step_4_pricing_skipped_at) return 4
  if (!status.step_5_settings_completed_at && !status.step_5_settings_skipped_at) return 5
  return 6
}

export function isOnboardingComplete(
  status: OnboardingStatus | null | undefined,
): boolean {
  return Boolean(status?.completed_at)
}

export function allRequiredStepsResolved(
  status: OnboardingStatus | null | undefined,
): boolean {
  if (!status) return false
  const step2 = status.step_2_team_completed_at || status.step_2_team_skipped_at
  const step3 = status.step_3_services_completed_at || status.step_3_services_skipped_at
  const step4 =
    status.step_3_services_skipped_at ||
    status.step_4_pricing_completed_at ||
    status.step_4_pricing_skipped_at
  const step5 = status.step_5_settings_completed_at || status.step_5_settings_skipped_at
  return Boolean(step2 && step3 && step4 && step5)
}
