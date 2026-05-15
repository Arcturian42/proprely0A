'use client'

import { useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
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
  const issuesMissions = missions.filter(m => m.status === 'probleme_signale')

  const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date())
  const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 fade-up">
        {/* Greeting */}
        <div>
          <p className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            {dayCapitalized} · {formatDate(new Date())}
          </p>
          <PageHeader
            title="Bonne journée 👋"
            description="Voici un résumé de votre activité opérationnelle."
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="fade-up fade-up-1">
            <StatCard
              title="Missions aujourd'hui"
              value={todayMissions.length}
              description={`${todayMissions.filter(m => m.status === 'en_cours').length} en cours`}
              icon={Sun}
            />
          </div>
          <div className="fade-up fade-up-2">
            <StatCard
              title="Clients actifs"
              value={clients.filter(c => c.status === 'actif').length}
              description="contrats en cours"
              icon={Users}
            />
          </div>
          <div className="fade-up fade-up-3">
            <StatCard
              title="Agents disponibles"
              value={agents.filter(a => a.status === 'disponible').length}
              description={`sur ${agents.length} agents total`}
              icon={UserCog}
            />
          </div>
          <div className="fade-up fade-up-4">
            <StatCard
              title="À organiser"
              value={pendingItems.length}
              description="opérations en attente"
              icon={AlertCircle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's missions */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Missions du jour</CardTitle>
              <Link href="/operations/missions-du-jour">
                <Button variant="ghost" size="sm" className="text-[#6366F1]">
                  Voir tout <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayMissions.length === 0 ? (
                <p className="text-[13px] text-[#94A3B8] py-4 text-center">Aucune mission aujourd'hui</p>
              ) : (
                <ul>
                  {todayMissions.map(mission => (
                    <li key={mission.id} className="flex items-center gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[mission.status] || 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#0F172A] truncate">
                          {mission.client?.name} – {mission.site?.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-[#94A3B8] font-mono">
                            {mission.start_time} · {mission.planned_hours}h
                          </span>
                          {mission.agents?.map(a => (
                            <span key={a.id} className="w-6 h-6 rounded-full bg-[#EEF2FF] text-[#6366F1] text-[10px] flex items-center justify-center font-bold">
                              {a.first_name[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <StatusBadge status={mission.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Pending operations */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Opérations à organiser</CardTitle>
              <Link href="/operations/cockpit">
                <Button variant="ghost" size="sm" className="text-[#6366F1]">
                  Cockpit <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingItems.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-[13px]">Tout est organisé !</p>
                </div>
              ) : (
                <ul>
                  {pendingItems.map(item => (
                    <li key={item.id} className="flex items-center gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#0F172A] truncate">{item.title}</p>
                        <p className="text-[11px] text-[#94A3B8]">
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
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/commercial/prospection">
                  <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-[10px] border border-[#E2E8F0] hover:border-[#6366F1] hover:bg-[#EEF2FF] transition-all cursor-pointer">
                    <TrendingUp className="w-5 h-5 text-[#6366F1]" />
                    <span className="text-[12px] font-medium text-[#475569]">Ajouter un lead</span>
                  </div>
                </Link>
                <Link href="/operations/planning">
                  <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-[10px] border border-[#E2E8F0] hover:border-[#6366F1] hover:bg-[#EEF2FF] transition-all cursor-pointer">
                    <Calendar className="w-5 h-5 text-[#6366F1]" />
                    <span className="text-[12px] font-medium text-[#475569]">Planifier mission</span>
                  </div>
                </Link>
                <Link href="/rh/agents">
                  <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-[10px] border border-[#E2E8F0] hover:border-[#6366F1] hover:bg-[#EEF2FF] transition-all cursor-pointer">
                    <UserCog className="w-5 h-5 text-[#6366F1]" />
                    <span className="text-[12px] font-medium text-[#475569]">Nouvel agent</span>
                  </div>
                </Link>
                <Link href="/commercial/clients-sites">
                  <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-[10px] border border-[#E2E8F0] hover:border-[#6366F1] hover:bg-[#EEF2FF] transition-all cursor-pointer">
                    <Users className="w-5 h-5 text-[#6366F1]" />
                    <span className="text-[12px] font-medium text-[#475569]">Nouveau client</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Agents availability */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Disponibilité agents</CardTitle>
              <Link href="/rh/agents">
                <Button variant="ghost" size="sm" className="text-[#6366F1]">
                  Gérer <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-[13px] text-[#94A3B8] text-center py-4">Aucun agent enregistré</p>
              ) : (
                <ul>
                  {agents.map(agent => (
                    <li key={agent.id} className="flex items-center gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-[#6366F1] font-bold text-[12px] flex items-center justify-center flex-shrink-0">
                        {agent.first_name[0]}{agent.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#0F172A]">{agent.first_name} {agent.last_name}</p>
                        <p className="text-[11px] text-[#94A3B8]">{agent.zone}</p>
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
