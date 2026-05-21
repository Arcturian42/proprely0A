'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signUpCompany } from '@/app/actions/auth'
import { track } from '@/lib/analytics/posthog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useFrenchValidation } from '@/lib/forms/use-french-validation'

export default function SignupPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { onInvalid, onInput } = useFrenchValidation()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await signUpCompany(formData)
      if (res.ok) {
        track('signup_completed', {
          company_name: formData.get('company_name'),
        })
        // Session was set in the server action via signInWithPassword on the
        // SSR client (cookies adapter posted sb-…-auth-token). router.refresh
        // forces the proxy to see the new cookie before the navigation runs.
        router.push(res.redirectTo ?? '/onboarding/2')
        router.refresh()
      } else {
        setError(res.error)
        track('signup_failed', { error: res.error })
      }
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Créer ton entreprise</h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure ton espace Proprely en quelques minutes. Tu pourras ensuite inviter ton équipe et personnaliser ton moteur de devis.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="owner_first_name">
              Prénom <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="owner_first_name"
              name="owner_first_name"
              required
              maxLength={100}
              autoComplete="given-name"
              placeholder="Marie"
              disabled={pending}
              onInvalid={onInvalid}
              onInput={onInput}
            />
          </div>
          <div>
            <Label htmlFor="owner_last_name">
              Nom <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="owner_last_name"
              name="owner_last_name"
              required
              maxLength={100}
              autoComplete="family-name"
              placeholder="Dupont"
              disabled={pending}
              onInvalid={onInvalid}
              onInput={onInput}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="company_name">
            Nom de l&apos;entreprise <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="company_name"
            name="company_name"
            required
            minLength={2}
            maxLength={200}
            placeholder="Ex: Nettoyage Pro SARL"
            disabled={pending}
            onInvalid={onInvalid}
            onInput={onInput}
          />
        </div>

        <div>
          <Label htmlFor="email">
            Email professionnel <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="prenom@entreprise.fr"
            disabled={pending}
            onInvalid={onInvalid}
            onInput={onInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="password">
              Mot de passe <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              maxLength={72}
              autoComplete="new-password"
              placeholder="6 caractères minimum"
              disabled={pending}
              onInvalid={onInvalid}
              onInput={onInput}
            />
          </div>
          <div>
            <Label htmlFor="confirm_password">
              Confirmer <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Re-saisis le mot de passe"
              disabled={pending}
              onInvalid={onInvalid}
              onInput={onInput}
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          <span className="text-rose-500">*</span> Champs obligatoires
        </p>

        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Création en cours…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Créer mon entreprise
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm rounded-md px-3 py-2.5 bg-rose-50 text-rose-900 border border-rose-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center pt-2">
          En créant ton compte, tu acceptes nos{' '}
          <Link href="/cgu" className="underline hover:text-slate-700">CGU</Link> et notre{' '}
          <Link href="/confidentialite" className="underline hover:text-slate-700">politique de confidentialité</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
