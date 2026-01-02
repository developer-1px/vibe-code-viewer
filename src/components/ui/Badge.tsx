import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/components/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-[var(--limn-radius-sm)] px-2 py-1 text-2xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white/5 text-text-tertiary',
        active: 'bg-warm-glow border border-border-warm text-warm-300',
        success: 'bg-status-success-bg text-status-success',
        warning: 'bg-status-warning-bg text-status-warning',
        error: 'bg-status-error-bg text-status-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
