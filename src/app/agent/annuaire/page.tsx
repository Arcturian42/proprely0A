'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useCurrentCompanyId } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, MapPin, Sparkles } from 'lucide-react'

export default function AnnuairePage() {
  const companyId = useCurrentCompanyId()
  const { agents } = useAppStore()

  const teammates = useMemo(
    () => agents.filter(a => a.company_id === companyId).sort((a, b) => a.first_name.localeCompare(b.first_name)),
    [agents, companyId]
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Annuaire</h1>
        <p className="text-sm text-slate-600 mt-1">
          Tes collègues. Informations limitées pour respecter la confidentialité.
        </p>
      </div>

      {teammates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-600">
            Aucun collègue à afficher.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teammates.map(a => (
            <Card key={a.id}>
              <CardContent className="py-4 space-y-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {a.first_name} {a.last_name}
                  </p>
                  {a.specialty && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                      {a.specialty}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  {a.phone && (
                    <a href={`tel:${a.phone}`} className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {a.phone}
                    </a>
                  )}
                  {a.zone && (
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {a.zone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 italic">
        Les données financières (rémunération, coûts, paie) et les informations stratégiques (pipeline commercial, devis)
        sont volontairement masquées dans ton espace.
      </p>
    </div>
  )
}
