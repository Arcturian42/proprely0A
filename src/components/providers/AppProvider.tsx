'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateUserProfile } from '@/lib/supabase/db'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { initializeFromDB, clearStore } = useAppStore()
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
        initialized.current = false
        const msg = err instanceof Error ? err.message : 'Erreur de chargement des données'
        toast.error(`Impossible de charger vos données : ${msg}. Rechargez la page.`)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
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
