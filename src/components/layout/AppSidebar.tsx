'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { useCurrentUser, useCurrentCompany, useCurrentRole } from '@/lib/auth'
import { roleCan } from '@/lib/auth/rbac'
import type { Permission } from '@/lib/auth/types'
import { useAppStore } from '@/lib/store'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Gauge,
  Calendar,
  Sun,
  BookOpen,
  UserCog,
  Clock,
  BarChart3,
  PieChart,
  Settings,
  Sparkles,
  ChevronUp,
  User,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
  /** Permission required to see this item — undefined = visible to everyone. */
  permission?: Permission
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { label: 'Pipeline commercial', href: '/commercial/pipeline', icon: TrendingUp, permission: 'opportunity:read' },
      { label: 'Clients & Sites', href: '/commercial/clients-sites', icon: Users, permission: 'client:read' },
    ],
  },
  {
    title: 'Opérations terrain',
    items: [
      { label: 'Cockpit opérationnel', href: '/operations/cockpit', icon: Gauge, permission: 'mission:read' },
      { label: 'Planning des missions', href: '/operations/planning', icon: Calendar, permission: 'mission:read' },
      { label: 'Missions du jour', href: '/operations/missions-du-jour', icon: Sun, permission: 'mission:read' },
      { label: 'Protocoles SOP', href: '/operations/sop', icon: BookOpen, permission: 'sop:read' },
    ],
  },
  {
    title: 'Ressources humaines',
    items: [
      { label: "Agents d'entretien", href: '/rh/agents', icon: UserCog, permission: 'agent:read' },
      { label: 'Heures & Paie', href: '/rh/heures-paie', icon: Clock, permission: 'time:read' },
    ],
  },
  {
    title: 'Pilotage rentabilité',
    items: [
      { label: 'Rentabilité client', href: '/rentabilite/rentabilite-client', icon: BarChart3, badge: 'À venir', permission: 'analytics:read' },
      { label: 'Analyse des heures', href: '/rentabilite/analyse-heures', icon: PieChart, badge: 'À venir', permission: 'analytics:read' },
    ],
  },
  {
    title: '',
    items: [
      { label: 'Paramètres', href: '/parametres', icon: Settings, permission: 'settings:read' },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const user = useCurrentUser()
  const company = useCurrentCompany()
  const role = useCurrentRole()
  const initials = (user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Utilisateur'

  // Hide nav items the current role can't access. Hides empty sections too so
  // an "agent" doesn't see a "Ressources humaines" header with nothing under it.
  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(i => !i.permission || roleCan(role, i.permission)),
    }))
    .filter(section => section.items.length > 0)

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-[rgba(0,0,0,0.08)] flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#111] rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-[#111]">Proprely</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {visibleSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className={sectionIdx > 0 ? 'mt-5' : ''}>
            {section.title && (
              <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9b9a97] px-3 mb-1">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors duration-150',
                        isActive
                          ? 'bg-[#EEF2FF] text-[#3B5BDB]'
                          : 'text-[#444] hover:text-[#111] hover:bg-[#f7f6f3]'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#3B5BDB]' : 'text-[#9b9a97]')} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="bg-[#f7f6f3] text-[#9b9a97] text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[rgba(0,0,0,0.08)]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#f7f6f3] transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-[#111] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 uppercase">
                {initials || 'P'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111] truncate">{displayName}</p>
                <p className="text-[11px] text-[#9b9a97] truncate">{company.name}</p>
              </div>
              <ChevronUp className="w-4 h-4 text-[#9b9a97] flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/parametres" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/parametres" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut} className="px-1 py-0.5">
              <button
                type="submit"
                onClick={() => {
                  // Purge le cache Zustand persisté en localStorage pour qu'un user B
                  // qui se connecte sur le même browser ne voie pas les données du user A.
                  // Le form action signOut() s'exécute juste après côté serveur.
                  useAppStore.persist?.clearStorage?.()
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 transition cursor-pointer outline-none"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
