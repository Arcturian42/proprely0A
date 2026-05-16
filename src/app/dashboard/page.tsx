'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  Sun,
  Users,
  UserCog,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Settings,
  BarChart2,
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

const STATUS_DOT: Record<string, string> = {
  en_cours: 'bg-emerald-400',
  prevue: 'bg-blue-400',
  probleme_signale: 'bg-red-400',
}

type KpiId = 'missions' | 'clients' | 'agents' | 'items' | 'revenue' | 'conversion'

const KPI_LABELS: Record<KpiId, string> = {
  missions: "Missions aujourd'hui",
  clients: 'Clients actifs',
  agents: 'Agents disponibles',
  items: 'À organiser',
  revenue: 'CA estimé (gagné)',
  conversion: 'Taux conversion',
}

const ALL_KPI_IDS: KpiId[] = ['missions', 'clients', 'agents', 'items', 'revenue', 'conversion']

export default function DashboardPage() {
  useEffect(() => { document.title = 'Tableau de bord — Proprely' }, [])
  const { missions, clients, agents, operationalItems, opportunities, dashboardKpis, setDashboardKpis } = useAppStore()
  const today = new Date().toISOString().split('T')[0]
  const todayMissions = missions.filter(m => m.scheduled_date === today)
  const pendingItems = operationalItems.filter(o => o.status === 'a_organiser')
  const activeMissionsCount = todayMissions.filter(m => m.status === 'en_cours' || m.status === 'prevue').length
  // Agents busy today based on actual missions (overrides stored status)
  const busyAgentIds = new Set(
    todayMissions
      .filter(m => m.status === 'en_cours' || m.status === 'prevue')
      .flatMap(m => m.agents?.map(a => a.id) ?? [])
  )
  const availableAgentsCount = agents.filter(a => a.status !== 'inactif' && a.status !== 'absent' && !busyAgentIds.has(a.id)).length

  const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date())
  const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)

  // Conversion rate
  const closedOpps = opportunities.filter(o => o.stage === 'gagnee' || o.stage === 'perdue')
  const wonOpps = opportunities.filter(o => o.stage === 'gagnee')
  const conversionRate = closedOpps.length > 0 ? Math.round((wonOpps.length / closedOpps.length) * 100) : 0

  const KPI_CONFIG: Record<KpiId, { title: string; icon: LucideIcon; getValue: () => string | number; desc: string }> = {
    missions: { title: "Missions aujourd'hui", icon: Sun, getValue: () => todayMissions.length, desc: `${activeMissionsCount} active${activeMissionsCount > 1 ? 's' : ''}` },
    clients: { title: 'Clients actifs', icon: Users, getValue: () => clients.filter(c => c.status === 'actif').length, desc: 'contrats en cours' },
    agents: { title: 'Agents disponibles', icon: UserCog, getValue: () => availableAgentsCount, desc: `sur ${agents.length} agents total` },
    items: { title: 'À organiser', icon: AlertCircle, getValue: () => pendingItems.length, desc: 'opérations en attente' },
    revenue: { title: 'CA estimé (gagné)', icon: TrendingUp, getValue: () => formatCurrency(wonOpps.reduce((s, o) => s + (o.estimated_amount || 0), 0)), desc: 'opportunités gagnées' },
    conversion: { title: 'Taux conversion', icon: BarChart2, getValue: () => `${conversionRate}%`, desc: 'opps gagnées/fermées' },
  }

  // Customization dialog
  const [showCustomize, setShowCustomize] = useState(false)
  const [pendingKpis, setPendingKpis] = useState<KpiId[]>(dashboardKpis)

  const handleOpenCustomize = () => {
    setPendingKpis(dashboardKpis)
    setShowCustomize(true)
  }

  const handleToggleKpi = (id: KpiId) => {
    setPendingKpis(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev // enforce minimum 2
        return prev.filter(k => k !== id)
      }
      return [...prev, id]
    })
  }

  const handleSaveKpis = () => {
    setDashboardKpis(pendingKpis)
    setShowCustomize(false)
  }

  const colClass = dashboardKpis.length >= 4
    ? 'grid-cols-2 lg:grid-cols-4'
    : dashboardKpis.length === 3
    ? 'grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-2'

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">Bonjour 👋</p>
            <h1 className="text-2xl font-semibold text-gray-900">{dayCapitalized} · {formatDate(new Date())}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleOpenCustomize} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700">
            <Settings className="w-4 h-4" />
            Personnaliser
          </Button>
        </div>

        {/* KPI Cards */}
        <div className={`grid ${colClass} gap-4`}>
          {dashboardKpis.map((kpiId, i) => {
            const cfg = KPI_CONFIG[kpiId]
            return (
              <div key={kpiId} className={`delay-${i + 1} animate-in`}>
                <StatCard title={cfg.title} value={cfg.getValue()} description={cfg.desc} icon={cfg.icon} />
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's missions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Missions du jour</CardTitle>
              <Link href="/operations/missions-du-jour">
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayMissions.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Aucune mission aujourd'hui</p>
              ) : (
                <ul>
                  {todayMissions.map(mission => (
                    <li key={mission.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[mission.status] || 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {mission.client?.name} – {mission.site?.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {mission.start_time} · {mission.planned_hours}h
                        </p>
                      </div>
                      <div className="flex -space-x-1">
                        {mission.agents?.map(a => (
                          <span key={a.id} className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold border-2 border-white flex items-center justify-center">
                            {a.first_name[0]}
                          </span>
                        ))}
                      </div>
                      <StatusBadge status={mission.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Pending operations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Opérations à organiser</CardTitle>
              <Link href="/operations/cockpit">
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                  Cockpit <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingItems.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm">Tout est organisé !</p>
                </div>
              ) : (
                <ul>
                  {pendingItems.map(item => (
                    <li key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          {item.client?.name} · {item.site?.name}
                        </p>
                      </div>
                      <StatusBadge status={item.priority === 'haute' ? 'a_valider' : 'prevue'} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/commercial/prospection">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <TrendingUp className="w-4 h-4 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Ajouter un lead</span>
                  </div>
                </Link>
                <Link href="/operations/planning">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <Calendar className="w-4 h-4 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Planifier mission</span>
                  </div>
                </Link>
                <Link href="/rh/agents">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <UserCog className="w-4 h-4 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Nouvel agent</span>
                  </div>
                </Link>
                <Link href="/commercial/clients-sites">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <Users className="w-4 h-4 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Nouveau client</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Agents availability */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Disponibilité agents</CardTitle>
              <Link href="/rh/agents">
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                  Gérer <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun agent enregistré</p>
              ) : (
                <ul>
                  {agents.map(agent => (
                    <li key={agent.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {agent.first_name[0]}{agent.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{agent.first_name} {agent.last_name}</p>
                        <p className="text-xs text-gray-500">{agent.zone}</p>
                      </div>
                      <StatusBadge status={agent.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customization dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#0F172A]">Personnaliser les KPIs</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {ALL_KPI_IDS.map(id => {
              const isSelected = pendingKpis.includes(id)
              const isDisabled = isSelected && pendingKpis.length <= 2
              return (
                <label key={id} className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-50 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => handleToggleKpi(id)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{KPI_LABELS[id]}</span>
                </label>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 px-1">Minimum 2 KPIs requis.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCustomize(false)}>Annuler</Button>
            <button
              onClick={handleSaveKpis}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-[8px] transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
