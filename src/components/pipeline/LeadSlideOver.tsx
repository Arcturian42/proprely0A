'use client'

import { useEffect, useCallback } from 'react'
import { PipelineLead } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { PIPELINE_STATUS_LABELS } from '@/lib/pipeline-actions'
import { formatCurrency } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TabResume } from './tabs/TabResume'
import { TabNotes } from './tabs/TabNotes'
import { TabTasks } from './tabs/TabTasks'
import { TabQuotes } from './tabs/TabQuotes'
import { TabEmails } from './tabs/TabEmails'
import { TabCalls } from './tabs/TabCalls'
import { TabFiles } from './tabs/TabFiles'
import { TabTimeline } from './tabs/TabTimeline'
import { TabSettings } from './tabs/TabSettings'
import { X, Mail, Phone, Calendar, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LeadSlideOverProps {
  lead: PipelineLead
  onClose: () => void
}

const QUICK_ACTIONS = [
  { icon: Mail, label: 'Email', action: 'email' },
  { icon: Phone, label: 'Appel', action: 'call' },
  { icon: Calendar, label: 'RDV', action: 'meeting' },
  { icon: Link2, label: 'Lien', action: 'link' },
] as const

export function LeadSlideOver({ lead, onClose }: LeadSlideOverProps) {
  const { contacts, tasks, quotes } = usePipelineStore()
  const leadContacts = contacts.filter(c => c.lead_id === lead.id)
  const leadTasks = tasks.filter(t => t.lead_id === lead.id && t.status === 'todo')
  const leadQuotes = quotes.filter(q => q.lead_id === lead.id)
  const overdueTaskCount = leadTasks.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now()).length

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const value = lead.value_monthly ?? lead.value_total ?? 0
  const primaryContact = leadContacts.find(c => c.is_primary)

  const handleQuickAction = (action: string) => {
    if (action === 'link') {
      navigator.clipboard.writeText(`${window.location.origin}/pipeline/${lead.id}`)
      toast.success('Lien copié !')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">{lead.company_name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {value > 0 && (
                    <span className="text-sm font-semibold text-green-700">{formatCurrency(value)}/m</span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {PIPELINE_STATUS_LABELS[lead.status]}
                  </span>
                  {lead.sector && <span className="text-xs text-slate-500">{lead.sector}</span>}
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mt-3">
              {QUICK_ACTIONS.map(qa => (
                <Button
                  key={qa.action}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => handleQuickAction(qa.action)}
                >
                  <qa.icon className="w-3 h-3" />
                  {qa.label}
                </Button>
              ))}
              {primaryContact?.email && (
                <a href={`mailto:${primaryContact.email}`} className="text-xs text-blue-600 hover:underline ml-auto">
                  {primaryContact.first_name} {primaryContact.last_name}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="resume" className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 border-b border-slate-100 px-3">
            <TabsList className="h-auto bg-transparent rounded-none gap-0 p-0 overflow-x-auto flex flex-nowrap">
              {([
                ['resume', '📋', 'Résumé'],
                ['notes', '📝', 'Notes'],
                ['tasks', '✅', `Tâches${overdueTaskCount > 0 ? ` (${overdueTaskCount})` : ''}`],
                ['quotes', '📄', `Devis${leadQuotes.length > 0 ? ` (${leadQuotes.length})` : ''}`],
                ['emails', '📧', 'Emails'],
                ['calls', '📞', 'Appels'],
                ['files', '📎', 'Fichiers'],
                ['timeline', '📊', 'Timeline'],
                ['settings', '⚙️', 'Params'],
              ] as [string, string, string][]).map(([value, icon, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="shrink-0 text-xs px-3 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap"
                >
                  <span className="mr-1">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <TabsContent value="resume" className="mt-0"><TabResume lead={lead} /></TabsContent>
              <TabsContent value="notes" className="mt-0"><TabNotes lead={lead} /></TabsContent>
              <TabsContent value="tasks" className="mt-0"><TabTasks lead={lead} /></TabsContent>
              <TabsContent value="quotes" className="mt-0"><TabQuotes lead={lead} /></TabsContent>
              <TabsContent value="emails" className="mt-0"><TabEmails lead={lead} /></TabsContent>
              <TabsContent value="calls" className="mt-0"><TabCalls lead={lead} /></TabsContent>
              <TabsContent value="files" className="mt-0"><TabFiles lead={lead} /></TabsContent>
              <TabsContent value="timeline" className="mt-0"><TabTimeline lead={lead} /></TabsContent>
              <TabsContent value="settings" className="mt-0"><TabSettings lead={lead} onClose={onClose} /></TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </>
  )
}
