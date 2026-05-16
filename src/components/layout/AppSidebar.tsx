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
    <aside className="w-60 flex flex-col bg-[#111827] h-screen">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[15px] font-semibold text-white tracking-tight">Proprely</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (
              <p className="text-[10px] font-semibold text-[#4B5563] uppercase tracking-widest px-2 mt-4 mb-1">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              if (item.badge) {
                return (
                  <span
                    key={item.href}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium opacity-40 cursor-not-allowed select-none"
                    title="Bientôt disponible"
                  >
                    <Icon className="w-[17px] h-[17px] flex-shrink-0 text-[#9CA3AF]" />
                    <span className="flex-1 truncate text-[#9CA3AF]">{item.label}</span>
                    <span className="ml-auto text-[10px] bg-white/5 text-[#6B7280] px-1.5 py-0.5 rounded-md font-medium">{item.badge}</span>
                  </span>
                )
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className={cn('w-[17px] h-[17px] flex-shrink-0', isActive ? 'text-white' : '')} />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">Admin</p>
                <p className="text-[11px] text-[#6B7280] truncate">Proprely</p>
              </div>
              <ChevronUp className="w-4 h-4 text-[#4B5563] flex-shrink-0" />
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
