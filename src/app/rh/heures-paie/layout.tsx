import { requirePagePermission } from '@/lib/auth/page-guard'

// Heures & Paie expose des données financières (taux horaires, ajustements
// paie). Sales a `agent:read` mais PAS `time:read` — l'item est masqué dans
// la sidebar (AppSidebar.tsx), mais un URL direct doit aussi être refusé.
export default async function HeuresPaieLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission('time:read')
  return <>{children}</>
}
