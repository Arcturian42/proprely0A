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
    <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 card-hover">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#6366F1]" />
          </div>
        )}
      </div>
      <p className="text-[32px] font-bold text-[#0F172A] leading-none tracking-tight">{value}</p>
      {description && <p className="text-[12px] text-[#94A3B8] mt-2">{description}</p>}
      {trend && (
        <p className={cn('text-[12px] font-medium mt-2', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  )
}
