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
  // BUG-010 — controlled email pour survivre au reset implicite React 19
  // après <form action={fn}>. Sans ça, l'utilisateur ressaisit son email à
  // chaque rate-limit ou erreur réseau.
  const [email, setEmail] = useState('')
  // BUG-013 — `retryAt` est le timestamp UNIX (ms) où le rate-limit serveur
  // libère le compteur. On le décrémente côté client pour afficher une vraie
  // estimation au lieu du texte statique "Réessaie dans quelques minutes".
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Safety net : si on atterrit ici via une redirection du proxy (session expirée)
  // sans passer par le bouton "Se déconnecter", on purge quand même le cache local.
  useEffect(() => {
    useAppStore.persist?.clearStorage?.()
  }, [])

  // Ticking now-clock — only mounted while a retry window is pending, so we
  // don't waste a setInterval on the happy path.
  useEffect(() => {
    if (!retryAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [retryAt])

  const remainingSec = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0
  const isBlocked = remainingSec > 0

  function handleSubmit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await signInWithMagicLink(formData)
      if (res.ok) {
        setResult({ ok: true, message: res.message ?? 'Email envoyé.' })
        setRetryAt(null)
      } else {
        setResult({ ok: false, message: res.error })
        setRetryAt(res.retry_at ?? null)
      }
    })
  }

  function formatRemaining(sec: number): string {
    if (sec >= 60) {
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return s === 0 ? `${m} min` : `${m} min ${s}s`
    }
    return `${sec}s`
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending || isBlocked}
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={pending || isBlocked}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
            </>
          ) : isBlocked ? (
            <>
              <Mail className="w-4 h-4" /> Réessaie dans {formatRemaining(remainingSec)}
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
            role={result.ok ? 'status' : 'alert'}
            aria-live="polite"
          >
            {result.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p>{result.message}</p>
              {!result.ok && isBlocked && (
                <p className="text-[12px] mt-1 text-rose-700">
                  Tu pourras réessayer dans <span className="font-semibold">{formatRemaining(remainingSec)}</span>.
                </p>
              )}
            </div>
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
          <li>Vérifie ta boîte spam / indésirables — l&apos;expéditeur est <code>noreply@proprely.fr</code>.</li>
          <li>Attends 30 à 60 secondes — l&apos;envoi peut être différé.</li>
          <li>Vérifie l&apos;orthographe de ton email — un seul caractère faux et il n&apos;arrive jamais.</li>
          <li>Trop de tentatives en peu de temps ? Le système te bloque 10 minutes — c&apos;est une protection anti-spam.</li>
          <li>Compte désactivé par ton administrateur ? Contacte-le directement pour qu&apos;il te réactive.</li>
        </ul>
      </details>
    </div>
  )
}
