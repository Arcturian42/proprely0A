import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[#6366F1] text-white',
        secondary: 'bg-[#F1F5F9] text-[#475569]',
        destructive: 'bg-[#FEF2F2] text-[#991B1B]',
        outline: 'border border-[#E2E8F0] text-[#475569] bg-transparent',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-amber-50 text-amber-700',
        info: 'bg-blue-50 text-blue-700',
        purple: 'bg-violet-50 text-violet-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
