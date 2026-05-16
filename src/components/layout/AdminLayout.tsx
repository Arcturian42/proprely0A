'use client'

import { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { Menu, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isLoading = useAppStore(s => s.isLoading)

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFBFA]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar with hamburger */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[rgba(0,0,0,0.08)] lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-slate-100"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-800">Proprely Admin</span>
        </div>

        <main className="flex-1 overflow-y-auto relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500">Chargement des données…</p>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
