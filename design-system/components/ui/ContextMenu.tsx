import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface ContextMenuItem {
  label: string
  icon?: LucideIcon
  shortcut?: string
  separator?: boolean
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
}

export interface ContextMenuProps {
  items: ContextMenuItem[]
  position: { x: number; y: number }
  onClose: () => void
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position if menu goes off screen
  React.useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = position.x
      let adjustedY = position.y

      if (rect.right > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8
      }
      if (rect.bottom > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8
      }

      menuRef.current.style.left = `${adjustedX}px`
      menuRef.current.style.top = `${adjustedY}px`
    }
  }, [position])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 min-w-45 rounded-lg border border-border-active bg-bg-elevated shadow-xl"
        style={{ left: position.x, top: position.y }}
      >
        <div className="p-1">
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div
                  key={index}
                  className="my-1 h-px bg-border-DEFAULT"
                />
              )
            }

            const Icon = item.icon

            return (
              <button
                key={index}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.()
                    onClose()
                  }
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs transition-all',
                  item.disabled
                    ? 'cursor-not-allowed opacity-40'
                    : item.danger
                    ? 'text-status-error hover:bg-status-error-bg'
                    : 'text-text-secondary hover:bg-warm-glow/20 hover:text-text-primary'
                )}
              >
                <div className="flex items-center gap-2">
                  {Icon && (
                    <Icon
                      size={13}
                      strokeWidth={1.5}
                      className={cn(
                        item.danger ? 'text-status-error' : 'text-text-muted'
                      )}
                    />
                  )}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-2xs text-text-muted">{item.shortcut}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
