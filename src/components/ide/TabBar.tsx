import * as React from 'react'
import { cn } from '@/lib/utils'
import { X, LucideIcon } from 'lucide-react'
import { Indicator } from '@/components/ui/Indicator'

export interface TabProps {
  icon?: LucideIcon
  label: string
  active?: boolean
  dirty?: boolean
  onClose?: () => void
  onClick?: () => void
}

const Tab = React.forwardRef<HTMLDivElement, TabProps>(
  ({ icon: Icon, label, active, dirty, onClose, onClick }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'group flex h-[var(--limn-tab-height)] min-w-[var(--limn-tab-min-width)] max-w-[var(--limn-tab-max-width)] items-center gap-1.5 border-b-2 px-3 text-xs transition-all duration-normal cursor-pointer',
          active
            ? 'border-warm-300 bg-bg-elevated text-text-primary'
            : 'border-transparent bg-transparent text-text-secondary hover:bg-white/5'
        )}
        onClick={onClick}
      >
        {Icon && (
          <Icon
            size={13}
            strokeWidth={1.5}
            className={cn(active ? 'text-text-primary' : 'text-text-muted')}
          />
        )}
        <span className="flex-1 truncate">{label}</span>
        <div className="flex items-center gap-0.5">
          {dirty && <Indicator variant="warning" className="size-1" />}
          <button
            className={cn(
              'rounded p-0.5 opacity-0 hover:bg-white/10 group-hover:opacity-100',
              active && 'opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onClose?.()
            }}
          >
            <X size={11} className="text-text-muted" />
          </button>
        </div>
      </div>
    )
  }
)
Tab.displayName = 'Tab'

export interface TabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const TabBar = React.forwardRef<HTMLDivElement, TabBarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex border-b border-border-DEFAULT bg-bg-base overflow-x-auto',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabBar.displayName = 'TabBar'

export { TabBar, Tab }
