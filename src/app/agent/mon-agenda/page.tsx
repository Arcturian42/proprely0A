'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useCurrentUser, useCurrentCompanyId } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Clock, AlertCircle } from 'lucide-react'
import { MISSION_STATUS_LABELS } from '@/lib/constants'

export default function MonAgendaPage() {
  const user = useCurrentUser()
  const companyId = useCurrentCompanyId()
  const { missions, clients, sites, agents } = useAppStore()

  // In dummy mode user.id won't match any agent — show all of company's
  // upcoming missions instead so the UI is not empty. In real mode, link
  // agents.profile_id = profile.id and filter strictly.
  const myAgent = useMemo(
    () => agents.find(a => a.company_id === companyId && (a.email === user.email)),
    [agents, companyId, user.email]
  )

  const myUpcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return missions
      .filter(m => m.company_id === companyId)
      .filter(m => !myAgent || (m as { agent_ids?: string[] }).agent_ids?.includes(myAgent.id))
      .filter(m => new Date(m.scheduled_date) >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .slice(0, 20)
  }, [missions, myAgent, companyId])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Bonjour {user.first_name} 👋
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Voici tes prochaines missions. Bonne journée !
        </p>
      </div>

      {!myAgent && (
        <Card>
          <CardContent className="py-4 flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-slate-700">
              Ton profil n'est pas encore lié à un agent.
              Contacte ton administrateur pour finaliser l'association.
            </p>
          </CardContent>
        </Card>
      )}

      {myUpcoming.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Aucune mission prévue pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myUpcoming.map(m => {
            const client = clients.find(c => c.id === m.client_id)
            const site = sites.find(s => s.id === m.site_id)
            return (
              <Card key={m.id}>
                <CardContent className="py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {client?.name ?? 'Client inconnu'}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
                          {MISSION_STATUS_LABELS[m.status] ?? m.status}
                        </span>
                      </div>
                      {site && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3 h-3" />
                          {site.name}{site.address ? ` — ${site.address}` : ''}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
                        {m.start_time && ` · ${m.start_time}`}
                        {m.planned_hours && ` · ${m.planned_hours}h`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
