import { Check } from 'lucide-react'

interface Step {
  number: number
  label: string
}

const STEPS: Step[] = [
  { number: 1, label: 'Entreprise' },
  { number: 2, label: 'Équipe' },
  { number: 3, label: 'Prestations' },
  { number: 4, label: 'Tarification' },
  { number: 5, label: 'Paramètres' },
  { number: 6, label: 'Confirmation' },
]

interface OnboardingProgressBarProps {
  currentStep: number
  completedSteps: number[]
}

export function OnboardingProgressBar({
  currentStep,
  completedSteps,
}: OnboardingProgressBarProps) {
  return (
    <nav aria-label="Progression de l'onboarding" className="w-full">
      <ol className="flex items-center justify-between gap-2 sm:gap-3">
        {STEPS.map((step, idx) => {
          const isDone = completedSteps.includes(step.number)
          const isActive = step.number === currentStep
          const isFuture = !isDone && !isActive

          return (
            <li key={step.number} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={[
                    'flex items-center justify-center rounded-full transition-colors',
                    'h-7 w-7 sm:h-8 sm:w-8 text-[11px] sm:text-[13px] font-medium',
                    isDone && 'bg-emerald-600 text-white',
                    isActive && 'bg-indigo-600 text-white ring-4 ring-indigo-100',
                    isFuture && 'bg-slate-100 text-slate-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? <Check className="h-4 w-4" aria-hidden /> : step.number}
                </div>
                <span
                  className={[
                    'mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-medium text-center truncate w-full',
                    isActive && 'text-indigo-700',
                    isDone && 'text-emerald-700',
                    isFuture && 'text-slate-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={[
                    'h-px flex-1 mx-1 sm:mx-2 -mt-4 sm:-mt-5',
                    isDone ? 'bg-emerald-300' : 'bg-slate-200',
                  ].join(' ')}
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
