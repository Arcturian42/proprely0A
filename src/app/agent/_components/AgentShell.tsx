'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Briefcase, Users, LogOut } from 'lucide-react'
import { useCurrentUser, useCurrentCompany } from '@/lib/auth'
import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/agent/mon-agenda', label: 'Mon agenda', icon: CalendarDays },
  { href: '/agent/mes-missions', label: 'Mes missions', icon: Briefcase },
  { href: '/agent/annuaire', label: 'Annuaire', icon: Users },
]

export function AgentShell({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser()
  const company = useCurrentCompany()
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      <header className="bg-white border-b border-[rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <Link href="/agent/mon-agenda" className="block">
            <p className="text-base font-semibold tracking-tight text-slate-900 leading-tight">Proprely</p>
            <p className="text-[11px] text-slate-500 leading-tight">{company.name}</p>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-800 leading-tight">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Agent d'entretien</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="p-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <nav className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {NAV.map(item => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 transition',
                  isActive
                    ? 'border-slate-900 text-slate-900 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  )
}
