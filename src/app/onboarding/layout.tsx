import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'

import {
  createServerClient,
  createServiceRoleClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'
import {
  computeNextIncompleteStep,
  isOnboardingComplete,
} from '@/lib/onboarding/status'
import { OnboardingProgressBar } from '@/components/onboarding/OnboardingProgressBar'
import type { OnboardingStatus } from '@/types'
import { signOut } from '@/app/actions/auth'

async function loadOwnerOnboardingState(): Promise<
  | { kind: 'dummy' }
  | { kind: 'redirect'; to: string }
  | { kind: 'owner'; status: OnboardingStatus | null }
> {
  if (!isSupabaseConfigured()) {
    return { kind: 'dummy' }
  }
  const supabase = await createServerClient()
  if (!supabase) return { kind: 'redirect', to: '/login' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { kind: 'redirect', to: '/login?next=/onboarding/2' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single<{ role: 'owner' | 'admin' | 'sales' | 'agent'; company_id: string }>()
  if (!profile) return { kind: 'redirect', to: '/login' }
  if (profile.role !== 'owner') {
    return {
      kind: 'redirect',
      to: profile.role === 'agent' ? '/agent/mon-agenda' : '/dashboard',
    }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { kind: 'redirect', to: '/login?error=service-role' }

  const { data: status } = await admin
    .from('onboarding_status')
    .select('*')
    .eq('company_id', profile.company_id)
    .maybeSingle<OnboardingStatus>()

  if (isOnboardingComplete(status)) {
    return { kind: 'redirect', to: '/dashboard' }
  }

  return { kind: 'owner', status: status ?? null }
}

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const state = await loadOwnerOnboardingState()
  if (state.kind === 'redirect') redirect(state.to)

  const status = state.kind === 'owner' ? state.status : null
  const currentStep = state.kind === 'owner' ? computeNextIncompleteStep(status) : 2
  const completedSteps: number[] = []
  if (status) {
    if (status.step_1_completed_at) completedSteps.push(1)
    if (status.step_2_team_completed_at || status.step_2_team_skipped_at) completedSteps.push(2)
    if (status.step_3_services_completed_at || status.step_3_services_skipped_at) completedSteps.push(3)
    if (
      status.step_4_pricing_completed_at ||
      status.step_4_pricing_skipped_at ||
      status.step_3_services_skipped_at
    ) {
      completedSteps.push(4)
    }
    if (status.step_5_settings_completed_at || status.step_5_settings_skipped_at) completedSteps.push(5)
  } else if (state.kind === 'dummy') {
    completedSteps.push(1)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] sm:text-[17px] font-semibold tracking-tight text-slate-900">
              Proprely
            </span>
            <span className="text-[11px] sm:text-[12px] text-slate-400 hidden sm:inline">
              · Configuration de ton espace
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] text-slate-500 hover:text-slate-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Se déconnecter</span>
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-10">
          <OnboardingProgressBar currentStep={currentStep} completedSteps={completedSteps} />
        </div>

        {children}
      </div>
    </div>
  )
}
