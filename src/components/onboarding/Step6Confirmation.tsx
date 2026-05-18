'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Sparkles, Users, FileText, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StepCard } from './StepCard'
import { completeOnboarding } from '@/app/actions/onboarding'
import { track } from '@/lib/analytics/posthog'

export function Step6Confirmation() {
  const router = useRouter()
  const [pending, start] = useTransition()

  function handleFinish(target: string) {
    start(async () => {
      const res = await completeOnboarding()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_completed', { next_target: target })
      router.push(target)
    })
  }

  return (
    <StepCard
      title="Ton espace Proprely est prêt"
      description="Ton entreprise est configurée. Tu peux maintenant accéder à ton dashboard, créer tes premiers prospects, générer tes devis et organiser tes missions."
      footer={
        <div className="flex justify-end">
          <Button
            onClick={() => handleFinish('/dashboard')}
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalisation...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accéder au dashboard
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-center py-2 mb-4 sm:mb-6">
        <div className="rounded-full bg-emerald-50 p-3 sm:p-4">
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" aria-hidden />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => handleFinish('/commercial/pipeline')}
          disabled={pending}
          className="rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 p-3 sm:p-4 text-left transition-colors disabled:opacity-50"
        >
          <FileText className="h-4 w-4 text-indigo-600 mb-2" aria-hidden />
          <div className="text-[13px] font-medium text-slate-900">Créer mon premier prospect</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Démarre ton pipeline commercial
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleFinish('/commercial/clients-sites')}
          disabled={pending}
          className="rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 p-3 sm:p-4 text-left transition-colors disabled:opacity-50"
        >
          <Users className="h-4 w-4 text-indigo-600 mb-2" aria-hidden />
          <div className="text-[13px] font-medium text-slate-900">Ajouter un client</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Référence un client existant
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleFinish('/operations/planning')}
          disabled={pending}
          className="rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 p-3 sm:p-4 text-left transition-colors disabled:opacity-50"
        >
          <MapPin className="h-4 w-4 text-indigo-600 mb-2" aria-hidden />
          <div className="text-[13px] font-medium text-slate-900">Planifier une mission</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Organise ton planning
          </div>
        </button>
      </div>
    </StepCard>
  )
}
