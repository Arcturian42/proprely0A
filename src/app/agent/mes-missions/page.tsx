'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useCurrentUser, useCurrentCompanyId } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Briefcase } from 'lucide-react'
import { MISSION_STATUS_LABELS } from '@/lib/constants'

export default function MesMissionsPage() {
  const user = useCurrentUser()
  const companyId = useCurrentCompanyId()
  const { missions, clients, sites, agents } = useAppStore()

  const myAgent = useMemo(
    () => agents.find(a => a.company_id === companyId && a.email === user.email),
    [agents, companyId, user.email]
  )

  const myMissions = useMemo(() => {
    return missions
      .filter(m => m.company_id === companyId)
      .filter(m => !myAgent || (m as { agent_ids?: string[] }).agent_ids?.includes(myAgent.id))
      .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
  }, [missions, myAgent, companyId])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mes missions</h1>
        <p className="text-sm text-slate-600 mt-1">
          Toutes tes missions, passées et à venir.
        </p>
      </div>

      {myMissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Aucune mission pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Heures</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myMissions.map(m => {
                const client = clients.find(c => c.id === m.client_id)
                const site = sites.find(s => s.id === m.site_id)
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">
                      {new Date(m.scheduled_date).toLocaleDateString('fr-FR')}
                      {m.start_time && <span className="text-slate-500"> · {m.start_time}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{client?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{site?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{m.planned_hours ? `${m.planned_hours}h` : '—'}</TableCell>
                    <TableCell>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {MISSION_STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
