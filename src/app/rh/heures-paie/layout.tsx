import { redirect } from 'next/navigation'

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { roleCan } from '@/lib/auth/rbac'
import type { Role } from '@/lib/auth/types'

// Heures & Paie expose des données financières (taux horaires, ajustements
// paie). Sales a `agent:read` mais PAS `time:read` — l'item est masqué dans
// la sidebar (AppSidebar.tsx), mais un URL direct doit aussi être refusé.
// Le proxy gate déjà les agents ; ici on bloque les rôles à droits partiels.
export default async function HeuresPaieLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) {
    const supabase = await createServerClient()
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) redirect('/login?next=/rh/heures-paie')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: Role }>()

      if (!profile || !roleCan(profile.role, 'time:read')) {
        redirect('/forbidden')
      }
    }
  }

  return <>{children}</>
}
