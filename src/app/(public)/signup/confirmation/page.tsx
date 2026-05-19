'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Mail, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resendSignupLink } from '@/app/actions/auth'
import { SUPPORT_EMAIL } from '@/lib/constants'

function ConfirmationContent() {
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const [pending, startTransition] = useTransition()
  const [resend, setResend] = useState<{ ok: boolean; message: string } | null>(null)

  function handleResend() {
    if (!email) return
    setResend(null)
    startTransition(async () => {
      const res = await resendSignupLink(email)
      if (res.ok) {
        setResend({ ok: true, message: 'Lien renvoyé. Consulte ta boîte mail.' })
      } else {
        setResend({ ok: false, message: res.error })
      }
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-4">
          <Mail className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Vérifie ta boîte mail
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {email ? (
            <>
              Un lien de connexion a été envoyé à{' '}
              <span className="font-medium text-slate-900">{email}</span>.
            </>
          ) : (
            'Un lien de connexion vient de t\'être envoyé par email.'
          )}{' '}
          Clique dessus pour terminer la création de ton espace Proprely.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-2 text-sm rounded-md px-3 py-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Compte créé. L&apos;email peut prendre 30 à 60 secondes à arriver.</p>
        </div>

        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700">
            Tu n&apos;as pas reçu l&apos;email ?
          </summary>
          <ul className="mt-2 ml-5 list-disc space-y-1">
            <li>
              Vérifie ta boîte spam / indésirables (expéditeur{' '}
              <code>noreply@proprely.fr</code> ou <code>onboarding@resend.dev</code>).
            </li>
            <li>Vérifie l&apos;orthographe de l&apos;adresse email saisie.</li>
            <li>
              Toujours rien après 5 minutes ?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={pending || !email}
                className="text-slate-900 underline disabled:opacity-50"
              >
                Renvoie un lien
              </button>
              .
            </li>
          </ul>
        </details>

        {email && (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleResend}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" /> Renvoyer le lien
              </>
            )}
          </Button>
        )}

        {resend && (
          <div
            className={`flex items-start gap-2 text-sm rounded-md px-3 py-2.5 ${
              resend.ok
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {resend.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <p>{resend.message}</p>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center pt-1">
          Un problème ?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-slate-700">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="inline-flex items-center gap-1 font-medium text-slate-900 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
        </Link>
      </p>
    </div>
  )
}

export default function SignupConfirmationPage() {
  // useSearchParams() requires a Suspense boundary in Next 15+ App Router.
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Chargement…</div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
