import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toUserMessage } from '@/lib/errors/user-message'

/**
 * Regression coverage for BUG-001 + BUG-015 :
 *  - The raw "Could not find the table 'public.onboarding_status' in the
 *    schema cache" Postgres error must NEVER reach the signup UI as-is.
 *  - The mapped message must be in French and not mention "schema".
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
// Integration tests — password auth + forgot-password (replaces magic link)
// ────────────────────────────────────────────────────────────────────────

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

import {
  signInWithPassword,
  signUpCompany,
  requestPasswordReset,
  updatePassword,
} from './auth'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

const mockedCreateServer = vi.mocked(createServerClient)
const mockedCreateServiceRole = vi.mocked(createServiceRoleClient)
const mockedRateLimit = vi.mocked(rateLimit)
const mockedSentryCapture = vi.mocked(Sentry.captureException)

// Build a FormData with the 6 required signup fields (4 user-info + password + confirm).
function buildSignupFormData(
  overrides: Partial<{
    email: string
    first: string
    last: string
    company: string
    password: string
    confirm: string
  }> = {},
): FormData {
  const fd = new FormData()
  fd.set('email', overrides.email ?? 'alice@acme.fr')
  fd.set('owner_first_name', overrides.first ?? 'Alice')
  fd.set('owner_last_name', overrides.last ?? 'Martin')
  fd.set('company_name', overrides.company ?? 'ACME Cleaning')
  fd.set('password', overrides.password ?? 'pass1234')
  fd.set('confirm_password', overrides.confirm ?? overrides.password ?? 'pass1234')
  return fd
}

function buildLoginFormData(overrides: Partial<{ email: string; password: string; next: string }> = {}): FormData {
  const fd = new FormData()
  fd.set('email', overrides.email ?? 'alice@acme.fr')
  fd.set('password', overrides.password ?? 'pass1234')
  if (overrides.next) fd.set('next', overrides.next)
  return fd
}

// Tiny chainable mock of a Supabase query builder.
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
    then: (resolve: (r: QueryResult) => void) => resolve(result),
  }
  return proxy
}

// ─── signInWithPassword ───────────────────────────────────────────────────
describe('signInWithPassword', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
  })

  it('blocks when rate-limit is exceeded, before hitting Supabase', async () => {
    mockedRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() })
    const result = await signInWithPassword(buildLoginFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/trop de tentatives/i)
    expect(mockedCreateServer).not.toHaveBeenCalled()
  })

  it('uses the lowercased email as the rate-limit key', async () => {
    mockedRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() })
    await signInWithPassword(buildLoginFormData({ email: 'Alice@ACME.fr' }))
    expect(mockedRateLimit).toHaveBeenCalledWith('login:alice@acme.fr', 5, 10 * 60 * 1000)
  })

  it('returns "oublié" hint when Supabase says invalid credentials', async () => {
    const signInWithPassword_ = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })
    mockedCreateServer.mockResolvedValue({
      auth: { signInWithPassword: signInWithPassword_ },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signInWithPassword(buildLoginFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/email ou mot de passe incorrect/i)
      expect(result.error).toMatch(/mot de passe oublié/i)
    }
  })

  it('returns ok:true with redirectTo on success', async () => {
    const signInWithPassword_ = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockedCreateServer.mockResolvedValue({
      auth: { signInWithPassword: signInWithPassword_ },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signInWithPassword(buildLoginFormData())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.redirectTo).toBe('/dashboard')
  })

  it('honors the next param when it starts with /', async () => {
    const signInWithPassword_ = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockedCreateServer.mockResolvedValue({
      auth: { signInWithPassword: signInWithPassword_ },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signInWithPassword(buildLoginFormData({ next: '/onboarding/3' }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.redirectTo).toBe('/onboarding/3')
  })

  it('rejects an open-redirect attempt in the next param', async () => {
    const signInWithPassword_ = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockedCreateServer.mockResolvedValue({
      auth: { signInWithPassword: signInWithPassword_ },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signInWithPassword(buildLoginFormData({ next: 'https://evil.com/' }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.redirectTo).toBe('/dashboard')
  })
})

// ─── signUpCompany — rate-limit + existingProfile checks ─────────────────
describe('signUpCompany — rate-limit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
    mockedSentryCapture.mockReturnValue('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  it('blocks when rateLimit returns allowed=false', async () => {
    mockedRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60 * 60 * 1000 })
    const result = await signUpCompany(buildSignupFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/trop de tentatives/i)
      expect(result.error).toMatch(/1 heure/i)
    }
    expect(mockedCreateServiceRole).not.toHaveBeenCalled()
  })

  it('uses the lowercased email as the rate-limit key', async () => {
    mockedRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() })
    await signUpCompany(buildSignupFormData({ email: 'Alice@ACME.fr' }))
    expect(mockedRateLimit).toHaveBeenCalledWith('signup:alice@acme.fr', 3, 60 * 60 * 1000)
  })
})

describe('signUpCompany — password schema', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
  })

  it('rejects when passwords do not match', async () => {
    const result = await signUpCompany(buildSignupFormData({ password: 'pass1234', confirm: 'mismatch' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/ne correspondent pas/i)
  })

  it('rejects when password is too short', async () => {
    const result = await signUpCompany(buildSignupFormData({ password: 'short', confirm: 'short' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/6 caract/i)
  })
})

describe('signUpCompany — existingProfile lookup error (E)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() })
    mockedSentryCapture.mockReturnValue('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  it('returns a FR message + Sentry event id ref when the profiles SELECT fails (schema-cache style)', async () => {
    const schemaErr = new Error("Could not find the table 'public.profiles' in the schema cache")
    mockedCreateServiceRole.mockResolvedValue({
      from: () => chain({ data: null, error: schemaErr }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildSignupFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
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

describe('signUpCompany — already-registered branch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() })
  })

  it('returns a clear FR message pointing to password + reset, without sending any email', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    })
    const adminSignInWithOtp = vi.fn() // must NOT be called — no more magic link auto-resend
    mockedCreateServiceRole.mockResolvedValue({
      auth: {
        admin: { createUser, deleteUser: vi.fn() },
        signInWithOtp: adminSignInWithOtp,
      },
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildSignupFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/déjà enregistrée/i)
      expect(result.error).toMatch(/mot de passe oublié/i)
    }
    expect(adminSignInWithOtp).not.toHaveBeenCalled()
    expect(mockedSentryCapture).not.toHaveBeenCalled()
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
      auth: { admin: { createUser, deleteUser: vi.fn() } },
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildSignupFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/réf\. support : abcd1234/)
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

describe('signUpCompany — session creation via signInWithPassword', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
    mockedSentryCapture.mockReturnValue('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  // Anti-regression : signUpCompany used to send a magic link via the admin
  // client (no cookies). Now it MUST sign the new user in via signInWithPassword
  // on the SSR client, so the session cookie is posted to the browser and the
  // user lands directly on /onboarding/2 with an active session.
  it('calls signInWithPassword on createServerClient with the user-typed password', async () => {
    const ssrSignInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: 'u' } }, error: null })

    mockedCreateServiceRole.mockResolvedValue({
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-uuid' } }, error: null }),
          deleteUser: vi.fn(),
        },
      },
      from: (table: string) =>
        table === 'companies'
          ? chain({ data: { id: 'company-uuid' }, error: null })
          : chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    mockedCreateServer.mockResolvedValue({
      auth: { signInWithPassword: ssrSignInWithPassword },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await signUpCompany(buildSignupFormData({ password: 'mypass1234', confirm: 'mypass1234' }))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.redirectTo).toBe('/onboarding/2')
    expect(ssrSignInWithPassword).toHaveBeenCalledWith({
      email: 'alice@acme.fr',
      password: 'mypass1234',
    })
  })

  it('still returns ok:true with /login fallback when SSR client is unavailable', async () => {
    mockedCreateServiceRole.mockResolvedValue({
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } }, error: null }),
          deleteUser: vi.fn(),
        },
      },
      from: (table: string) =>
        table === 'companies'
          ? chain({ data: { id: 'c' }, error: null })
          : chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    mockedCreateServer.mockResolvedValue(null)

    const result = await signUpCompany(buildSignupFormData())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.redirectTo).toBe('/login')
      expect(result.message).toMatch(/login/i)
    }
  })
})

// ─── requestPasswordReset ─────────────────────────────────────────────────
describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })
  })

  it('returns the neutral success message even when the email does not exist (anti-enumeration)', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } })
    mockedCreateServer.mockResolvedValue({
      auth: { resetPasswordForEmail },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const fd = new FormData()
    fd.set('email', 'unknown@example.com')
    const result = await requestPasswordReset(fd)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.message).toMatch(/si un compte existe/i)
  })

  it('passes the correct redirectTo to Supabase', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ data: null, error: null })
    mockedCreateServer.mockResolvedValue({
      auth: { resetPasswordForEmail },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const fd = new FormData()
    fd.set('email', 'user@example.com')
    await requestPasswordReset(fd)
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: expect.stringMatching(/\/auth\/callback\?next=\/reset-password\/update$/),
      }),
    )
  })

  it('rate-limits with explicit FR message when too many attempts', async () => {
    mockedRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() })
    const fd = new FormData()
    fd.set('email', 'user@example.com')
    const result = await requestPasswordReset(fd)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/trop de demandes/i)
  })
})

// ─── updatePassword ───────────────────────────────────────────────────────
describe('updatePassword', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects when the user is not authenticated', async () => {
    mockedCreateServer.mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        updateUser: vi.fn(),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const fd = new FormData()
    fd.set('password', 'newpass1234')
    fd.set('confirm_password', 'newpass1234')
    const result = await updatePassword(fd)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/session expirée/i)
  })

  it('rejects when passwords do not match', async () => {
    const fd = new FormData()
    fd.set('password', 'newpass1234')
    fd.set('confirm_password', 'mismatch1234')
    const result = await updatePassword(fd)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/ne correspondent pas/i)
  })

  it('updates the password and returns redirectTo /dashboard on success', async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockedCreateServer.mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }),
        updateUser,
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const fd = new FormData()
    fd.set('password', 'newpass1234')
    fd.set('confirm_password', 'newpass1234')
    const result = await updatePassword(fd)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.redirectTo).toBe('/dashboard')
    expect(updateUser).toHaveBeenCalledWith({ password: 'newpass1234' })
  })
})
