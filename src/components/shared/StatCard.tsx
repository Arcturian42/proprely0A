import { Card, CardContent } from '@/components/ui/card'
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

export function StatCard({ title, value, description, icon: Icon, iconColor, iconBg, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
            {trend && (
              <p className={cn('text-xs mt-2', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg || 'bg-indigo-50')}>
              <Icon className={cn('w-5 h-5', iconColor || 'text-indigo-600')} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
