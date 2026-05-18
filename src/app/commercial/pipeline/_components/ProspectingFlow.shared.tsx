import type { Opportunity } from '@/types'

import type { ProspectLead } from './ProspectingFlow'

// Convert a swiped-right ProspectLead into a pipeline Opportunity.
// Pure function — moved out of ProspectingFlow.tsx to keep the component
// focused on UX. ProspectLead lives in the main file (its type is part of
// the API contract with /api/prospecting/search) so we import it back.

export function leadToOpportunity(
  lead: ProspectLead,
  companyId: string,
): Opportunity {
  const now = new Date().toISOString()
  return {
    id: `opp-prospect-${lead.siren}-${Date.now()}`,
    company_id: companyId,
    lead_id: null,
    client_id: null,
    site_id: null,
    title: `Prospection — ${lead.name}`,
    prospect_name: lead.name,
    contact_name: null,
    contact_role: null,
    email: null,
    phone: null,
    city: lead.city,
    postal_code: lead.postcode,
    site_address: lead.address,
    client_type: null,
    service_type: null,
    estimated_amount: lead.estimatedMonthlyValue * 12,
    stage: 'ouvert',
    next_action_date: null,
    next_action_type: null,
    next_action_note: null,
    siren: lead.siren,
    siret: lead.siret,
    naf_code: lead.naf,
    legal_form: null,
    company_status: null,
    source: 'sirene_api',
    notes: [
      `Prospect IA · SIREN ${lead.siren}`,
      lead.sector ? `Secteur: ${lead.sector}` : '',
      `Effectif estimé: ${lead.employees}`,
      `Surface estimée: ${lead.estimatedSurface} m²`,
      `Valeur estimée: ${lead.estimatedMonthlyValue} €/mois`,
      `Score IA: ${lead.aiScore}/100 (${lead.confidence})`,
      `Raisons: ${lead.reasons.join(' · ')}`,
    ]
      .filter(Boolean)
      .join('\n'),
    status: 'ouvert',
    converted_to_client: false,
    converted_at: null,
    created_at: now,
    updated_at: now,
  }
}
