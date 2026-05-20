import { redirect } from 'next/navigation'

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { roleCan } from '@/lib/auth/rbac'
import type { Permission, Role } from '@/lib/auth/types'

/**
 * Sprint 2 (audit bêta) — guard partagé pour les layouts server-side qui
 * gardent les sous-arbres `/commercial`, `/operations`, `/rh`, `/rentabilite`.
 *
 * Le proxy.ts redirige déjà les agents vers `/agent/*` et les non-auth vers
 * `/login`. Ce guard ajoute une seconde ligne de défense par sous-arbre :
 *  - sales (ex.) n'a pas `time:read` → /rh/heures-paie le bloque
 *  - sales n'a pas `agent:write` mais a `agent:read` → /rh/agents passe
 *
 * Sans Supabase configuré (dummy local), pass-through pour ne pas casser le
 * dev. La prod assert au boot que les vars sont là (cf. lib/supabase/server.ts).
 *
 * À utiliser depuis un layout server component :
 *
 *     export default async function CommercialLayout({ children }) {
 *       await requirePagePermission('opportunity:read')
 *       return <>{children}</>
 *     }
 */
export async function requirePagePermission(permission: Permission): Promise<void> {
  if (!isSupabaseConfigured()) return

  const supabase = await createServerClient()
  if (!supabase) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Pas de session : le proxy.ts aurait dû redirect avant ; on ferme l'angle
    // edge case (cookie corrompu, session expirée pendant le render).
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: Role }>()

  if (!profile) {
    // Profil disparu (cas BUG-002 / signup interrompu). Le server-guard sait
    // recouvrer, mais ici on ne veut pas tirer ce code-path lourd dans un
    // layout — on renvoie sur /login qui gère l'erreur.
    redirect('/login?error=missing_profile')
  }

  // Cas spécial : un agent qui tape une URL admin (le proxy aurait dû le
  // rediriger mais ceinture + bretelles). On le renvoie vers son espace
  // dédié plutôt que /forbidden — meilleur UX.
  if (profile.role === 'agent') {
    redirect('/agent/mon-agenda')
  }

  if (!roleCan(profile.role, permission)) {
    redirect('/forbidden')
  }
}
