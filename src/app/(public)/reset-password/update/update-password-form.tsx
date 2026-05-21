'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFrenchValidation } from '@/lib/forms/use-french-validation'
import { updatePassword } from '@/app/actions/auth'

export default function UpdatePasswordForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { onInvalid, onInput } = useFrenchValidation()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await updatePassword(formData)
      if (res.ok) {
        // router.refresh() pour que le proxy revoie la session active avant
        // de naviguer (au cas où updateUser invalide les anciens cookies).
        router.push(res.redirectTo ?? '/dashboard')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Nouveau mot de passe
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Choisis un mot de passe de 6 caractères minimum.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div>
          <Label htmlFor="password">
            Nouveau mot de passe <span className="text-rose-500">*</span>
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
            Confirmer le mot de passe <span className="text-rose-500">*</span>
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

        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Mise à jour…
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" /> Définir le mot de passe
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm rounded-md px-3 py-2.5 bg-rose-50 text-rose-900 border border-rose-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
