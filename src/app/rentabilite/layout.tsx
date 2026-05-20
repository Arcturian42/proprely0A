import { requirePagePermission } from '@/lib/auth/page-guard'

// Rentabilité analytics (V1 launch — pages cachées de la sidebar pour la
// bêta privée). Permission `analytics:read` requise. Sales l'a, agent non.
export default async function RentabiliteLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission('analytics:read')
  return <>{children}</>
}
