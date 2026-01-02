import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, LucideIcon } from 'lucide-react'
import { Indicator } from '@/components/ui/Indicator'

export interface FileTreeItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
  dirty?: boolean
  isFolder?: boolean
  isOpen?: boolean
  indent?: number
  onClick?: () => void
}

const FileTreeItem = React.forwardRef<HTMLDivElement, FileTreeItemProps>(
  ({ icon: Icon, label, active, dirty, isFolder, isOpen, indent = 0, onClick }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'group flex flex-nowrap h-[var(--limn-file-item-height)] items-center gap-1 border-l-2 px-2 text-xs transition-all duration-normal cursor-pointer',
          active
            ? 'border-warm-300 bg-warm-active-bg text-text-primary'
            : 'border-transparent text-text-secondary hover:bg-white/5'
        )}
        style={{ paddingLeft: `calc(12px + ${indent} * var(--limn-indent))` }}
        onClick={onClick}
      >
        {isFolder && (
          <>
            {isOpen ? (
              <ChevronDown size={11} className="text-text-muted shrink-0" />
            ) : (
              <ChevronRight size={11} className="text-text-muted shrink-0" />
            )}
          </>
        )}
        <Icon
          size={13}
          strokeWidth={1.5}
          className={cn(
            'shrink-0',
            isFolder ? 'text-text-tertiary' : 'text-text-muted'
          )}
        />
        <span className="flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{label}</span>
        {dirty && <Indicator variant="warning" className="h-1 w-1 shrink-0" />}
      </div>
    )
  }
)
FileTreeItem.displayName = 'FileTreeItem'

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  children: React.ReactNode
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex w-[var(--limn-sidebar-width)] flex-col border-r border-border-DEFAULT bg-bg-elevated',
          className
        )}
        {...props}
      >
        {title && (
          <div className="flex h-8 items-center border-b border-border-DEFAULT px-2">
            <span className="label text-2xs">{title}</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-1">
          {children}
        </div>
      </div>
    )
  }
)
Sidebar.displayName = 'Sidebar'

export { Sidebar, FileTreeItem }
