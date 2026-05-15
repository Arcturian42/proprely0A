'use client'

import { useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import {
  Sun,
  Users,
  UserCog,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_DOT: Record<string, string> = {
  en_cours: 'bg-emerald-400',
  prevue: 'bg-blue-400',
  probleme_signale: 'bg-red-400',
}

export default function DashboardPage() {
  useEffect(() => { document.title = 'Tableau de bord — Proprely' }, [])
  const { missions, clients, agents, operationalItems } = useAppStore()
  const today = new Date().toISOString().split('T')[0]
  const todayMissions = missions.filter(m => m.scheduled_date === today)
  const pendingItems = operationalItems.filter(o => o.status === 'a_organiser')

  const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date())
  const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">Bonjour 👋</p>
            <h1 className="text-2xl font-semibold text-gray-900">{dayCapitalized} · {formatDate(new Date())}</h1>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="delay-1 animate-in">
            <StatCard
              title="Missions aujourd'hui"
              value={todayMissions.length}
              description={`${todayMissions.filter(m => m.status === 'en_cours').length} en cours`}
              icon={Sun}
            />
          </div>
          <div className="delay-2 animate-in">
            <StatCard
              title="Clients actifs"
              value={clients.filter(c => c.status === 'actif').length}
              description="contrats en cours"
              icon={Users}
            />
          </div>
          <div className="delay-3 animate-in">
            <StatCard
              title="Agents disponibles"
              value={agents.filter(a => a.status === 'disponible').length}
              description={`sur ${agents.length} agents total`}
              icon={UserCog}
            />
          </div>
          <div className="delay-4 animate-in">
            <StatCard
              title="À organiser"
              value={pendingItems.length}
              description="opérations en attente"
              icon={AlertCircle}
            />
          </div>
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
    </AdminLayout>
  )
}
