'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm shadow-sm',
        destructive: 'bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm',
        outline: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-sm',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm',
        ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm',
        link: 'text-indigo-600 underline-offset-4 hover:underline text-sm',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-10 px-5',
        icon: 'h-8 w-8',
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
