'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#6366F1] text-white hover:bg-[#4F46E5] active:scale-[0.98] text-[13px] font-semibold rounded-[8px] shadow-sm',
        destructive: 'bg-[#EF4444] text-white hover:bg-[#DC2626] text-[13px] font-medium rounded-[8px]',
        outline: 'border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] text-[13px] font-medium rounded-[8px]',
        secondary: 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] text-[13px] font-medium rounded-[8px]',
        ghost: 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] text-[13px] font-medium rounded-[8px]',
        link: 'text-[#6366F1] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-7 px-3 text-[12px]',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
