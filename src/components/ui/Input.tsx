import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[var(--limn-radius-2xl)] border border-border-light bg-white/5 px-4 py-3 text-md text-text-secondary placeholder:text-text-muted transition-all duration-normal',
          'focus:outline-none focus:border-border-active focus:bg-warm-glow/50 focus:shadow-glow-sm focus:text-text-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
