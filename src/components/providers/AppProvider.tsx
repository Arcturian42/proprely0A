'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateUserProfile } from '@/lib/supabase/db'
import { useAppStore } from '@/lib/store'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { initializeFromDB, clearStore, companyId } = useAppStore()
  const initialized = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    const initUser = async (userId: string, companyName?: string) => {
      if (initialized.current) return
      initialized.current = true
      try {
        const profile = await getOrCreateUserProfile(userId, companyName)
        await initializeFromDB(profile.company_id, {
          name: profile.company?.name ?? '',
          email: profile.company?.email ?? '',
          phone: profile.company?.phone ?? '',
          address: profile.company?.address ?? '',
        })
      } catch (err) {
        console.error('[AppProvider] init error:', err)
      }
    }

    // Initialize on mount if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        initUser(user.id, user.user_metadata?.company_name)
      }
    })

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        initialized.current = false
        initUser(session.user.id, session.user.user_metadata?.company_name)
      }
      if (event === 'SIGNED_OUT') {
        initialized.current = false
        clearStore()
        router.push('/login')
      }
    })

    return () => { subscription.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
