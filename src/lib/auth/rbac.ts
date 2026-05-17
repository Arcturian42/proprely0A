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
  // Propriétaire : tout. Seul à pouvoir transférer la propriété + gérer billing (plus tard).
  owner: ALL_PERMISSIONS,
  // Administrateur : tout sauf modifier l'entreprise au niveau racine (SIRET, nom, etc.).
  admin: ALL_PERMISSIONS.filter(p => p !== 'company:write'),
  // Commercial : pipeline, devis, contrats, clients, sites. Pas de paie, pas de gestion agents.
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
  // Agent d'entretien : uniquement ses propres missions + ses heures.
  agent: [
    'mission:read',
    'sop:read',
    'time:read', 'time:write',
  ],
}

export function roleCan(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission)
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  sales: 'Commercial',
  agent: "Agent d'entretien",
}
