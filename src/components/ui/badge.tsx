import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center text-[11px] font-medium tracking-[0.03em] px-2 py-0.5 rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-[#111] text-white',
        secondary: 'bg-[#f7f6f3] text-[#444]',
        destructive: 'bg-[#FDEBEC] text-[#9F2F2D]',
        outline: 'border border-[rgba(0,0,0,0.12)] text-[#444] bg-transparent',
        success: 'bg-[#EDF3EC] text-[#346538]',
        warning: 'bg-[#FBF3DB] text-[#956400]',
        info: 'bg-[#E1F3FE] text-[#1F6C9F]',
        purple: 'bg-[#f7f6f3] text-[#444]',
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
