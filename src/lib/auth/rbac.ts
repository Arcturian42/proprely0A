import { Permission, Role } from './types'

const ALL_PERMISSIONS: Permission[] = [
  'company:read', 'company:write',
  'lead:read', 'lead:write',
  'opportunity:read', 'opportunity:write', 'opportunity:win',
  'client:read', 'client:write', 'client:delete',
  'site:read', 'site:write',
  'agent:read', 'agent:write',
  'mission:read', 'mission:write', 'mission:assign', 'mission:validate',
  'sop:read', 'sop:write',
  'time:read', 'time:write', 'time:validate', 'time:export',
  'analytics:read',
  'settings:read', 'settings:write',
]

export const PERMISSIONS: Record<Role, ReadonlyArray<Permission>> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter(p => p !== 'company:write'),
  sales: [
    'company:read',
    'lead:read', 'lead:write',
    'opportunity:read', 'opportunity:write', 'opportunity:win',
    'client:read', 'client:write',
    'site:read', 'site:write',
    'agent:read',
    'mission:read',
    'sop:read',
    'analytics:read',
    'settings:read',
  ],
  ops_manager: [
    'company:read',
    'client:read', 'client:write',
    'site:read', 'site:write',
    'agent:read', 'agent:write',
    'mission:read', 'mission:write', 'mission:assign', 'mission:validate',
    'sop:read', 'sop:write',
    'time:read', 'time:write', 'time:validate',
    'analytics:read',
    'settings:read',
  ],
  accountant: [
    'company:read',
    'client:read',
    'mission:read',
    'time:read', 'time:validate', 'time:export',
    'analytics:read',
    'settings:read',
  ],
  agent: [
    'mission:read',
    'sop:read',
    'time:read', 'time:write',
  ],
  viewer: [
    'company:read',
    'lead:read', 'opportunity:read',
    'client:read', 'site:read',
    'agent:read',
    'mission:read', 'sop:read',
    'time:read',
    'analytics:read',
    'settings:read',
  ],
}

export function roleCan(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission)
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  sales: 'Commercial',
  ops_manager: 'Responsable opérations',
  accountant: 'Comptable',
  agent: "Agent d'entretien",
  viewer: 'Lecteur',
}
