import { requirePagePermission } from '@/lib/auth/page-guard'

// Pipeline + clients/sites : owner, admin, sales OK (tous ont opportunity:read
// et client:read). Agents bloqués par proxy.ts vers /agent/*.
export default async function CommercialLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission('opportunity:read')
  return <>{children}</>
}
