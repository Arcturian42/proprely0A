'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePipelineStore } from '@/lib/pipeline-store'
import { getNotifications } from '@/lib/pipeline-actions'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  onSelectLead: (id: string) => void
}

export function NotificationBell({ onSelectLead }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const leads = usePipelineStore(s => s.leads)
  const tasks = usePipelineStore(s => s.tasks)
  const quotes = usePipelineStore(s => s.quotes)
  const alerts = getNotifications(leads, tasks, quotes)

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="relative gap-2" onClick={() => setOpen(!open)}>
        <Bell className="w-4 h-4" />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-sm text-slate-800">Alertes ({alerts.length})</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setOpen(false)}>✕</Button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {alerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">Aucune alerte 🎉</div>
              ) : (
                alerts.map(alert => (
                  <button
                    key={alert.id}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      if (alert.leadId) onSelectLead(alert.leadId)
                      setOpen(false)
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn('mt-0.5 w-2 h-2 rounded-full shrink-0',
                        alert.type === 'danger' ? 'bg-red-500' :
                        alert.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                      )} />
                      <p className="text-sm text-slate-700">{alert.message}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
