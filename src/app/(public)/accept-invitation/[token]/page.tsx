'use client'

import { use, useState, useTransition } from 'react'
import { acceptInvitation } from '@/app/actions/invitations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function handleSubmit(formData: FormData) {
    setResult(null)
    formData.set('token', token)
    startTransition(async () => {
      const res = await acceptInvitation(formData)
      if (res.ok) {
        setResult({ ok: true, message: res.message ?? 'Invitation acceptée.' })
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        setResult({ ok: false, message: res.error })
      }
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Rejoindre l'équipe</h1>
        <p className="mt-2 text-sm text-slate-600">
          Complète ton profil pour finaliser la création de ton compte.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first_name">Prénom</Label>
            <Input
              id="first_name"
              name="first_name"
              required
              autoComplete="given-name"
              placeholder="Marie"
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="last_name">Nom</Label>
            <Input
              id="last_name"
              name="last_name"
              required
              autoComplete="family-name"
              placeholder="Dupont"
              disabled={pending}
            />
          </div>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Activation en cours…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Accepter l'invitation
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

      <p className="mt-6 text-center text-[11px] text-slate-500">
        Si tu n'es pas la bonne personne, ignore simplement cet email — l'invitation expire automatiquement dans 7 jours.
      </p>
    </div>
  )
}
