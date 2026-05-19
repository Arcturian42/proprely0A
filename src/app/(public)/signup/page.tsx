'use client'

import { useState, useTransition } from 'react'
import { signUpCompany } from '@/app/actions/auth'
import { track } from '@/lib/analytics/posthog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

// BUG-010 — React 19 réinitialise systématiquement les inputs uncontrolled
// après l'exécution d'une form `action={fn}`, même quand l'action a échoué.
// Pour préserver les valeurs après erreur on passe en controlled : le state
// React reste source de vérité et survit au reset implicite. Reset manuel
// uniquement sur succès (compte créé → on attend le magic link).
const EMPTY_FORM = { owner_first_name: '', owner_last_name: '', company_name: '', email: '' }

export default function SignupPage() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function handleSubmit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await signUpCompany(formData)
      if (res.ok) {
        setResult({ ok: true, message: res.message ?? 'Compte créé.' })
        setForm(EMPTY_FORM)
        track('signup_completed', {
          company_name: formData.get('company_name'),
        })
      } else {
        setResult({ ok: false, message: res.error })
        track('signup_failed', { error: res.error })
      }
    })
  }

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

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
              autoComplete="given-name"
              placeholder="Marie"
              value={form.owner_first_name}
              onChange={setField('owner_first_name')}
              disabled={pending || result?.ok}
            />
          </div>
          <div>
            <Label htmlFor="owner_last_name">Nom</Label>
            <Input
              id="owner_last_name"
              name="owner_last_name"
              required
              autoComplete="family-name"
              placeholder="Dupont"
              value={form.owner_last_name}
              onChange={setField('owner_last_name')}
              disabled={pending || result?.ok}
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
            placeholder="Ex: Nettoyage Pro SARL"
            value={form.company_name}
            onChange={setField('company_name')}
            disabled={pending || result?.ok}
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
            value={form.email}
            onChange={setField('email')}
            disabled={pending || result?.ok}
          />
        </div>

        <p className="text-[11px] text-slate-500">
          <span className="text-rose-500">*</span> Champs obligatoires
        </p>

        <Button type="submit" className="w-full gap-2" disabled={pending || result?.ok}>
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
            <div className="flex-1">
              <p>{result.message}</p>
              {result.ok && (
                <p className="text-[12px] text-emerald-800 mt-2">
                  Consulte ta boîte mail (et les indésirables) pour cliquer sur le lien et continuer la configuration de ton espace.
                </p>
              )}
            </div>
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
