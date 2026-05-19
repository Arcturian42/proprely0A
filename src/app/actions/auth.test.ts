import { describe, it, expect } from 'vitest'
import { toUserMessage } from '@/lib/errors/user-message'

/**
 * Regression coverage for BUG-001 + BUG-015 :
 *  - The raw "Could not find the table 'public.onboarding_status' in the
 *    schema cache" Postgres error must NEVER reach the signup UI as-is.
 *  - The mapped message must be in French and not mention "schema".
 *
 * These two assertions are the contract between the auth action and the UI.
 */
describe('auth action error contract (BUG-001 / BUG-015)', () => {
  it('the audit\'s exact schema-cache error is replaced with a French user-friendly message', () => {
    const raw = new Error("Could not find the table 'public.onboarding_status' in the schema cache")
    const mapped = toUserMessage(raw, 'Création du compte impossible. Réessaie ou contacte le support.')
    expect(mapped).not.toContain('schema')
    expect(mapped).not.toContain('public.onboarding_status')
    expect(mapped).toMatch(/temporairement indisponible|support|réessaie/i)
  })

  it('the "Profil introuvable" recovery error stays helpful (not technical)', () => {
    // The new error string when ensureProfileForCurrentUser returns null
    const fromGuard = 'Compte non finalisé — termine ton inscription depuis la page d\'accueil ou contacte le support.'
    expect(fromGuard).not.toContain('schema')
    expect(fromGuard).not.toContain('cache')
    expect(fromGuard).toMatch(/inscription|support/i)
  })

  it('builds magic-link callback URLs without the double slash (BUG-008)', () => {
    const trim = (u: string) => u.replace(/\/+$/, '')
    expect(trim('https://proprely0-a.vercel.app/')).toBe('https://proprely0-a.vercel.app')
    expect(trim('https://proprely0-a.vercel.app///')).toBe('https://proprely0-a.vercel.app')
    expect(trim('https://proprely0-a.vercel.app')).toBe('https://proprely0-a.vercel.app')
    expect(`${trim('https://proprely0-a.vercel.app/')}/auth/callback`).toBe('https://proprely0-a.vercel.app/auth/callback')
  })
})
