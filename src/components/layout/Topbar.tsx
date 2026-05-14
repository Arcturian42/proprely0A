'use client'

import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopbarProps {
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-lg font-semibold text-slate-900">{title}</h1>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4 text-slate-500" />
        </Button>
      </div>
    </header>
  )
}
