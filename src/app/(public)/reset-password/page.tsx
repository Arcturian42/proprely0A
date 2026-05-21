'use client'

import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFrenchValidation } from '@/lib/forms/use-french-validation'
import { requestPasswordReset } from '@/app/actions/auth'
import { SUPPORT_EMAIL } from '@/lib/constants'

const ERROR_MESSAGES: Record<string, string> = {
  'session-expired': 'Lien expiré ou déjà utilisé. Re-demande un email ci-dessous.',
}

function ResetPasswordContent() {
  const params = useSearchParams()
  const errorCode = params.get('error')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(() => {
    if (!errorCode) return null
    const message = ERROR_MESSAGES[errorCode] ?? 'Une erreur s\'est produite. Réessaie.'
    return { ok: false, message }
  })
  const { onInvalid, onInput } = useFrenchValidation()

  function handleSubmit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await requestPasswordReset(formData)
      if (res.ok) {
        setResult({ ok: true, message: res.message ?? 'Email envoyé.' })
      } else {
        setResult({ ok: false, message: res.error })
      }
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Mot de passe oublié
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Entre ton email — on t&apos;envoie un lien pour définir un nouveau mot de passe.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
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

        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" /> Envoyer le lien
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
            {result.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            )}
            <p>{result.message}</p>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center pt-1">
          Un problème ?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-slate-700">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="inline-flex items-center gap-1 font-medium text-slate-900 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Chargement…</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
