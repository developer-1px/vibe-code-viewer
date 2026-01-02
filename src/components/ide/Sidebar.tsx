import * as React from 'react'
import { cn } from '@/components/lib/utils'
import { FileTreeItem } from './FileTreeItem'

// AppSidebar.Header - Compound Component
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

// AppSidebar - Main Component
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

export { Sidebar }
