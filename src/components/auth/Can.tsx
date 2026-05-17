'use client'

import { Permission, useCan } from '@/lib/auth'

interface CanProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = useCan(permission)
  return <>{allowed ? children : fallback}</>
}
