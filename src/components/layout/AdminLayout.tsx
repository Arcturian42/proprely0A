'use client'

import { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompanySwitcher } from '@/components/dev/CompanySwitcher'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
          <span className="font-semibold text-slate-800 flex-1">Proprely Admin</span>
          <CompanySwitcher />
        </div>

        {/* Desktop dev topbar — only renders in non-production */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="hidden lg:flex items-center justify-end gap-3 px-6 py-2 bg-white border-b border-[rgba(0,0,0,0.08)]">
            <CompanySwitcher />
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
