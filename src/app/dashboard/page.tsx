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
  Receipt,
  FileText,
  Euro,
} from 'lucide-react'
import Link from 'next/link'
import { computeDevisTotal } from '@/lib/store'

export default function DashboardPage() {
  useEffect(() => { document.title = 'Tableau de bord — Proprely' }, [])
  const { missions, clients, agents, operationalItems, devis, factures } = useAppStore()
  const today = new Date().toISOString().split('T')[0]
  const todayMissions = missions.filter(m => m.scheduled_date === today)
  const pendingItems = operationalItems.filter(o => o.status === 'a_organiser')
  const issuesMissions = missions.filter(m => m.status === 'probleme_signale')

  const devisEnAttente = devis.filter(d => d.status === 'envoye').length
  const facturesAEncaisser = factures
    .filter(f => f.status === 'envoyee' || f.status === 'retard')
    .reduce((sum, f) => { const { total } = computeDevisTotal(f.lines, f.tva_rate); return sum + total }, 0)
  const facturesEnRetard = factures.filter(f => f.status === 'envoyee' && f.due_date && new Date(f.due_date) < new Date()).length

  return (
    <AdminLayout>
      <div className="p-8 animate-fade-up">
        <PageHeader
          title="Tableau de bord"
          description={`Bonjour ! Voici un résumé de votre activité du ${formatDate(new Date())}`}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="animate-fade-up animate-fade-up-1">
            <StatCard
              title="Missions aujourd'hui"
              value={todayMissions.length}
              description={`${todayMissions.filter(m => m.status === 'en_cours').length} en cours`}
              icon={Sun}
            />
          </div>
          <div className="animate-fade-up animate-fade-up-2">
            <StatCard
              title="Clients actifs"
              value={clients.filter(c => c.status === 'actif').length}
              description="contrats en cours"
              icon={Users}
            />
          </div>
          <div className="animate-fade-up animate-fade-up-3">
            <StatCard
              title="Agents disponibles"
              value={agents.filter(a => a.status === 'disponible').length}
              description={`sur ${agents.length} agents total`}
              icon={UserCog}
            />
          </div>
          <div className="animate-fade-up animate-fade-up-4">
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
              <CardTitle className="text-base">Missions du jour</CardTitle>
              <Link href="/operations/missions-du-jour">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Voir tout <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayMissions.length === 0 ? (
                <p className="text-[13px] text-[#787774] py-4 text-center">Aucune mission aujourd'hui</p>
              ) : (
                <ul className="space-y-3">
                  {todayMissions.map(mission => (
                    <li key={mission.id} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">
                          {mission.client?.name} – {mission.site?.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-[#787774]">
                            {mission.start_time} · {mission.planned_hours}h
                          </p>
                          {mission.agents?.map(a => (
                            <span key={a.id} className="w-6 h-6 rounded-full bg-[#EEF2FF] text-[#3B5BDB] text-[10px] flex items-center justify-center font-medium">
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
                    <li key={item.id} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">{item.title}</p>
                        <p className="text-[11px] text-[#787774]">
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

          {/* Financial summary */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Situation financière</CardTitle>
              <Link href="/facturation">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Factures <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#111]">Devis en attente</p>
                      <p className="text-[11px] text-[#787774]">En cours de réponse</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{devisEnAttente}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                      <Euro className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#111]">À encaisser</p>
                      <p className="text-[11px] text-[#787774]">Factures envoyées</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {facturesAEncaisser.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </span>
                </div>
                {facturesEnRetard > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-red-700">Factures en retard</p>
                        <p className="text-[11px] text-[#787774]">Relance nécessaire</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-600">{facturesEnRetard}</span>
                  </div>
                )}
                {facturesEnRetard === 0 && (
                  <div className="flex items-center gap-2 py-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-sm">Aucune facture en retard</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/commercial/prospection">
                  <Button variant="outline" className="w-full justify-start gap-2 h-10">
                    <TrendingUp className="w-4 h-4" />
                    <span>Ajouter un lead</span>
                  </Button>
                </Link>
                <Link href="/operations/planning">
                  <Button variant="outline" className="w-full justify-start gap-2 h-10">
                    <Calendar className="w-4 h-4" />
                    <span>Planifier mission</span>
                  </Button>
                </Link>
                <Link href="/commercial/devis">
                  <Button variant="outline" className="w-full justify-start gap-2 h-10">
                    <FileText className="w-4 h-4" />
                    <span>Nouveau devis</span>
                  </Button>
                </Link>
                <Link href="/facturation">
                  <Button variant="outline" className="w-full justify-start gap-2 h-10">
                    <Receipt className="w-4 h-4" />
                    <span>Nouvelle facture</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Agents availability */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Disponibilité agents</CardTitle>
              <Link href="/rh/agents">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Gérer <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-[13px] text-[#787774] text-center py-4">Aucun agent enregistré</p>
              ) : (
                <ul className="space-y-3">
                  {agents.map(agent => (
                    <li key={agent.id} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#3B5BDB] font-medium text-[10px]">
                          {agent.first_name[0]}{agent.last_name[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#111]">{agent.first_name} {agent.last_name}</p>
                          <p className="text-[11px] text-[#787774]">{agent.zone}</p>
                        </div>
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
