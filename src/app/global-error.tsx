'use client'

import { useEffect } from 'react'

// global-error.tsx wraps html + body — it's the only route file that does so.
// Used when the root layout itself fails (e.g. server fault before any
// children render). Keep it minimal and self-contained.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary:', error)
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          background: '#FBFBFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>
            Erreur serveur
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>
            Une erreur critique s&apos;est produite. Notre équipe a été notifiée. Tu peux réessayer ou recharger la page.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                color: '#94a3b8',
                margin: '0 0 16px',
              }}
            >
              Ref : {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
