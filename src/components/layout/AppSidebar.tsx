'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Search,
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
      { label: 'Pipeline commercial', href: '/commercial/pipeline', icon: TrendingUp },
      { label: 'Prospection IA', href: '/commercial/prospection', icon: Search },
      { label: 'Clients & Sites', href: '/commercial/clients-sites', icon: Users },
    ],
  },
  {
    title: 'Opérations terrain',
    items: [
      { label: 'Cockpit opérationnel', href: '/operations/cockpit', icon: Gauge },
      { label: 'Planning des missions', href: '/operations/planning', icon: Calendar },
      { label: 'Missions du jour', href: '/operations/missions-du-jour', icon: Sun },
      { label: 'Protocoles SOP', href: '/operations/sop', icon: BookOpen },
    ],
  },
  {
    title: 'Ressources humaines',
    items: [
      { label: "Agents d'entretien", href: '/rh/agents', icon: UserCog },
      { label: 'Heures & Paie', href: '/rh/heures-paie', icon: Clock },
    ],
  },
  {
    title: 'Pilotage rentabilité',
    items: [
      { label: 'Rentabilité client', href: '/rentabilite/rentabilite-client', icon: BarChart3, badge: 'À venir' },
      { label: 'Analyse des heures', href: '/rentabilite/analyse-heures', icon: PieChart, badge: 'À venir' },
    ],
  },
  {
    title: '',
    items: [
      { label: 'Paramètres', href: '/parametres', icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-[#E2E8F0] flex flex-col">
      {/* Logo */}
      <div className="h-[60px] flex items-center px-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-[#0F172A] tracking-tight">Proprely</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest px-3 mb-1.5 mt-5">
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
                        'flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150',
                        isActive
                          ? 'bg-[#EEF2FF] text-[#6366F1]'
                          : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                      )}
                    >
                      <Icon className={cn('w-[17px] h-[17px] flex-shrink-0', isActive ? 'text-[#6366F1]' : '')} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] bg-[#F1F5F9] text-[#94A3B8] px-1.5 py-0.5 rounded-full">
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
      <div className="border-t border-[#E2E8F0] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] hover:bg-[#F8FAFC] transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#6366F1] text-[11px] font-bold flex-shrink-0">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#0F172A] truncate">Admin</p>
                <p className="text-[11px] text-[#94A3B8] truncate">Proprely</p>
              </div>
              <ChevronUp className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
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
            <DropdownMenuItem className="text-red-600 flex items-center gap-2 cursor-pointer" onClick={() => {
              window.location.href = '/'
            }}>
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
