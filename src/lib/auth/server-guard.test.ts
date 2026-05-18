import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase server module — server-guard depends on it but we want
// the unit under test (the role/permission gate) without a real DB.
vi.mock('@/lib/supabase/server', () => ({
  isSupabaseConfigured: vi.fn(),
  createServerClient: vi.fn(),
}))

import { requirePermission } from './server-guard'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'

const mockedIsConfigured = vi.mocked(isSupabaseConfigured)
const mockedCreateServer = vi.mocked(createServerClient)

function mockSupabaseClient(opts: {
  user?: { id: string; email?: string } | null
  profile?: { company_id: string; role: string; is_active: boolean } | null
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: opts.profile ?? null, error: null }),
        }),
      }),
    }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('dummy mode', () => {
    it('falls open and returns an owner-like caller', async () => {
      mockedIsConfigured.mockReturnValue(false)
      const result = await requirePermission('agent:write')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.caller.role).toBe('owner')
        expect(result.caller.companyId).toBe('dummy')
      }
    })
  })

  describe('real mode', () => {
    beforeEach(() => {
      mockedIsConfigured.mockReturnValue(true)
    })

    it('refuses when Supabase client is unavailable', async () => {
      mockedCreateServer.mockResolvedValue(null)
      const result = await requirePermission('agent:write')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/indisponible/i)
    })

    it('refuses when no user is logged in', async () => {
      mockedCreateServer.mockResolvedValue(mockSupabaseClient({ user: null }))
      const result = await requirePermission('agent:write')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/authentifi/i)
    })

    it('refuses when the user has no profile row', async () => {
      mockedCreateServer.mockResolvedValue(
        mockSupabaseClient({ user: { id: 'u1' }, profile: null }),
      )
      const result = await requirePermission('agent:write')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/profil/i)
    })

    it('refuses a deactivated profile', async () => {
      mockedCreateServer.mockResolvedValue(
        mockSupabaseClient({
          user: { id: 'u1' },
          profile: { company_id: 'c1', role: 'admin', is_active: false },
        }),
      )
      const result = await requirePermission('agent:write')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/désactivé/i)
    })

    it('refuses when the role lacks the permission', async () => {
      mockedCreateServer.mockResolvedValue(
        mockSupabaseClient({
          user: { id: 'u1' },
          profile: { company_id: 'c1', role: 'agent', is_active: true },
        }),
      )
      // sales/agent can't write agents (only owner/admin can)
      const result = await requirePermission('agent:write')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/permission/i)
    })

    it('grants when role + permission matrix line up', async () => {
      mockedCreateServer.mockResolvedValue(
        mockSupabaseClient({
          user: { id: 'u1', email: 'a@b' },
          profile: { company_id: 'c1', role: 'admin', is_active: true },
        }),
      )
      const result = await requirePermission('agent:write')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.caller.role).toBe('admin')
        expect(result.caller.companyId).toBe('c1')
        expect(result.caller.userId).toBe('u1')
      }
    })

    it('refuses company:write for admin (owner-only)', async () => {
      mockedCreateServer.mockResolvedValue(
        mockSupabaseClient({
          user: { id: 'u1' },
          profile: { company_id: 'c1', role: 'admin', is_active: true },
        }),
      )
      const result = await requirePermission('company:write')
      expect(result.ok).toBe(false)
    })
  })
})
