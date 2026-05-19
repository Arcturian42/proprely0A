import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  isSupabaseConfigured: vi.fn(),
  createServerClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

import { ensureProfileForCurrentUser } from './ensure-profile'
import {
  createServerClient,
  createServiceRoleClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'

const mockedIsConfigured = vi.mocked(isSupabaseConfigured)
const mockedCreateServer = vi.mocked(createServerClient)
const mockedCreateServiceRole = vi.mocked(createServiceRoleClient)

// Tiny chainable mock so .from(...).select(...).eq(...).maybeSingle() works.
function chain(result: { data: unknown; error: unknown }) {
  const proxy: Record<string, unknown> = {
    select: () => proxy,
    insert: () => proxy,
    upsert: () => proxy,
    delete: () => proxy,
    eq: () => proxy,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
  }
  return proxy
}

describe('ensureProfileForCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when Supabase isn\'t configured', async () => {
    mockedIsConfigured.mockReturnValue(false)
    await expect(ensureProfileForCurrentUser()).resolves.toBeNull()
  })

  it('returns null when no user is logged in', async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedCreateServer.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    await expect(ensureProfileForCurrentUser()).resolves.toBeNull()
  })

  it('returns the existing profile without bootstrapping when one already exists', async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedCreateServer.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: 'u1', email: 'a@b', user_metadata: {} } },
            error: null,
          }),
      },
      from: () => chain({ data: { company_id: 'c1', role: 'owner' }, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await ensureProfileForCurrentUser()
    expect(result).toEqual({
      userId: 'u1',
      email: 'a@b',
      companyId: 'c1',
      role: 'owner',
    })
    // No service-role bootstrap path needed.
    expect(mockedCreateServiceRole).not.toHaveBeenCalled()
  })

  it('returns null when no profile and no company_name metadata to recover from', async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedCreateServer.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: 'u1', email: 'a@b', user_metadata: {} } },
            error: null,
          }),
      },
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await expect(ensureProfileForCurrentUser()).resolves.toBeNull()
  })

  it('returns null when admin client is unavailable, even with metadata', async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedCreateServer.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: {
              user: {
                id: 'u1',
                email: 'a@b',
                user_metadata: { company_name: 'ACME', first_name: 'A', last_name: 'M' },
              },
            },
            error: null,
          }),
      },
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    mockedCreateServiceRole.mockResolvedValue(null)

    await expect(ensureProfileForCurrentUser()).resolves.toBeNull()
  })

  it('bootstraps company + profile + onboarding when metadata is present', async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedCreateServer.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: {
              user: {
                id: 'u1',
                email: 'owner@acme.fr',
                user_metadata: {
                  company_name: 'ACME Cleaning',
                  first_name: 'Alice',
                  last_name: 'Martin',
                },
              },
            },
            error: null,
          }),
      },
      from: () => chain({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Service-role: existing profile lookup returns null, then companies
    // insert returns the new id, then profile insert + upserts succeed.
    const calls: string[] = []
    mockedCreateServiceRole.mockResolvedValue({
      from: (table: string) => {
        calls.push(table)
        if (table === 'companies') {
          return chain({ data: { id: 'c-new' }, error: null })
        }
        // profiles lookup before insert returns null; insert/upserts succeed.
        return chain({ data: null, error: null })
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await ensureProfileForCurrentUser()
    expect(result).toEqual({
      userId: 'u1',
      email: 'owner@acme.fr',
      companyId: 'c-new',
      role: 'owner',
    })
    expect(calls).toContain('companies')
    expect(calls).toContain('profiles')
    expect(calls).toContain('onboarding_status')
    expect(calls).toContain('company_pricing_settings')
  })
})
