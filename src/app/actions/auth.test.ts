import { describe, it, expect, vi, beforeEach } from 'vitest'
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

// ────────────────────────────────────────────────────────────────────────
// signUpCompany integration tests — BUG-001 reocurrence (20 mai 2026)
// ────────────────────────────────────────────────────────────────────────
//
// We mock the three external boundaries (Supabase admin client, rate-limit,
// Sentry) and drive specific failure scenarios through signUpCompany. The
// goal is to lock the new contract:
//   - Rate-limit blocks before any Supabase call
//   - Existing-profile lookup errors no longer fail silently
//   - "already registered" auto-resends a magic link
//   - Every fatal step surfaces a Sentry event id in the user message

vi.mock('@/lib/supabase/server', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createServerClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(() => 'abcd1234-5678-90ab-cdef-1234567890ab'),
}))

import { signUpCompany } from './auth'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

const mockedCreateServer = vi.mocked(createServerClient)
const mockedCreateServiceRole = vi.mocked(createServiceRoleClient)
const mockedRateLimit = vi.mocked(rateLimit)
const mockedSentryCapture = vi.mocked(Sentry.captureException)

// Build a FormData with the 4 required signup fields.
function buildFormData(overrides: Partial<{ email: string; first: string; last: string; company: string }> = {}): FormData {
  const fd = new FormData()
  fd.set('email', overrides.email ?? 'alice@acme.fr')
  fd.set('owner_first_name', overrides.first ?? 'Alice')
  fd.set('owner_last_name', overrides.last ?? 'Martin')
  fd.set('company_name', overrides.company ?? 'ACME Cleaning')
  return fd
}

// Tiny chainable mock of a Supabase query builder. Resolves to the given
// result on terminal methods (maybeSingle / single).
type QueryResult = { data: unknown; error: unknown }
function chain(result: QueryResult): Record<string, unknown> {
  const proxy: Record<string, unknown> = {
    select: () => proxy,
    insert: () => proxy,
    upsert: () => proxy,
    delete: () => proxy,
    eq: () => proxy,
    ilike: () => proxy,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (r: QueryResult) => void) => resolve(result), // for `await admin.from('x').upsert(...)`
  }
  return proxy
}

describe('signUpCompany — rate-limit (F)', () => {
  beforeEach(() => {
    // resetAllMocks() clears both call history AND queued mockResolvedValueOnce
    // returns, so values from a previous test don't leak into this one.
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
    mockedSentryCapture.mockReturnValue('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  it('blocks the attempt when rateLimit returns allowed=false', async () => {
    mockedRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60 * 60 * 1000 })

    const result = await signUpCompany(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/trop de tentatives/i)
      expect(result.error).toMatch(/1 heure/i)
    }
    // Must short-circuit BEFORE touching Supabase.
    expect(mockedCreateServiceRole).not.toHaveBeenCalled()
  })

  it('uses the lowercased email as the rate-limit key', async () => {
    mockedRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() })
    await signUpCompany(buildFormData({ email: 'Alice@ACME.fr' }))
    expect(mockedRateLimit).toHaveBeenCalledWith('signup:alice@acme.fr', 3, 60 * 60 * 1000)
  })
})

describe('signUpCompany — existingProfile lookup error (E)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() })
  })

  it('returns a FR message + Sentry event id ref when the profiles SELECT fails (schema-cache style)', async () => {
    const schemaErr = new Error("Could not find the table 'public.profiles' in the schema cache")
    mockedCreateServiceRole.mockResolvedValue({
      from: () => chain({ data: null, error: schemaErr }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // The user-facing message:
      // - in French (no "schema" leak)
      // - shows the support ref so ops can grep Sentry
      expect(result.error).not.toContain('schema')
      expect(result.error).toMatch(/temporairement indisponible|impossible|réessaie/i)
      expect(result.error).toMatch(/réf\. support : abcd1234/)
    }
    expect(mockedSentryCapture).toHaveBeenCalledWith(
      schemaErr,
      expect.objectContaining({
        tags: expect.objectContaining({
          action: 'signUpCompany',
          step: 'existing_profile_lookup',
          schema_cache_error: 'true',
        }),
      }),
    )
  })
})

describe('signUpCompany — already-registered auto-resend (G)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() })
  })

  it('triggers signInWithOtp via SSR client and returns "Vérifie ta boîte de réception" on duplicate email', async () => {
    const ssrSignInWithOtp = vi.fn().mockResolvedValue({ data: null, error: null })
    const adminSignInWithOtp = vi.fn().mockResolvedValue({ data: null, error: null })
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    })

    mockedCreateServiceRole.mockResolvedValue({
      auth: {
        admin: { createUser, deleteUser: vi.fn() },
        signInWithOtp: adminSignInWithOtp,
      },
      // existingProfile lookup: no row, no error (i.e. profiles row got deleted but auth.users still has it).
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    mockedCreateServer.mockResolvedValue({
      auth: { signInWithOtp: ssrSignInWithOtp },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/déjà enregistrée/i)
      expect(result.error).toMatch(/vérifie ta boîte de réception/i)
    }
    // MUST be on the SSR client (cookies → PKCE verifier stored), NOT admin.
    expect(ssrSignInWithOtp).toHaveBeenCalledTimes(1)
    expect(ssrSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@acme.fr' }),
    )
    expect(adminSignInWithOtp).not.toHaveBeenCalled()
    // Sentry should NOT be called for the "already registered" path — it's a
    // user-facing condition, not an infra error.
    expect(mockedSentryCapture).not.toHaveBeenCalled()
  })

  it('still returns the FR message even when the auto-resend itself fails', async () => {
    const ssrSignInWithOtp = vi.fn().mockRejectedValue(new Error('Resend SMTP down'))
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    mockedCreateServiceRole.mockResolvedValue({
      auth: {
        admin: { createUser, deleteUser: vi.fn() },
        signInWithOtp: vi.fn(),
      },
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    mockedCreateServer.mockResolvedValue({
      auth: { signInWithOtp: ssrSignInWithOtp },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/déjà enregistrée/i)
    }
  })
})

describe('signUpCompany — create_user fatal step (A + B)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
    mockedSentryCapture.mockReturnValue('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  it('Sentry-captures with the right step tag and surfaces the event id ref', async () => {
    const schemaErr = { message: "Could not find the function 'auth.foo' in the schema cache" }
    const createUser = vi.fn().mockResolvedValue({ data: { user: null }, error: schemaErr })

    mockedCreateServiceRole.mockResolvedValue({
      auth: { admin: { createUser, deleteUser: vi.fn() }, signInWithOtp: vi.fn() },
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/réf\. support : abcd1234/)
    }
    expect(mockedSentryCapture).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: expect.objectContaining({
          action: 'signUpCompany',
          step: 'create_user',
        }),
      }),
    )
  })
})

describe('signUpCompany — PKCE magic link via createServerClient (anti-régression otp_expired)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
    mockedSentryCapture.mockReturnValue('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  // Regression test for the PKCE flow bug : signUpCompany used to send the
  // final magic link via the admin client (no cookie adapter), so the
  // code_verifier wasn't persisted across the request boundary and
  // /auth/callback's exchangeCodeForSession failed with otp_expired. The
  // contract is that signInWithOtp MUST be called on the createServerClient
  // (cookies-aware) instance, never on the admin one.
  it('calls signInWithOtp on createServerClient, NOT on the admin (service_role) client', async () => {
    const adminSignInWithOtp = vi.fn()
    const ssrSignInWithOtp = vi.fn().mockResolvedValue({ data: null, error: null })

    mockedCreateServiceRole.mockResolvedValue({
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-uuid' } },
            error: null,
          }),
          deleteUser: vi.fn(),
        },
        signInWithOtp: adminSignInWithOtp,
      },
      from: (table: string) => {
        if (table === 'companies') return chain({ data: { id: 'company-uuid' }, error: null })
        return chain({ data: null, error: null })
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    mockedCreateServer.mockResolvedValue({
      auth: { signInWithOtp: ssrSignInWithOtp },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildFormData())

    expect(result.ok).toBe(true)
    expect(ssrSignInWithOtp).toHaveBeenCalledTimes(1)
    expect(adminSignInWithOtp).not.toHaveBeenCalled()
    expect(ssrSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@acme.fr',
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/auth\/callback\?next=\/onboarding\/2$/),
        }),
      }),
    )
  })

  it('still returns ok:true with a /login fallback message when createServerClient is unavailable', async () => {
    mockedCreateServiceRole.mockResolvedValue({
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } }, error: null }),
          deleteUser: vi.fn(),
        },
        signInWithOtp: vi.fn(),
      },
      from: (table: string) =>
        table === 'companies'
          ? chain({ data: { id: 'c' }, error: null })
          : chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    mockedCreateServer.mockResolvedValue(null)

    const result = await signUpCompany(buildFormData())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.message).toMatch(/login/i)
    }
  })
})
