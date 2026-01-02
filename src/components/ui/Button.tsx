import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/components/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-normal disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-warm-400 to-warm-500 text-bg-deep hover:shadow-glow-md active:scale-[0.98]',
        ghost:
          'bg-transparent border border-border-DEFAULT text-text-muted hover:bg-white/5 hover:border-border-light hover:text-text-secondary active:active-glow active:text-text-primary',
        outline:
          'bg-transparent border border-border-warm text-warm-300 hover:bg-warm-glow hover:shadow-glow-sm active:scale-[0.98]',
        link:
          'text-warm-300 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-6 py-2.5 text-md rounded-[var(--limn-radius-lg)]',
        sm: 'h-7 px-3 py-1 text-sm rounded-[var(--limn-radius-md)]',
        lg: 'h-11 px-7 py-3 text-md rounded-[var(--limn-radius-xl)]',
        icon: 'h-9 w-9 rounded-[var(--limn-radius-lg)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
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
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
