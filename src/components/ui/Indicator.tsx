import * as React from 'react'
import { cn } from '@/components/lib/utils'

export interface IndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'inactive' | 'active' | 'success' | 'warning' | 'error' | 'working'
}

const Indicator = React.forwardRef<HTMLDivElement, IndicatorProps>(
  ({ className, variant = 'inactive', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'h-2 w-2 rounded-full', // 8px (Tailwind default h-2 = 8px)
          {
            'bg-white/20': variant === 'inactive',
            'bg-warm-300 shadow-glow-sm': variant === 'active',
            'bg-status-success shadow-glow-success': variant === 'success',
            'bg-status-warning shadow-glow-warning': variant === 'warning',
            'bg-status-error shadow-glow-error': variant === 'error',
            'bg-warm-300 shadow-glow-md animate-pulse': variant === 'working',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Indicator.displayName = 'Indicator'

export { Indicator }
