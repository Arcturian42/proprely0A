'use client'

import { useEffect, useState, useTransition } from 'react'
import { signInWithMagicLink } from '@/app/actions/auth'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Safety net : si on atterrit ici via une redirection du proxy (session expirée)
  // sans passer par le bouton "Se déconnecter", on purge quand même le cache local.
  useEffect(() => {
    useAppStore.persist?.clearStorage?.()
  }, [])

  function handleSubmit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await signInWithMagicLink(formData)
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Connexion</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entre ton email — on t&apos;envoie un lien magique pour te connecter sans mot de passe.
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
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" /> Recevoir mon lien de connexion
            </>
          )}
        </Button>

        {result && (
          <div
            className={`flex items-start gap-2 text-sm rounded-md px-3 py-2.5 ${
              result.ok
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
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
          Tu n&apos;as pas reçu l&apos;email ?
        </summary>
        <ul className="mt-2 ml-5 list-disc space-y-1">
          <li>Vérifie ta boîte spam / indésirables (l&apos;expéditeur est <code>noreply@proprely.fr</code> ou <code>onboarding@resend.dev</code>).</li>
          <li>Attends 30 à 60 secondes — l&apos;envoi peut être différé.</li>
          <li>Vérifie l&apos;orthographe de ton email — un seul caractère faux et il n&apos;arrive jamais.</li>
          <li>Trop de tentatives en peu de temps ? Le système te bloque 10 minutes — c&apos;est une protection anti-spam.</li>
          <li>Compte désactivé par ton admin ? Contacte-le pour qu&apos;il te réactive depuis Paramètres → Équipe.</li>
        </ul>
      </details>
    </div>
  )
}
