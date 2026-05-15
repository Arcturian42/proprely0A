'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#111] text-white hover:bg-[#333] active:scale-[0.98] text-[13px] rounded-[6px] shadow-none',
        destructive: 'bg-red-500 text-white hover:bg-red-600 text-[13px] rounded-[6px]',
        outline: 'border border-[rgba(0,0,0,0.12)] bg-white text-[#111] hover:bg-[#f7f6f3] text-[13px] rounded-[6px] shadow-none',
        secondary: 'border border-[rgba(0,0,0,0.12)] bg-white text-[#111] hover:bg-[#f7f6f3] text-[13px] rounded-[6px] shadow-none',
        ghost: 'text-[#444] hover:bg-[#f7f6f3] hover:text-[#111] text-[13px] rounded-[6px]',
        link: 'text-[#3B5BDB] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
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
