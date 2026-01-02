import * as React from 'react'
import { cn } from '@/components/lib/utils'
import { ChevronRight, ChevronDown, LucideIcon } from 'lucide-react'
import { Indicator } from '@/components/ui/Indicator'

export interface FileTreeItemProps {
  icon: LucideIcon | React.ComponentType
  label: string
  active?: boolean
  focused?: boolean // Keyboard navigation focus (different from active)
  isFolder?: boolean
  isOpen?: boolean
  indent?: number
  onClick?: () => void
  onFocus?: () => void // Single click - update focus
  onDoubleClick?: () => void // Double click - open file or toggle folder
  fileExtension?: string // File extension for icon coloring (.ts, .vue, .json, etc.)
}

export const FileTreeItem = React.forwardRef<HTMLDivElement, FileTreeItemProps>(
  ({ icon: Icon, label, active, focused, isFolder, isOpen, indent = 0, onClick, onFocus, onDoubleClick, fileExtension }, ref) => {
    const handleClick = (e: React.MouseEvent) => {
      // Single click - update focus
      if (onFocus) {
        onFocus()
      }
      // Also call onClick for backwards compatibility
      if (onClick) {
        onClick()
      }
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
      // Double click - open file or toggle folder
      if (onDoubleClick) {
        onDoubleClick()
      }
    }

    // File icon color based on extension
    const getFileIconColor = (ext?: string) => {
      if (!ext) return 'text-text-muted'

      switch (ext.toLowerCase()) {
        case '.ts':
        case '.tsx':
          return 'text-[#3178c6]' // TypeScript blue
        case '.js':
        case '.jsx':
          return 'text-[#f7df1e]' // JavaScript yellow
        case '.vue':
          return 'text-[#42b883]' // Vue green
        case '.json':
          return 'text-[#f59e0b]' // JSON orange
        case '.css':
        case '.scss':
        case '.sass':
          return 'text-[#a78bfa]' // CSS purple
        case '.html':
          return 'text-[#e34c26]' // HTML red
        case '.md':
          return 'text-[#60a5fa]' // Markdown blue
        default:
          return 'text-text-muted'
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          'group flex flex-nowrap h-[var(--limn-file-item-height)] items-center gap-1 border-l-2 px-2 text-xs cursor-pointer',
          active
            ? 'border-warm-300 bg-warm-active-bg text-text-primary'
            : focused
              ? 'border-warm-300/50 bg-white/8 text-text-primary'
              : 'border-transparent text-text-secondary'
        )}
        style={{
          paddingLeft: `calc(12px + ${indent} * var(--limn-indent) + ${isFolder ? '0px' : '15px'})`
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isFolder && (
          <>
            {isOpen ? (
              <ChevronDown size={11} className="text-text-secondary shrink-0" />
            ) : (
              <ChevronRight size={11} className="text-text-secondary shrink-0" />
            )}
          </>
        )}
        {typeof Icon === 'function' && Icon.prototype === undefined ? (
          // React component (Lineicons)
          <div className={cn(
            'shrink-0',
            isFolder ? 'text-warm-300/80' : getFileIconColor(fileExtension)
          )}>
            <Icon />
          </div>
        ) : (
          // LucideIcon
          <Icon
            size={13}
            strokeWidth={1.5}
            className={cn(
              'shrink-0',
              isFolder ? 'text-warm-300/80' : getFileIconColor(fileExtension)
            )}
          />
        )}
        <span className="flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{label}</span>
        {active && !isFolder && <Indicator variant="warning" className="h-1 w-1 shrink-0" />}
      </div>
    )
  }
)
FileTreeItem.displayName = 'FileTreeItem'
