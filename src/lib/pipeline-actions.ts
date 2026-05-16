'use client'

// Pipeline actions that wrap store operations
// In production these would be Next.js Server Actions using Supabase with RLS

export const PIPELINE_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  a_qualifier: 'À Qualifier',
  devis_a_preparer: 'Devis à Préparer',
  devis_envoye: 'Devis Envoyé',
  en_discussion: 'En Discussion',
  gagne: 'Gagné',
  perdu: 'Perdu',
  archive: 'Archivé',
}

export const PIPELINE_STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  nouveau: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-400' },
  a_qualifier: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  devis_a_preparer: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  devis_envoye: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500' },
  en_discussion: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' },
  gagne: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
  perdu: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-400' },
  archive: { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-500', dot: 'bg-slate-300' },
}

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  chaud: { label: 'Chaud', color: 'text-red-600 bg-red-50 border-red-200', icon: '🔴' },
  tiede: { label: 'Tiède', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: '🟡' },
  froid: { label: 'Froid', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: '🔵' },
}

export const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  ai: { label: 'IA', color: 'bg-violet-100 text-violet-700' },
  website: { label: 'Site web', color: 'bg-blue-100 text-blue-700' },
  referral: { label: 'Référence', color: 'bg-green-100 text-green-700' },
  manual: { label: 'Manuel', color: 'bg-slate-100 text-slate-700' },
}

export const LOST_REASONS = [
  'Prix trop élevé',
  'Choisi un concurrent',
  'Budget annulé',
  'Pas de décision',
  'Délai trop long',
  'Autre',
]

export const TASK_TEMPLATES = [
  { label: 'Relance', title: 'Relancer le prospect', priority: 'high' as const },
  { label: 'Visite', title: 'Visite des locaux', priority: 'high' as const },
  { label: 'Devis', title: 'Préparer le devis', priority: 'high' as const },
  { label: 'Appel', title: 'Appel de suivi', priority: 'medium' as const },
  { label: 'Email', title: 'Envoyer email de suivi', priority: 'low' as const },
  { label: 'Réunion', title: 'Planifier une réunion', priority: 'medium' as const },
]

export const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  introduction: {
    subject: 'Présentation des services Proprely',
    body: 'Bonjour,\n\nJe me permets de vous contacter concernant vos besoins en services de nettoyage professionnel.\n\nProprely propose des solutions adaptées à votre activité...\n\nCordialement,\nL\'équipe Proprely',
  },
  follow_up: {
    subject: 'Suite à notre échange',
    body: 'Bonjour,\n\nSuite à notre échange, je souhaitais revenir vers vous pour...\n\nCordialement,\nL\'équipe Proprely',
  },
  quote: {
    subject: 'Votre devis Proprely',
    body: 'Bonjour,\n\nVeuillez trouver ci-joint notre proposition commerciale...\n\nCordialement,\nL\'équipe Proprely',
  },
  reminder: {
    subject: 'Rappel — Devis en attente de signature',
    body: 'Bonjour,\n\nNous souhaitons vous rappeler que votre devis est en attente de signature...\n\nCordialement,\nL\'équipe Proprely',
  },
  thank_you: {
    subject: 'Bienvenue chez Proprely !',
    body: 'Bonjour,\n\nNous vous remercions de votre confiance. Nous sommes ravis de vous accueillir parmi nos clients...\n\nCordialement,\nL\'équipe Proprely',
  },
}

export function getDaysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
}

export function getDaysColor(days: number): string {
  if (days > 7) return 'text-red-600'
  if (days > 3) return 'text-yellow-600'
  return 'text-green-600'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function generateQuoteNumber(existing: number): string {
  const year = new Date().getFullYear()
  const num = String(existing + 1).padStart(3, '0')
  return `DEV-${year}-${num}`
}

export function getNotifications(
  leads: import('@/types/pipeline').PipelineLead[],
  tasks: import('@/types/pipeline').PipelineTask[],
  quotes: import('@/types/pipeline').Quote[]
) {
  const alerts: { id: string; type: 'warning' | 'danger' | 'success'; message: string; leadId?: string }[] = []
  const now = Date.now()

  for (const lead of leads) {
    const createdAgo = (now - new Date(lead.created_at).getTime()) / 86400000
    if (lead.status === 'nouveau' && createdAgo > 3) {
      alerts.push({ id: `notif-new-${lead.id}`, type: 'warning', message: `Qualifier ${lead.company_name}`, leadId: lead.id })
    }
  }

  for (const task of tasks) {
    if (task.status === 'todo' && task.due_date && new Date(task.due_date).getTime() < now) {
      alerts.push({ id: `notif-task-${task.id}`, type: 'danger', message: `Tâche en retard : ${task.title}`, leadId: task.lead_id })
    }
  }

  for (const quote of quotes) {
    if (quote.status === 'envoye' && quote.email_sent_at) {
      const daysSince = (now - new Date(quote.email_sent_at).getTime()) / 86400000
      if (daysSince > 5) {
        const lead = leads.find(l => l.id === quote.lead_id)
        alerts.push({ id: `notif-quote-${quote.id}`, type: 'danger', message: `Relancer ${lead?.company_name ?? 'prospect'} — devis #${quote.quote_number}`, leadId: quote.lead_id })
      }
    }
  }

  return alerts
}
