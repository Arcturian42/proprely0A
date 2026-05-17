'use client'

import { Building2, ChevronsUpDown, Shield } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ROLE_LABELS,
  useAuthActions,
  useAvailableCompanies,
  useCurrentCompany,
  useCurrentRole,
  type Role,
} from '@/lib/auth'

const DEV_ROLES: Role[] = ['owner', 'admin', 'sales', 'ops_manager', 'accountant', 'agent', 'viewer']

export function CompanySwitcher() {
  if (process.env.NODE_ENV === 'production') return null

  return <DevSwitcher />
}

function DevSwitcher() {
  const company = useCurrentCompany()
  const companies = useAvailableCompanies()
  const role = useCurrentRole()
  const { switchCompany, setRole } = useAuthActions()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-dashed border-amber-400 bg-amber-50 text-[11px] text-amber-900 hover:bg-amber-100">
          <Building2 className="w-3 h-3" />
          <span className="font-medium truncate max-w-[140px]">{company.name}</span>
          <span className="text-amber-600">·</span>
          <span className="text-amber-700">{ROLE_LABELS[role]}</span>
          <ChevronsUpDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px]">
          <Shield className="w-3 h-3" /> Dev — Switch tenant
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={company.id} onValueChange={switchCompany}>
          {companies.map(c => (
            <DropdownMenuRadioItem key={c.id} value={c.id}>
              {c.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px]">
          <Shield className="w-3 h-3" /> Dev — Rôle
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={role} onValueChange={v => setRole(v as Role)}>
          {DEV_ROLES.map(r => (
            <DropdownMenuRadioItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-[10px] text-slate-500">
          Visible uniquement en dev
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
