'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { loadFromSupabase, isInitialized } = useAppStore()

  useEffect(() => {
    loadFromSupabase()
  }, [])

  return <>{children}</>
}
