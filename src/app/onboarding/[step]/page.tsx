import { redirect } from 'next/navigation'

import {
  createServerClient,
  createServiceRoleClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'
import { computeNextIncompleteStep } from '@/lib/onboarding/status'
import type { OnboardingStatus } from '@/types'

import { Step2InviteTeam } from '@/components/onboarding/Step2InviteTeam'
import { Step3Services } from '@/components/onboarding/Step3Services'
import { Step4PricingRules } from '@/components/onboarding/Step4PricingRules'
import { Step5PricingSettings } from '@/components/onboarding/Step5PricingSettings'
import { Step6Confirmation } from '@/components/onboarding/Step6Confirmation'

const VALID_STEPS = new Set(['2', '3', '4', '5', '6'])

async function loadStatusAndServices(): Promise<{
  status: OnboardingStatus | null
  services: { id: string; name: string; is_default: boolean }[]
}> {
  if (!isSupabaseConfigured()) return { status: null, services: [] }
  const supabase = await createServerClient()
  if (!supabase) return { status: null, services: [] }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: null, services: [] }
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single<{ company_id: string }>()
  if (!profile) return { status: null, services: [] }
  const admin = await createServiceRoleClient()
  if (!admin) return { status: null, services: [] }
  const [{ data: status }, { data: services }] = await Promise.all([
    admin
      .from('onboarding_status')
      .select('*')
      .eq('company_id', profile.company_id)
      .maybeSingle<OnboardingStatus>(),
    admin
      .from('service_types')
      .select('id, name, is_default')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])
  return { status: status ?? null, services: services ?? [] }
}

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step } = await params
  if (!VALID_STEPS.has(step)) redirect('/onboarding/2')

  const { status, services } = await loadStatusAndServices()
  const expected = String(computeNextIncompleteStep(status))

  // Le pas-à-pas est strict : impossible de revenir modifier une étape déjà
  // résolue, et impossible de sauter à une étape future. Toute URL hors de
  // l'étape courante ramène à l'étape attendue.
  if (step !== expected) {
    redirect(`/onboarding/${expected}`)
  }

  switch (step) {
    case '2':
      return <Step2InviteTeam />
    case '3':
      return <Step3Services />
    case '4':
      return <Step4PricingRules services={services} />
    case '5':
      return <Step5PricingSettings />
    case '6':
      return <Step6Confirmation />
    default:
      redirect('/onboarding/2')
  }
}
