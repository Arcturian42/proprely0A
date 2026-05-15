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
    <div className="card-hover bg-white border border-[rgba(0,0,0,0.08)] rounded-[10px] p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[12px] font-medium text-[#787774] uppercase tracking-[0.05em]">{title}</p>
          <p className="text-[28px] font-semibold tracking-tight text-[#111] mt-1 leading-none">{value}</p>
          {description && <p className="text-[12px] text-[#9b9a97] mt-1.5">{description}</p>}
          {trend && (
            <p className={cn('text-xs mt-2', trend.value >= 0 ? 'text-[#346538]' : 'text-[#9F2F2D]')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <Icon className="w-5 h-5 text-[#9b9a97]" />
        )}
      </div>
    </div>
  )
}
