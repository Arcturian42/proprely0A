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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Proprely</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className={sectionIdx > 0 ? 'mt-6' : ''}>
            {section.title && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs py-0 px-1.5">
                          {item.badge}
                        </Badge>
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
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">Admin</p>
            <p className="text-xs text-slate-500 truncate">Proprely</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
