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
  FileText,
  Receipt,
  FolderOpen,
  ScrollText,
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
      { label: 'Devis', href: '/commercial/devis', icon: FileText },
      { label: 'Contrats', href: '/commercial/contrats', icon: ScrollText },
      { label: 'Documents', href: '/commercial/documents', icon: FolderOpen },
    ],
  },
  {
    title: 'Facturation',
    items: [
      { label: 'Factures', href: '/facturation', icon: Receipt },
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
      { label: 'Rentabilité client', href: '/rentabilite/rentabilite-client', icon: BarChart3 },
      { label: 'Analyse des heures', href: '/rentabilite/analyse-heures', icon: PieChart },
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
        {navSections.map((section, sectionIdx) => (
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
              <div className="w-7 h-7 rounded-full bg-[#111] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111] truncate">Admin</p>
                <p className="text-[11px] text-[#9b9a97] truncate">Proprely</p>
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
