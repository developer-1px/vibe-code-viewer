import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Indicator } from '@/components/ui/Indicator'

export interface ActivityBarItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
  hasBadge?: boolean
  onClick?: () => void
}

const ActivityBarItem = React.forwardRef<HTMLButtonElement, ActivityBarItemProps>(
  ({ icon: Icon, label, active, hasBadge, onClick }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'relative flex h-[var(--limn-activity-bar-icon)] w-[var(--limn-activity-bar-icon)] items-center justify-center rounded-md border transition-all duration-normal',
          active
            ? 'active-glow'
            : 'border-transparent bg-transparent hover:bg-white/5 hover:border-border-light'
        )}
        onClick={onClick}
        aria-label={label}
      >
        <Icon
          size={18}
          strokeWidth={1.5}
          className={cn(
            'transition-colors',
            active ? 'text-warm-300' : 'text-text-muted'
          )}
        />
        {hasBadge && (
          <Indicator
            variant="active"
            className="absolute right-1 top-1"
          />
        )}
      </button>
    )
  }
)
ActivityBarItem.displayName = 'ActivityBarItem'

export interface ActivityBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const ActivityBar = React.forwardRef<HTMLDivElement, ActivityBarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex w-[var(--limn-activity-bar-width)] flex-col items-center gap-1.5 border-r border-border-DEFAULT bg-bg-elevated py-2',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ActivityBar.displayName = 'ActivityBar'

export { ActivityBar, ActivityBarItem }
