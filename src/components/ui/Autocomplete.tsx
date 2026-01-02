import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface AutocompleteItem {
  label: string
  detail?: string
  icon?: LucideIcon
  type?: 'method' | 'function' | 'class' | 'variable' | 'keyword' | 'snippet'
}

export interface AutocompleteProps {
  items: AutocompleteItem[]
  position: { x: number; y: number }
  selectedIndex: number
  onSelect: (item: AutocompleteItem) => void
  onClose: () => void
}

const typeColors = {
  method: 'text-warm-300',
  function: 'text-warm-300',
  class: 'text-warm-300',
  variable: 'text-warm-300',
  keyword: 'text-warm-300',
  snippet: 'text-warm-300',
}

const typeLabels = {
  method: 'M',
  function: 'ƒ',
  class: 'C',
  variable: 'v',
  keyword: 'K',
  snippet: '⋯',
}

export function Autocomplete(props: AutocompleteProps) {
  const { items, position, selectedIndex, onSelect, onClose } = props
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Auto-scroll selected item into view
  React.useEffect(() => {
    const selectedElement = menuRef.current?.children[selectedIndex] as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-80 rounded-lg border border-border-active bg-bg-elevated shadow-xl backdrop-blur-sm"
      style={{ left: position.x, top: position.y }}
    >
      <div className="max-h-64 overflow-y-auto p-1">
        {items.map((item, index) => {
          const Icon = item.icon
          const typeColor = item.type ? typeColors[item.type] : 'text-text-muted'
          const typeLabel = item.type ? typeLabels[item.type] : '·'

          return (
            <div
              key={index}
              onClick={() => onSelect(item)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-all',
                selectedIndex === index
                  ? 'bg-warm-glow/30 border border-warm-300/20 text-text-primary'
                  : 'border border-transparent hover:bg-white/5 text-text-secondary'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Type indicator */}
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded text-2xs font-mono',
                    selectedIndex === index
                      ? 'bg-warm-glow/30 text-warm-300'
                      : 'bg-bg-surface',
                    typeColor
                  )}
                >
                  {Icon ? (
                    <Icon size={11} strokeWidth={1.5} />
                  ) : (
                    typeLabel
                  )}
                </div>

                {/* Label */}
                <span className="truncate font-mono">{item.label}</span>
              </div>

              {/* Detail */}
              {item.detail && (
                <span className="shrink-0 text-2xs text-text-muted">{item.detail}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-border-DEFAULT px-2 py-1 text-2xs text-text-muted">
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1 py-0.5">↑↓</kbd>
          <span>Navigate</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1 py-0.5">Tab</kbd>
          <span>Accept</span>
        </div>
      </div>
    </div>
  )
}
