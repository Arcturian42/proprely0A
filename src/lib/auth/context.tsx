'use client'

import { createContext, useCallback, useMemo, useState } from 'react'
import { AuthState, CurrentUser, Permission, Role, TenantCompany } from './types'
import { DUMMY_COMPANIES, DUMMY_USER } from './dummy'
import { roleCan } from './rbac'

interface AuthContextValue extends AuthState {
  can: (permission: Permission) => boolean
  switchCompany: (companyId: string) => void
  setRole: (role: Role) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: CurrentUser
  initialCompanies?: TenantCompany[]
}

export function AuthProvider({
  children,
  initialUser = DUMMY_USER,
  initialCompanies = DUMMY_COMPANIES,
}: AuthProviderProps) {
  const [user, setUser] = useState<CurrentUser>(initialUser)

  const company = useMemo(
    () => initialCompanies.find(c => c.id === user.company_id) ?? initialCompanies[0],
    [initialCompanies, user.company_id]
  )

  const switchCompany = useCallback((companyId: string) => {
    if (!initialCompanies.some(c => c.id === companyId)) return
    setUser(u => ({ ...u, company_id: companyId }))
  }, [initialCompanies])

  const setRole = useCallback((role: Role) => {
    setUser(u => ({ ...u, role }))
  }, [])

  const can = useCallback((permission: Permission) => roleCan(user.role, permission), [user.role])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    company,
    availableCompanies: initialCompanies,
    isDummy: true,
    can,
    switchCompany,
    setRole,
  }), [user, company, initialCompanies, can, switchCompany, setRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
