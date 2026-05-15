import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
}

export function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{value}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-medium mt-2', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          <span>{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}
    </div>
  )
}
