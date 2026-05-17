import { useMemo } from 'react'
import { useAppStore, computeDevisTotal } from '@/lib/store'
import { AppNotification } from '@/types'

export function useNotifications(): AppNotification[] {
  const { factures, timeEntries, operationalItems, devis, documents, contrats } = useAppStore()

  return useMemo(() => {
    const notifications: AppNotification[] = []
    const now = new Date()

    // Factures en retard
    factures
      .filter(f => f.status === 'envoyee' && f.due_date && new Date(f.due_date) < now)
      .forEach(f => {
        const { total } = computeDevisTotal(f.lines, f.tva_rate)
        const daysLate = Math.floor((now.getTime() - new Date(f.due_date!).getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          id: `retard-${f.id}`,
          type: 'facture_retard',
          title: 'Facture en retard',
          message: `${f.number} · ${total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} · ${daysLate}j de retard`,
          severity: daysLate > 30 ? 'error' : 'warning',
          link: '/facturation',
          created_at: f.due_date!,
          read: false,
        })
      })

    // TimeEntries à valider
    const pendingValidations = timeEntries.filter(te => te.status === 'a_valider')
    if (pendingValidations.length > 0) {
      notifications.push({
        id: 'validations-pending',
        type: 'validation_requise',
        title: 'Heures à valider',
        message: `${pendingValidations.length} entrée${pendingValidations.length > 1 ? 's' : ''} en attente de validation`,
        severity: 'warning',
        link: '/rh/heures-paie',
        created_at: new Date().toISOString(),
        read: false,
      })
    }

    // Opérations à organiser
    const aOrganiser = operationalItems.filter(o => o.status === 'a_organiser')
    if (aOrganiser.length > 0) {
      notifications.push({
        id: 'a-organiser',
        type: 'a_organiser',
        title: 'Opérations à planifier',
        message: `${aOrganiser.length} opération${aOrganiser.length > 1 ? 's' : ''} en attente d'organisation`,
        severity: 'info',
        link: '/operations/cockpit',
        created_at: new Date().toISOString(),
        read: false,
      })
    }

    // Devis sans réponse depuis >7 jours
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const devisSansReponse = devis.filter(d => d.status === 'envoye' && new Date(d.updated_at) < sevenDaysAgo)
    if (devisSansReponse.length > 0) {
      notifications.push({
        id: 'devis-sans-reponse',
        type: 'devis_sans_reponse',
        title: 'Devis sans réponse',
        message: `${devisSansReponse.length} devis envoyé${devisSansReponse.length > 1 ? 's' : ''} depuis plus de 7 jours`,
        severity: 'warning',
        link: '/commercial/devis',
        created_at: new Date().toISOString(),
        read: false,
      })
    }

    // Documents expirés
    const docsExpires = documents.filter(d => d.status === 'expire' || (d.expiry_date && new Date(d.expiry_date) < now))
    if (docsExpires.length > 0) {
      notifications.push({
        id: 'docs-expires',
        type: 'document_expire',
        title: 'Documents expirés',
        message: `${docsExpires.length} document${docsExpires.length > 1 ? 's' : ''} expiré${docsExpires.length > 1 ? 's' : ''} à renouveler`,
        severity: 'error',
        link: '/commercial/documents',
        created_at: new Date().toISOString(),
        read: false,
      })
    }

    // Contrats expirés
    const contratsExpires = contrats.filter(c =>
      c.status === 'signe' && c.end_date && new Date(c.end_date) < now
    )
    if (contratsExpires.length > 0) {
      notifications.push({
        id: 'contrats-expires',
        type: 'contrat_expire',
        title: 'Contrats arrivés à échéance',
        message: `${contratsExpires.length} contrat${contratsExpires.length > 1 ? 's' : ''} à renouveler`,
        severity: 'warning',
        link: '/commercial/contrats',
        created_at: new Date().toISOString(),
        read: false,
      })
    }

    return notifications.sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 }
      return order[a.severity] - order[b.severity]
    })
  }, [factures, timeEntries, operationalItems, devis, documents, contrats])
}
