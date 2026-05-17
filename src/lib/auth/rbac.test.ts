import { describe, expect, it } from 'vitest'
import { roleCan, PERMISSIONS, ROLE_LABELS } from './rbac'
import type { Role } from './types'

describe('RBAC matrix', () => {
  describe('owner', () => {
    it('grants every permission', () => {
      // Owner is the only role that should pass company:write (root settings).
      expect(roleCan('owner', 'company:write')).toBe(true)
      expect(roleCan('owner', 'client:delete')).toBe(true)
      expect(roleCan('owner', 'mission:assign')).toBe(true)
      expect(roleCan('owner', 'time:export')).toBe(true)
    })
  })

  describe('admin', () => {
    it('has every owner permission except company:write', () => {
      expect(roleCan('admin', 'company:write')).toBe(false)
      expect(roleCan('admin', 'company:read')).toBe(true)
      expect(roleCan('admin', 'client:delete')).toBe(true)
      expect(roleCan('admin', 'mission:assign')).toBe(true)
    })
  })

  describe('sales', () => {
    it('can manage pipeline, clients, sites — read agents/missions/sops/analytics', () => {
      expect(roleCan('sales', 'opportunity:write')).toBe(true)
      expect(roleCan('sales', 'opportunity:win')).toBe(true)
      expect(roleCan('sales', 'client:write')).toBe(true)
      expect(roleCan('sales', 'site:write')).toBe(true)
      expect(roleCan('sales', 'agent:read')).toBe(true)
      expect(roleCan('sales', 'mission:read')).toBe(true)
      expect(roleCan('sales', 'analytics:read')).toBe(true)
    })

    it('cannot manage agents, missions, time entries, or settings', () => {
      expect(roleCan('sales', 'agent:write')).toBe(false)
      expect(roleCan('sales', 'mission:write')).toBe(false)
      expect(roleCan('sales', 'mission:assign')).toBe(false)
      expect(roleCan('sales', 'time:read')).toBe(false)
      expect(roleCan('sales', 'time:write')).toBe(false)
      expect(roleCan('sales', 'settings:write')).toBe(false)
      expect(roleCan('sales', 'client:delete')).toBe(false)
    })
  })

  describe('agent', () => {
    it('only sees their own missions, SOPs, and time entries', () => {
      expect(roleCan('agent', 'mission:read')).toBe(true)
      expect(roleCan('agent', 'sop:read')).toBe(true)
      expect(roleCan('agent', 'time:read')).toBe(true)
      expect(roleCan('agent', 'time:write')).toBe(true)
    })

    it('cannot see commercial, RH management, analytics, or settings', () => {
      expect(roleCan('agent', 'opportunity:read')).toBe(false)
      expect(roleCan('agent', 'lead:read')).toBe(false)
      expect(roleCan('agent', 'client:read')).toBe(false)
      expect(roleCan('agent', 'agent:read')).toBe(false)
      expect(roleCan('agent', 'mission:write')).toBe(false)
      expect(roleCan('agent', 'mission:assign')).toBe(false)
      expect(roleCan('agent', 'time:export')).toBe(false)
      expect(roleCan('agent', 'analytics:read')).toBe(false)
      expect(roleCan('agent', 'settings:read')).toBe(false)
    })
  })

  describe('seat budget guarantees', () => {
    it('exposes a label for every role', () => {
      const roles: Role[] = ['owner', 'admin', 'sales', 'agent']
      for (const role of roles) {
        expect(ROLE_LABELS[role]).toBeTruthy()
        expect(PERMISSIONS[role].length).toBeGreaterThan(0)
      }
    })

    it('admin is a strict subset of owner', () => {
      const ownerSet = new Set<string>(PERMISSIONS.owner)
      for (const p of PERMISSIONS.admin) {
        expect(ownerSet.has(p)).toBe(true)
      }
    })

    it('agent permissions are a strict subset of admin', () => {
      const adminSet = new Set<string>(PERMISSIONS.admin)
      for (const p of PERMISSIONS.agent) {
        expect(adminSet.has(p)).toBe(true)
      }
    })
  })
})
