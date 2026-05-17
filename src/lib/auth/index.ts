export { AuthProvider } from './context'
export {
  useCurrentUser,
  useCurrentCompany,
  useCurrentCompanyId,
  useAvailableCompanies,
  useCan,
  useCurrentRole,
  useAuthActions,
} from './hooks'
export { PERMISSIONS, ROLE_LABELS, roleCan } from './rbac'
export type { Role, Permission, CurrentUser, TenantCompany, AuthState } from './types'
export { DUMMY_COMPANY_1_ID, DUMMY_COMPANY_2_ID } from './dummy'
