'use client'

import { useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

/**
 * Sentry verification page — protected by obscurity (not linked from the UI).
 * Visit /sentry-example-page after setting NEXT_PUBLIC_SENTRY_DSN to confirm
 * the client + server integration capture issues correctly.
 *
 * The wizard creates this page by convention so you can test from anywhere
 * (Vercel preview, local dev) without writing any code.
 */
export default function SentryExamplePage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function throwClientError() {
    throw new Error('Sentry test — client error from /sentry-example-page')
  }

  async function throwServerError() {
    setStatus('sending')
    try {
      const res = await fetch('/sentry-example-page/api')
      if (!res.ok) {
        // Surface the server error to Sentry's onRequestError + show user feedback.
        const data = await res.json().catch(() => ({ error: 'unknown' }))
        throw new Error(`Server returned ${res.status}: ${data.error}`)
      }
    } catch (err) {
      Sentry.captureException(err)
    } finally {
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Sentry verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Clique sur les boutons ci-dessous pour déclencher une erreur de test —
            elle devrait apparaître dans <code className="text-xs bg-slate-100 px-1 rounded">sentry.io → Issues</code> en quelques secondes.
          </p>
          <p className="text-xs text-slate-400">
            Cette page n&apos;est pas liée dans la navigation. Tu peux la supprimer
            une fois Sentry validé.
          </p>

          <div className="flex flex-col gap-2">
            <Button onClick={throwClientError} variant="destructive" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Throw client-side error
            </Button>

            <Button onClick={throwServerError} variant="outline" disabled={status === 'sending'} className="gap-2">
              {status === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === 'sent' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {status === 'idle' && <AlertTriangle className="w-4 h-4" />}
              Throw server-side error
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
