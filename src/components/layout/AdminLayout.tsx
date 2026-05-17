'use client'

import { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { Menu, Bell, X, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/lib/notifications'
import Link from 'next/link'

interface AdminLayoutProps {
  children: React.ReactNode
}

const SEVERITY_STYLES = {
  error: { icon: AlertTriangle, bg: 'bg-red-50 border-red-100', icon_color: 'text-red-500', dot: 'bg-red-500' },
  warning: { icon: AlertCircle, bg: 'bg-amber-50 border-amber-100', icon_color: 'text-amber-500', dot: 'bg-amber-500' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-100', icon_color: 'text-blue-500', dot: 'bg-blue-500' },
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifications = useNotifications()

  const errorCount = notifications.filter(n => n.severity === 'error').length
  const hasNotifs = notifications.length > 0

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFBFA]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-[rgba(0,0,0,0.08)]">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-slate-100 lg:hidden"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-800 lg:hidden">Proprely Admin</span>

          {/* Desktop spacer */}
          <div className="flex-1 hidden lg:block" />

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={cn(
                'relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
                notifOpen ? 'bg-slate-100' : 'hover:bg-slate-100'
              )}
            >
              <Bell className={cn('w-4 h-4', hasNotifs ? 'text-slate-700' : 'text-slate-400')} />
              {hasNotifs && (
                <span className={cn(
                  'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white',
                  errorCount > 0 ? 'bg-red-500' : 'bg-amber-500'
                )}>
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification panel */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Tout est en ordre !</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                      {notifications.map(n => {
                        const styles = SEVERITY_STYLES[n.severity]
                        const Icon = styles.icon
                        return (
                          <li key={n.id}>
                            <Link
                              href={n.link}
                              onClick={() => setNotifOpen(false)}
                              className={cn('flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors border-l-2', styles.bg.replace('bg-', 'border-').split(' ')[0])}
                            >
                              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', styles.bg)}>
                                <Icon className={cn('w-3.5 h-3.5', styles.icon_color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                              </div>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
