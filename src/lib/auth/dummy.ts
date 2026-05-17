import { CurrentUser, TenantCompany } from './types'

// Stable IDs reused by mock-data so seed + UI stay in sync.
// When real Supabase auth lands, these get replaced by auth.uid() / profile.company_id.
export const DUMMY_COMPANY_1_ID = 'company-1'
export const DUMMY_COMPANY_2_ID = 'company-2'

export const DUMMY_COMPANIES: TenantCompany[] = [
  { id: DUMMY_COMPANY_1_ID, name: 'Proprely Nettoyage Pro' },
  { id: DUMMY_COMPANY_2_ID, name: 'ACME Cleaning' },
]

export const DUMMY_USER: CurrentUser = {
  id: 'user-dummy-1',
  email: 'admin@proprely.local',
  first_name: 'Admin',
  last_name: 'Démo',
  role: 'owner',
  company_id: DUMMY_COMPANY_1_ID,
}
