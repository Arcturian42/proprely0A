import { requirePagePermission } from '@/lib/auth/page-guard'

// Cockpit + planning + missions-du-jour + SOP : owner, admin, sales OK
// (mission:read). L'écriture (assigner, valider) est gardée plus bas par le
// `Can` component et par requirePermission dans les server actions.
export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission('mission:read')
  return <>{children}</>
}
