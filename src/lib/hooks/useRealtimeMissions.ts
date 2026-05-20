'use client'

import { useEffect, useRef } from 'react'

import { isSupabaseClient } from '@/lib/supabase/client-config'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useCurrentCompanyId } from '@/lib/auth'
import type { Mission } from '@/types'

/**
 * Souscription Supabase Realtime sur la table `missions`. Met à jour le
 * store Zustand quand un autre user (ex. un agent sur mobile) change le
 * statut d'une mission — c'est ce qui permet au manager côté desktop de
 * voir les transitions `prevue → en_cours → a_valider → terminee` en live
 * sans recharger la page (UAT DM-08).
 *
 * Implémentation :
 *  - RLS filtre déjà côté DB par `company_id` (cf. 20260101000002_rls.sql).
 *    On reçoit donc UNIQUEMENT les events de notre tenant. Pas de filtre
 *    supplémentaire nécessaire — mais on garde un check de défense en
 *    profondeur sur `company_id` au cas où.
 *  - On reuse le client Supabase navigateur (singleton géré par @supabase/ssr).
 *  - Le canal est unique par company pour éviter de multiplier les
 *    connexions WebSocket si plusieurs pages montent le hook simultanément
 *    (dashboard + missions-du-jour ouverts dans 2 onglets par exemple).
 *
 * Pas de retour : le hook agit par side-effects sur le store global. Les
 * composants qui le consomment voient simplement leurs sélecteurs Zustand
 * se mettre à jour normalement.
 */
export function useRealtimeMissions() {
  const companyId = useCurrentCompanyId()
  const subscribedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isSupabaseClient()) return
    if (!companyId) return
    if (subscribedRef.current === companyId) return
    subscribedRef.current = companyId

    const supabase = createClient()
    const channel = supabase
      .channel(`missions-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions' },
        (payload) => {
          const next = (payload.new ?? null) as Partial<Mission> | null
          const prev = (payload.old ?? null) as Partial<Mission> | null

          if (payload.eventType === 'DELETE' && prev?.id) {
            useAppStore.setState(s => ({
              missions: s.missions.filter(m => m.id !== prev.id),
            }))
            return
          }

          if (!next?.id) return
          // Garde-fou tenant : RLS filtre déjà côté DB, ceinture + bretelles.
          if (next.company_id && next.company_id !== companyId) return

          useAppStore.setState(s => {
            const exists = s.missions.some(m => m.id === next.id)
            if (exists) {
              return {
                missions: s.missions.map(m =>
                  m.id === next.id ? ({ ...m, ...next } as Mission) : m,
                ),
              }
            }
            // INSERT venu d'un autre client. Les jointures (client, site,
            // agents) ne sont pas dans le payload — on les laisse undefined
            // pour que le prochain refetch les recomplète proprement.
            return {
              missions: [...s.missions, next as Mission],
            }
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      subscribedRef.current = null
    }
  }, [companyId])
}
