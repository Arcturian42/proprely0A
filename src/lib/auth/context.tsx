'use client'

import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
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
  initialUser,
  initialCompanies,
}: AuthProviderProps) {
  const isReal = Boolean(initialUser && initialCompanies && initialCompanies.length > 0)
  const resolvedInitialUser = initialUser ?? DUMMY_USER
  const resolvedInitialCompanies = initialCompanies && initialCompanies.length > 0
    ? initialCompanies
    : DUMMY_COMPANIES

  const [user, setUser] = useState<CurrentUser>(resolvedInitialUser)

  // After client-side navigation post-login, the root layout server component
  // re-executes and passes the real authenticated user as initialUser. Since
  // useState doesn't re-initialize from props, we sync explicitly here so the
  // sidebar and auth-aware components immediately reflect the real user.
  useEffect(() => {
    if (initialUser && initialUser.id !== user.id) {
      setUser(initialUser)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser?.id])

  const company = useMemo(
    () => resolvedInitialCompanies.find(c => c.id === user.company_id) ?? resolvedInitialCompanies[0],
    [resolvedInitialCompanies, user.company_id]
  )

  const switchCompany = useCallback((companyId: string) => {
    // En mode réel, switcher de compagnie n'a pas de sens (1 user = 1 entreprise).
    // Le CompanySwitcher dev-only se cache de toute façon en prod.
    if (isReal) return
    if (!resolvedInitialCompanies.some(c => c.id === companyId)) return
    setUser(u => ({ ...u, company_id: companyId }))
  }, [resolvedInitialCompanies, isReal])

  const setRole = useCallback((role: Role) => {
    if (isReal) return
    setUser(u => ({ ...u, role }))
  }, [isReal])

  const can = useCallback((permission: Permission) => roleCan(user.role, permission), [user.role])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    company,
    availableCompanies: resolvedInitialCompanies,
    isDummy: !isReal,
    can,
    switchCompany,
    setRole,
  }), [user, company, resolvedInitialCompanies, isReal, can, switchCompany, setRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
