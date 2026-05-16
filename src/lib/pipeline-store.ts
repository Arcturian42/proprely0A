'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  PipelineLead, PipelineContact, PipelineTask, PipelineNote,
  Quote, PipelineEmail, PipelineCall, PipelineFile, PipelineActivity,
  PipelineStatus,
} from '@/types/pipeline'

// ─── Seed Data ───────────────────────────────────────────────────────────────

const now = new Date().toISOString()
const d = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString()

const seedLeads: PipelineLead[] = [
  {
    id: 'lead-1', company_id: 'company-1', company_name: 'EDF Île-de-France',
    siret: '44276807200016', address: '22 avenue de Wagram, Paris 8e',
    sector: 'Énergie', company_size: '500-1000', annual_revenue: 5000000,
    value_monthly: 4500, value_total: 54000, probability: 70,
    priority: 'chaud', status: 'devis_a_preparer', source: 'referral',
    tags: ['Industriel', 'Urgent'], assigned_to: 'Marie Dupont',
    next_action_date: d(1), next_action_type: 'visite', ai_score: 87,
    lifecycle_stage: 'qualified', created_at: d(-12), updated_at: d(-2),
  },
  {
    id: 'lead-2', company_id: 'company-1', company_name: 'Cabinet Dr. Martin',
    siret: '51234567800012', address: '15 rue de la Paix, Lyon',
    sector: 'Médical', company_size: '1-10', annual_revenue: 800000,
    value_monthly: 1200, value_total: 14400, probability: 55,
    priority: 'tiede', status: 'devis_envoye', source: 'website',
    tags: ['Médical'], assigned_to: 'Paul Moreau',
    next_action_date: d(-2), next_action_type: 'relance', ai_score: 65,
    lifecycle_stage: 'lead', created_at: d(-20), updated_at: d(-5),
  },
  {
    id: 'lead-3', company_id: 'company-1', company_name: 'Résidence Les Pins',
    siret: '78901234500023', address: '5 allée des Pins, Bordeaux',
    sector: 'Immobilier', company_size: '1-10', annual_revenue: 300000,
    value_monthly: 800, value_total: 9600, probability: 30,
    priority: 'froid', status: 'a_qualifier', source: 'manual',
    tags: ['Syndic'], assigned_to: 'Marie Dupont',
    next_action_date: d(5), next_action_type: 'appel', ai_score: 40,
    lifecycle_stage: 'prospect', created_at: d(-5), updated_at: d(-1),
  },
  {
    id: 'lead-4', company_id: 'company-1', company_name: 'StartupTech SAS',
    siret: '89012345600034', address: '1 place de la Bourse, Toulouse',
    sector: 'Tech', company_size: '11-50', annual_revenue: 2000000,
    value_monthly: 2200, value_total: 26400, probability: 80,
    priority: 'chaud', status: 'en_discussion', source: 'ai',
    tags: ['Bureaux', 'Premium'], assigned_to: 'Paul Moreau',
    next_action_date: d(0), next_action_type: 'negociation', ai_score: 92,
    lifecycle_stage: 'qualified', created_at: d(-30), updated_at: d(-1),
  },
  {
    id: 'lead-5', company_id: 'company-1', company_name: 'Mairie de Nantes',
    siret: '21440109800015', address: "2 rue de l'Hotel de Ville, Nantes",
    sector: 'Public', company_size: '500+', annual_revenue: 0,
    value_monthly: 6000, value_total: 72000, probability: 50,
    priority: 'tiede', status: 'nouveau', source: 'manual',
    tags: ['Public', "Appel d'offres"], assigned_to: 'Marie Dupont',
    next_action_date: d(7), ai_score: 55,
    lifecycle_stage: 'prospect', created_at: d(-2), updated_at: d(-2),
  },
]

const seedContacts: PipelineContact[] = [
  { id: 'c-1', lead_id: 'lead-1', company_id: 'company-1', first_name: 'Jean', last_name: 'Berthier', email: 'j.berthier@edf.fr', phone: '06 12 34 56 78', role: 'Responsable Achats', is_primary: true, created_at: now, updated_at: now },
  { id: 'c-2', lead_id: 'lead-1', company_id: 'company-1', first_name: 'Sylvie', last_name: 'Morel', email: 's.morel@edf.fr', phone: '06 98 76 54 32', role: 'DAF', is_primary: false, created_at: now, updated_at: now },
  { id: 'c-3', lead_id: 'lead-1', company_id: 'company-1', first_name: 'Marc', last_name: 'Leclerc', email: 'm.leclerc@edf.fr', phone: '01 23 45 67 89', role: 'DRH', is_primary: false, created_at: now, updated_at: now },
  { id: 'c-4', lead_id: 'lead-2', company_id: 'company-1', first_name: 'Sophie', last_name: 'Martin', email: 'dr.sophie.martin@gmail.com', phone: '06 55 44 33 22', role: 'Praticienne', is_primary: true, created_at: now, updated_at: now },
  { id: 'c-5', lead_id: 'lead-3', company_id: 'company-1', first_name: 'Pierre', last_name: 'Dubois', email: 'p.dubois@syndic-pins.fr', phone: '05 56 78 90 12', role: 'Gestionnaire', is_primary: true, created_at: now, updated_at: now },
  { id: 'c-6', lead_id: 'lead-4', company_id: 'company-1', first_name: 'Lucas', last_name: 'Bernard', email: 'lucas@startuptech.fr', phone: '07 12 34 56 78', role: 'CEO', is_primary: true, created_at: now, updated_at: now },
  { id: 'c-7', lead_id: 'lead-5', company_id: 'company-1', first_name: 'Isabelle', last_name: 'Renard', email: 'i.renard@mairie-nantes.fr', phone: '02 40 41 90 00', role: 'Directrice des Services', is_primary: true, created_at: now, updated_at: now },
]

const seedTasks: PipelineTask[] = [
  { id: 't-1', lead_id: 'lead-1', company_id: 'company-1', title: 'Envoyer proposition tarifaire', due_date: d(-1), status: 'todo', priority: 'high', assigned_to: 'Marie Dupont', created_at: d(-3), updated_at: d(-3) },
  { id: 't-2', lead_id: 'lead-1', company_id: 'company-1', title: 'Préparer visite chantier', due_date: d(2), status: 'todo', priority: 'medium', assigned_to: 'Marie Dupont', created_at: d(-2), updated_at: d(-2) },
  { id: 't-3', lead_id: 'lead-2', company_id: 'company-1', title: 'Relancer pour signature devis', due_date: d(-3), status: 'todo', priority: 'high', assigned_to: 'Paul Moreau', created_at: d(-5), updated_at: d(-5) },
  { id: 't-4', lead_id: 'lead-2', company_id: 'company-1', title: 'Appel de suivi Dr. Martin', due_date: d(3), status: 'done', priority: 'medium', assigned_to: 'Paul Moreau', completed_at: d(-1), created_at: d(-7), updated_at: d(-1) },
  { id: 't-5', lead_id: 'lead-3', company_id: 'company-1', title: 'Qualifier les besoins', due_date: d(4), status: 'todo', priority: 'low', assigned_to: 'Marie Dupont', created_at: d(-1), updated_at: d(-1) },
  { id: 't-6', lead_id: 'lead-4', company_id: 'company-1', title: 'Négocier contrat annuel', due_date: d(1), status: 'todo', priority: 'high', assigned_to: 'Paul Moreau', created_at: d(-2), updated_at: d(-2) },
]

const seedNotes: PipelineNote[] = [
  { id: 'n-1', lead_id: 'lead-1', company_id: 'company-1', content: 'Jean Berthier très intéressé, budget validé par la DAF. Attendent notre proposition avant fin de semaine.', author: 'Marie Dupont', tags: ['Budget', 'Urgent'], created_at: d(-3), updated_at: d(-3) },
  { id: 'n-2', lead_id: 'lead-1', company_id: 'company-1', content: 'Visite des locaux effectuée : 2000 m² bureaux + 500 m² couloirs. Accès badges nécessaire. Intervention souhaitée soir 18h-22h.', author: 'Marie Dupont', tags: ['Visite'], created_at: d(-7), updated_at: d(-7) },
  { id: 'n-3', lead_id: 'lead-2', company_id: 'company-1', content: 'Cabinet médical, normes hygiène strictes. Protocoles DASRI à respecter. Devis envoyé en attente retour.', author: 'Paul Moreau', tags: ['Médical', 'Norme'], created_at: d(-6), updated_at: d(-6) },
  { id: 'n-4', lead_id: 'lead-4', company_id: 'company-1', content: 'Lucas veut signer mais négocie -10% sur le prix. Marge à revoir.', author: 'Paul Moreau', tags: ['Négociation'], created_at: d(-1), updated_at: d(-1) },
]

const seedQuotes: Quote[] = [
  {
    id: 'q-1', lead_id: 'lead-1', company_id: 'company-1', quote_number: 'DEV-2024-001',
    status: 'brouillon',
    line_items: [
      { id: 'li-1', service: 'Nettoyage bureaux — open space', surface: 2000, surface_unit: 'm²', frequency: '5x/semaine', unit_price: 0.45, quantity: 20, total: 1800 },
      { id: 'li-2', service: 'Nettoyage moquette', surface: 500, surface_unit: 'm²', frequency: '2x/mois', unit_price: 0.80, quantity: 2, total: 800 },
    ],
    labor_cost: 1800, products_cost: 200, travel_cost: 100, equipment_cost: 50,
    subtotal_ht: 2600, tva_rate: 20, tva_amount: 520, total_ttc: 3120,
    margin_pct: 33, selling_price: 2600,
    notes: 'Prestation incluant fourniture de produits d\'entretien.',
    valid_until: d(30),
    vocal_input_raw: '2000 mètres carrés bureaux 5 fois par semaine, 500 mètres carrés moquette 2 fois par mois, intervention soir',
    parsed_data: {
      surfaces: [{ type: 'bureaux', area: 2000, unit: 'm²' }, { type: 'moquette', area: 500, unit: 'm²' }],
      service_type: 'Nettoyage bureaux', frequency: '5x/semaine',
      constraints: ['Intervention soir'],
      raw_text: '2000 mètres carrés bureaux 5 fois par semaine, 500 mètres carrés moquette 2 fois par mois, intervention soir',
    },
    created_at: d(-3), updated_at: d(-1),
  },
  {
    id: 'q-2', lead_id: 'lead-2', company_id: 'company-1', quote_number: 'DEV-2024-002',
    status: 'envoye',
    line_items: [
      { id: 'li-3', service: 'Nettoyage médical — salle de soins', surface: 120, surface_unit: 'm²', frequency: '5x/semaine', unit_price: 2.0, quantity: 20, total: 480 },
    ],
    labor_cost: 280, products_cost: 80, travel_cost: 30, equipment_cost: 20,
    subtotal_ht: 480, tva_rate: 20, tva_amount: 96, total_ttc: 576,
    margin_pct: 27, selling_price: 480,
    valid_until: d(15),
    email_sent_at: d(-5),
    created_at: d(-6), updated_at: d(-5),
  },
]

const seedEmails: PipelineEmail[] = [
  { id: 'e-1', lead_id: 'lead-2', company_id: 'company-1', direction: 'sent', to_address: 'dr.sophie.martin@gmail.com', from_address: 'contact@proprely.fr', subject: 'Devis Proprely #DEV-2024-002 — Cabinet Dr. Martin', body: 'Bonjour Dr. Martin, veuillez trouver ci-joint notre proposition...', sent_at: d(-5), status: 'opened', template: 'quote' },
  { id: 'e-2', lead_id: 'lead-1', company_id: 'company-1', direction: 'sent', to_address: 'j.berthier@edf.fr', from_address: 'contact@proprely.fr', subject: 'Suite à notre visite — EDF Île-de-France', body: 'Bonjour Jean, comme convenu lors de notre visite...', sent_at: d(-2), status: 'delivered', template: 'follow_up' },
]

const seedCalls: PipelineCall[] = [
  { id: 'cl-1', lead_id: 'lead-1', company_id: 'company-1', contact_id: 'c-1', direction: 'outbound', duration_seconds: 720, summary: 'Jean confirme le besoin, souhaite un devis détaillé.', outcome: 'qualified', rating: 4, made_by: 'Marie Dupont', made_at: d(-7), created_at: d(-7) },
  { id: 'cl-2', lead_id: 'lead-2', company_id: 'company-1', contact_id: 'c-4', direction: 'outbound', duration_seconds: 180, summary: 'Relance devis — pas de réponse, message vocal laissé.', outcome: 'voicemail', made_by: 'Paul Moreau', made_at: d(-2), created_at: d(-2) },
]

const seedFiles: PipelineFile[] = [
  { id: 'f-1', lead_id: 'lead-1', company_id: 'company-1', name: 'Plan EDF Wagram.pdf', size: 2400000, type: 'application/pdf', url: '#', category: 'company', uploader: 'Marie Dupont', created_at: d(-7) },
  { id: 'f-2', lead_id: 'lead-2', company_id: 'company-1', name: 'Cahier des charges médical.docx', size: 450000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: '#', category: 'contract', uploader: 'Paul Moreau', created_at: d(-6) },
]

const seedActivities: PipelineActivity[] = [
  { id: 'a-1', lead_id: 'lead-1', company_id: 'company-1', type: 'created', content: 'Lead créé depuis recommandation client', author: 'Marie Dupont', created_at: d(-12) },
  { id: 'a-2', lead_id: 'lead-1', company_id: 'company-1', type: 'call', content: 'Appel qualificatif (12 min) — Outcome: Qualifié', author: 'Marie Dupont', related_id: 'cl-1', created_at: d(-7) },
  { id: 'a-3', lead_id: 'lead-1', company_id: 'company-1', type: 'status_change', content: 'Statut changé : À Qualifier → Devis à Préparer', author: 'Marie Dupont', created_at: d(-5) },
  { id: 'a-4', lead_id: 'lead-1', company_id: 'company-1', type: 'quote', content: 'Devis DEV-2024-001 créé (brouillon)', author: 'Marie Dupont', related_id: 'q-1', created_at: d(-3) },
  { id: 'a-5', lead_id: 'lead-2', company_id: 'company-1', type: 'email', content: 'Devis DEV-2024-002 envoyé par email', author: 'Paul Moreau', related_id: 'e-1', created_at: d(-5) },
]

// ─── Store ────────────────────────────────────────────────────────────────────

interface PipelineStore {
  leads: PipelineLead[]
  contacts: PipelineContact[]
  tasks: PipelineTask[]
  notes: PipelineNote[]
  quotes: Quote[]
  emails: PipelineEmail[]
  calls: PipelineCall[]
  files: PipelineFile[]
  activities: PipelineActivity[]

  // Leads
  addLead: (lead: PipelineLead) => void
  updateLead: (id: string, data: Partial<PipelineLead>) => void
  deleteLead: (id: string) => void
  moveLead: (id: string, status: PipelineStatus) => void

  // Contacts
  addContact: (c: PipelineContact) => void
  updateContact: (id: string, data: Partial<PipelineContact>) => void
  deleteContact: (id: string) => void

  // Tasks
  addTask: (t: PipelineTask) => void
  updateTask: (id: string, data: Partial<PipelineTask>) => void
  deleteTask: (id: string) => void
  completeTask: (id: string) => void

  // Notes
  addNote: (n: PipelineNote) => void
  updateNote: (id: string, data: Partial<PipelineNote>) => void
  deleteNote: (id: string) => void

  // Quotes
  addQuote: (q: Quote) => void
  updateQuote: (id: string, data: Partial<Quote>) => void
  deleteQuote: (id: string) => void

  // Emails
  addEmail: (e: PipelineEmail) => void

  // Calls
  addCall: (c: PipelineCall) => void
  updateCall: (id: string, data: Partial<PipelineCall>) => void
  deleteCall: (id: string) => void

  // Files
  addFile: (f: PipelineFile) => void
  deleteFile: (id: string) => void

  // Activities
  addActivity: (a: PipelineActivity) => void
}

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => ({
      leads: seedLeads,
      contacts: seedContacts,
      tasks: seedTasks,
      notes: seedNotes,
      quotes: seedQuotes,
      emails: seedEmails,
      calls: seedCalls,
      files: seedFiles,
      activities: seedActivities,

      addLead: (lead) => set(s => ({ leads: [...s.leads, lead] })),
      updateLead: (id, data) => set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l) })),
      deleteLead: (id) => set(s => ({ leads: s.leads.filter(l => l.id !== id) })),
      moveLead: (id, status) => {
        const prev = get().leads.find(l => l.id === id)
        set(s => ({
          leads: s.leads.map(l => l.id === id ? { ...l, status, updated_at: new Date().toISOString() } : l),
          activities: prev ? [...s.activities, {
            id: `a-${Date.now()}`,
            lead_id: id, company_id: 'company-1',
            type: 'status_change' as const,
            content: `Statut changé → ${status}`,
            author: 'Utilisateur',
            created_at: new Date().toISOString(),
          }] : s.activities,
        }))
      },

      addContact: (c) => set(s => ({ contacts: [...s.contacts, c] })),
      updateContact: (id, data) => set(s => ({ contacts: s.contacts.map(c => c.id === id ? { ...c, ...data } : c) })),
      deleteContact: (id) => set(s => ({ contacts: s.contacts.filter(c => c.id !== id) })),

      addTask: (t) => set(s => ({
        tasks: [...s.tasks, t],
        activities: [...s.activities, { id: `a-${Date.now()}`, lead_id: t.lead_id, company_id: t.company_id, type: 'task' as const, content: `Tâche créée : ${t.title}`, author: t.assigned_to, created_at: new Date().toISOString() }],
      })),
      updateTask: (id, data) => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t) })),
      deleteTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
      completeTask: (id) => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status: 'done' as const, completed_at: new Date().toISOString() } : t) })),

      addNote: (n) => set(s => ({
        notes: [...s.notes, n],
        activities: [...s.activities, { id: `a-${Date.now()}`, lead_id: n.lead_id, company_id: n.company_id, type: 'note' as const, content: n.content.substring(0, 100), author: n.author, created_at: new Date().toISOString() }],
      })),
      updateNote: (id, data) => set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, ...data, updated_at: new Date().toISOString() } : n) })),
      deleteNote: (id) => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),

      addQuote: (q) => set(s => ({
        quotes: [...s.quotes, q],
        activities: [...s.activities, { id: `a-${Date.now()}`, lead_id: q.lead_id, company_id: q.company_id, type: 'quote' as const, content: `Devis ${q.quote_number} créé`, author: 'Utilisateur', related_id: q.id, created_at: new Date().toISOString() }],
      })),
      updateQuote: (id, data) => set(s => ({ quotes: s.quotes.map(q => q.id === id ? { ...q, ...data, updated_at: new Date().toISOString() } : q) })),
      deleteQuote: (id) => set(s => ({ quotes: s.quotes.filter(q => q.id !== id) })),

      addEmail: (e) => set(s => ({
        emails: [...s.emails, e],
        activities: [...s.activities, { id: `a-${Date.now()}`, lead_id: e.lead_id, company_id: e.company_id, type: 'email' as const, content: `Email envoyé : ${e.subject}`, author: 'Utilisateur', related_id: e.id, created_at: new Date().toISOString() }],
      })),

      addCall: (c) => set(s => ({
        calls: [...s.calls, c],
        activities: [...s.activities, { id: `a-${Date.now()}`, lead_id: c.lead_id, company_id: c.company_id, type: 'call' as const, content: `Appel ${c.direction === 'outbound' ? 'sortant' : 'entrant'} — ${c.outcome}`, author: c.made_by, related_id: c.id, created_at: new Date().toISOString() }],
      })),
      updateCall: (id, data) => set(s => ({ calls: s.calls.map(c => c.id === id ? { ...c, ...data } : c) })),
      deleteCall: (id) => set(s => ({ calls: s.calls.filter(c => c.id !== id) })),

      addFile: (f) => set(s => ({
        files: [...s.files, f],
        activities: [...s.activities, { id: `a-${Date.now()}`, lead_id: f.lead_id, company_id: f.company_id, type: 'file' as const, content: `Fichier ajouté : ${f.name}`, author: f.uploader, related_id: f.id, created_at: new Date().toISOString() }],
      })),
      deleteFile: (id) => set(s => ({ files: s.files.filter(f => f.id !== id) })),

      addActivity: (a) => set(s => ({ activities: [...s.activities, a] })),
    }),
    { name: 'proprely-pipeline-store' }
  )
)
