'use client'

import { useContext } from 'react'
import { AuthContext } from './context'
import { Permission } from './types'

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

export function useCurrentUser() {
  return useAuth().user
}

export function useCurrentCompany() {
  return useAuth().company
}

export function useCurrentCompanyId() {
  return useAuth().company.id
}

export function useAvailableCompanies() {
  return useAuth().availableCompanies
}

export function useCan(permission: Permission) {
  return useAuth().can(permission)
}

export function useAuthActions() {
  const { switchCompany, setRole } = useAuth()
  return { switchCompany, setRole }
}

export function useCurrentRole() {
  return useAuth().user.role
}
