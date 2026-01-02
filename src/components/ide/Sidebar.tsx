import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, LucideIcon, MoreHorizontal } from 'lucide-react'
import { Indicator } from '@/components/ui/Indicator'

export interface FileTreeItemProps {
  icon: LucideIcon | React.ComponentType
  label: string
  active?: boolean
  focused?: boolean // Keyboard navigation focus (different from active)
  dirty?: boolean
  isFolder?: boolean
  isOpen?: boolean
  indent?: number
  onClick?: () => void
  onFocus?: () => void // Single click - update focus
  onDoubleClick?: () => void // Double click - open file or toggle folder
  onMoreClick?: (e: React.MouseEvent) => void // Dots menu click
  fileExtension?: string // File extension for icon coloring (.ts, .vue, .json, etc.)
}

const FileTreeItem = React.forwardRef<HTMLDivElement, FileTreeItemProps>(
  ({ icon: Icon, label, active, focused, dirty, isFolder, isOpen, indent = 0, onClick, onFocus, onDoubleClick, onMoreClick, fileExtension }, ref) => {
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

    const handleMoreClick = (e: React.MouseEvent) => {
      e.stopPropagation() // Don't trigger item click
      if (onMoreClick) {
        onMoreClick(e)
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

    // Show dots on focused or active items (Desktop App behavior)
    const showDots = (focused || active) && !isFolder

    return (
      <div
        ref={ref}
        className={cn(
          'group flex flex-nowrap h-[var(--limn-file-item-height)] items-center gap-1 border-l-2 px-2 text-xs transition-all duration-normal cursor-pointer',
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
        {dirty && <Indicator variant="warning" className="h-1 w-1 shrink-0" />}
        {showDots && (
          <button
            onClick={handleMoreClick}
            className={cn(
              'shrink-0 hover:bg-white/10 rounded p-0.5 transition-opacity',
              focused || active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            aria-label="More options"
          >
            <MoreHorizontal size={12} className="text-text-muted" />
          </button>
        )}
      </div>
    )
  }
)
FileTreeItem.displayName = 'FileTreeItem'

// Sidebar.Header - Compound Component
export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SidebarHeader.displayName = 'SidebarHeader'

// Sidebar - Main Component
export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resizable?: boolean // Enable resize handle
  defaultWidth?: number // Default width in pixels
  minWidth?: number // Min width in pixels
  maxWidth?: number // Max width in pixels
  onWidthChange?: (width: number) => void // Callback when width changes
}

const SidebarRoot = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, children, resizable = false, defaultWidth = 240, minWidth = 180, maxWidth = 600, onWidthChange, ...props }, ref) => {
    const [width, setWidth] = React.useState(defaultWidth)
    const [isResizing, setIsResizing] = React.useState(false)
    const startXRef = React.useRef(0)
    const startWidthRef = React.useRef(defaultWidth)

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsResizing(true)
      startXRef.current = e.clientX
      startWidthRef.current = width
      e.preventDefault()
    }

    React.useEffect(() => {
      if (!isResizing) return

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startXRef.current
        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + deltaX))
        setWidth(newWidth)
        if (onWidthChange) {
          onWidthChange(newWidth)
        }
      }

      const handleMouseUp = () => {
        setIsResizing(false)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }, [isResizing, minWidth, maxWidth, onWidthChange])

    // Separate header from content
    const childrenArray = React.Children.toArray(children)
    const header = childrenArray.find(
      (child) => React.isValidElement(child) && child.type === SidebarHeader
    )
    const content = childrenArray.filter(
      (child) => !(React.isValidElement(child) && child.type === SidebarHeader)
    )

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col border-r border-border-DEFAULT bg-bg-elevated relative',
          className
        )}
        style={{ width: `${width}px` }}
        {...props}
      >
        {header}
        <div className="flex-1 overflow-y-auto py-1">
          {content}
        </div>
        {resizable && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-warm-300/50 active:bg-warm-300 transition-colors"
            onMouseDown={handleMouseDown}
          />
        )}
      </div>
    )
  }
)
SidebarRoot.displayName = 'Sidebar'

// Compound Component Pattern
const Sidebar = Object.assign(SidebarRoot, {
  Header: SidebarHeader
})

export { Sidebar, FileTreeItem }
