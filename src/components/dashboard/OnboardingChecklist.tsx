'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'

interface OnboardingChecklistProps {
  hasClient: boolean
  hasAgent: boolean
  hasMission: boolean
  hasInvitedMember: boolean
}

/**
 * Small checklist shown on the dashboard for fresh companies. Once all four
 * items are done, the parent should stop rendering this component.
 *
 * Inputs are booleans derived from the store (kept simple to dodge stale
 * counts after a deletion).
 */
export function OnboardingChecklist({
  hasClient,
  hasAgent,
  hasMission,
  hasInvitedMember,
}: OnboardingChecklistProps) {
  const steps = [
    { done: hasClient, label: 'Ajouter ton premier client', href: '/commercial/clients-sites' },
    { done: hasAgent, label: 'Inscrire un agent d\'entretien', href: '/rh/agents' },
    { done: hasMission, label: 'Planifier une mission', href: '/operations/planning' },
    { done: hasInvitedMember, label: 'Inviter un collaborateur', href: '/parametres?tab=equipe' },
  ]
  const completedCount = steps.filter(s => s.done).length
  const total = steps.length

  if (completedCount === total) return null

  return (
    <Card className="mb-6 border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" aria-hidden="true" />
            Démarrer avec Proprely
          </CardTitle>
          <span className="text-xs text-slate-500">{completedCount}/{total} terminé</span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {steps.map(step => (
            <li key={step.href}>
              <Link
                href={step.href}
                className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded-md transition-colors ${
                  step.done
                    ? 'text-slate-400 line-through cursor-default pointer-events-none'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" aria-hidden="true" />
                )}
                <span>{step.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
