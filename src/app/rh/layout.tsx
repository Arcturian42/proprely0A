import { requirePagePermission } from '@/lib/auth/page-guard'

// Le sous-arbre /rh contient agents (agent:read) et heures-paie (time:read).
// On garde la garde minimale au niveau de ce layout (agent:read = tous les
// non-agents) ; le nested layout /rh/heures-paie/layout.tsx ajoute le check
// time:read pour bloquer le sales.
export default async function RhLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission('agent:read')
  return <>{children}</>
}
