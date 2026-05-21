'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithPassword } from '@/app/actions/auth'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogIn, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useFrenchValidation } from '@/lib/forms/use-french-validation'
import { SUPPORT_EMAIL } from '@/lib/constants'

// Maps the ?error= query param to a user-facing French message. Sources :
// - /auth/callback/route.ts (reset-password callback errors : missing-code, etc.)
// - proxy.ts (account_disabled when a deactivated user gets signed out)
// Unknown codes fall back to a generic message rather than swallowing the
// redirect silently.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'missing-code': 'Lien invalide ou expiré. Demande-en un nouveau via « Mot de passe oublié ».',
  'server_error': 'Une erreur serveur s\'est produite. Réessaie dans un instant.',
  'expired': 'Ce lien a expiré (validité 15 min). Demande-en un nouveau via « Mot de passe oublié ».',
  'access_denied': 'Accès refusé. Vérifie que le lien provient bien de Proprely.',
  'invalid_request': 'Lien mal formé. Demande-en un nouveau via « Mot de passe oublié ».',
  'account_disabled':
    'Ton compte a été désactivé par ton administrateur. Contacte-le pour qu\'il te réactive depuis Paramètres → Équipe.',
  'supabase-not-configured':
    'Service indisponible — réessaie dans quelques minutes. Si le problème persiste, contacte le support.',
  'client-unavailable': 'Service indisponible — réessaie dans quelques minutes.',
}

function LoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const errorCode = params.get('error')
  const next = params.get('next') ?? ''
  const [pending, startTransition] = useTransition()
  // Hydrate the result state directly from the URL on mount — using an
  // effect to do this would re-render unnecessarily and trips the
  // react-hooks/set-state-in-effect lint.
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(() => {
    if (!errorCode) return null
    const message =
      AUTH_ERROR_MESSAGES[errorCode] ??
      'Une erreur d\'authentification s\'est produite. Réessaie.'
    return { ok: false, message }
  })
  const { onInvalid, onInput } = useFrenchValidation()

  // Safety net : si on atterrit ici via une redirection du proxy (session expirée)
  // sans passer par le bouton "Se déconnecter", on purge quand même le cache local.
  useEffect(() => {
    useAppStore.persist?.clearStorage?.()
  }, [])

  function handleSubmit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await signInWithPassword(formData)
      if (res.ok) {
        // router.refresh() force le proxy à re-lire le cookie sb-…-auth-token
        // posé par le SSR adapter pendant la server action avant de naviguer.
        router.push(res.redirectTo ?? '/dashboard')
        router.refresh()
      } else {
        setResult({ ok: false, message: res.error })
      }
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Connexion</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entre ton email et ton mot de passe.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <input type="hidden" name="next" value={next} />
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

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">
              Mot de passe <span className="text-rose-500">*</span>
            </Label>
            <Link href="/reset-password" className="text-xs text-slate-600 hover:text-slate-900 underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            disabled={pending}
            onInvalid={onInvalid}
            onInput={onInput}
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours…
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" /> Se connecter
            </>
          )}
        </Button>

        {result && (
          <div
            role="alert"
            className={`flex items-start gap-2 text-sm rounded-md px-3 py-2.5 ${
              result.ok
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p>{result.message}</p>
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="font-medium text-slate-900 hover:underline">
          Créer mon entreprise
        </Link>
      </p>

      <details className="mt-6 text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-700">
          Tu n&apos;arrives pas à te connecter ?
        </summary>
        <ul className="mt-2 ml-5 list-disc space-y-1">
          <li>Vérifie l&apos;orthographe de ton email et de ton mot de passe.</li>
          <li>
            Mot de passe oublié ? Utilise le lien{' '}
            <Link href="/reset-password" className="underline hover:text-slate-700">« Mot de passe oublié »</Link> pour recevoir un email de réinitialisation.
          </li>
          <li>Compte désactivé par ton admin ? Contacte-le pour qu&apos;il te réactive depuis Paramètres → Équipe.</li>
          <li>
            Pour toute autre question :{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-slate-700">
              {SUPPORT_EMAIL}
            </a>
            .
          </li>
        </ul>
      </details>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Chargement…</div>}>
      <LoginContent />
    </Suspense>
  )
}
