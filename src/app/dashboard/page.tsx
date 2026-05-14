'use client'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockMissions, mockClients, mockAgents, mockOperationalItems } from '@/lib/mock-data'
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

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]
  const todayMissions = mockMissions.filter(m => m.scheduled_date === today)
  const pendingItems = mockOperationalItems.filter(o => o.status === 'a_organiser')
  const issuesMissions = mockMissions.filter(m => m.status === 'probleme_signale')

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Tableau de bord"
          description={`Bonjour ! Voici un résumé de votre activité du ${formatDate(new Date())}`}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Missions aujourd'hui"
            value={todayMissions.length}
            description={`${todayMissions.filter(m => m.status === 'en_cours').length} en cours`}
            icon={Sun}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            title="Clients actifs"
            value={mockClients.filter(c => c.status === 'actif').length}
            description="contrats en cours"
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Agents disponibles"
            value={mockAgents.filter(a => a.status === 'disponible').length}
            description={`sur ${mockAgents.length} agents total`}
            icon={UserCog}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            title="À organiser"
            value={pendingItems.length}
            description="opérations en attente"
            icon={AlertCircle}
            iconBg="bg-red-50"
            iconColor="text-red-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's missions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Missions du jour</CardTitle>
              <Link href="/operations/missions-du-jour">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Voir tout <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayMissions.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">Aucune mission aujourd'hui</p>
              ) : (
                <ul className="space-y-3">
                  {todayMissions.map(mission => (
                    <li key={mission.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {mission.client?.name} – {mission.site?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {mission.start_time} · {mission.planned_hours}h · {mission.agents?.map(a => `${a.first_name}`).join(', ')}
                        </p>
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Opérations à organiser</CardTitle>
              <Link href="/operations/cockpit">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Cockpit <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingItems.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-center justify-center text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm">Tout est organisé !</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {pendingItems.map(item => (
                    <li key={item.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500">
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/commercial/prospection">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Ajouter un lead</span>
                  </Button>
                </Link>
                <Link href="/operations/planning">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Planifier mission</span>
                  </Button>
                </Link>
                <Link href="/rh/agents">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <UserCog className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Nouvel agent</span>
                  </Button>
                </Link>
                <Link href="/commercial/clients-sites">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Nouveau client</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Agents availability */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Disponibilité agents</CardTitle>
              <Link href="/rh/agents">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Gérer <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {mockAgents.map(agent => (
                  <li key={agent.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                        {agent.first_name[0]}{agent.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{agent.first_name} {agent.last_name}</p>
                        <p className="text-xs text-slate-500">{agent.zone}</p>
                      </div>
                    </div>
                    <StatusBadge status={agent.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
