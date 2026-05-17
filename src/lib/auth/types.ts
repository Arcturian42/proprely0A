export type Role = 'owner' | 'admin' | 'sales' | 'ops_manager' | 'accountant' | 'agent' | 'viewer'

export type Permission =
  | 'company:read'
  | 'company:write'
  | 'lead:read'
  | 'lead:write'
  | 'opportunity:read'
  | 'opportunity:write'
  | 'opportunity:win'
  | 'client:read'
  | 'client:write'
  | 'client:delete'
  | 'site:read'
  | 'site:write'
  | 'agent:read'
  | 'agent:write'
  | 'mission:read'
  | 'mission:write'
  | 'mission:assign'
  | 'mission:validate'
  | 'sop:read'
  | 'sop:write'
  | 'time:read'
  | 'time:write'
  | 'time:validate'
  | 'time:export'
  | 'analytics:read'
  | 'settings:read'
  | 'settings:write'

export interface TenantCompany {
  id: string
  name: string
}

export interface CurrentUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: Role
  company_id: string
}

export interface AuthState {
  user: CurrentUser
  company: TenantCompany
  availableCompanies: TenantCompany[]
  isDummy: boolean
}
