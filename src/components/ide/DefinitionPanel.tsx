import { useState, useEffect, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import { DefinitionPanelItem } from './DefinitionPanelItem'
import type { DefinitionSymbol } from '../../shared/definitionExtractor'

export interface DefinitionPanelProps {
  /** Callback when a symbol is clicked */
  onSymbolClick?: (line: number) => void
  /** Definition symbols to display */
  symbols?: DefinitionSymbol[]
}

/**
 * DefinitionPanel - File definitions view (exports, types, functions, classes)
 *
 * Displays:
 * - Imports
 * - Type aliases
 * - Interfaces
 * - Enums
 * - Constants and variables
 * - Functions
 * - Classes with methods and properties
 */
export function DefinitionPanel({ onSymbolClick, symbols = [] }: DefinitionPanelProps) {
  const [width, setWidth] = useState(240) // Default w-60 = 240px
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Initialize expandedSymbols to expand all symbols with children by default
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set())

  const MIN_WIDTH = 180
  const MAX_WIDTH = 400

  // Expand all symbols when symbols change (except imports)
  useEffect(() => {
    const allExpandableSymbols = new Set<string>()

    const collectExpandable = (symbolList: DefinitionSymbol[]) => {
      symbolList.forEach(symbol => {
        if (symbol.children && symbol.children.length > 0) {
          const symbolKey = `${symbol.line}-${symbol.name}`

          // Skip imports - keep them collapsed by default
          if (symbol.kind === 'import') {
            return
          }

          allExpandableSymbols.add(symbolKey)
          collectExpandable(symbol.children)
        }
      })
    }

    collectExpandable(symbols)
    setExpandedSymbols(allExpandableSymbols)
  }, [symbols])

  // Handle resize
  useEffect(() => {
    if (!isResizing) return

    // Prevent text selection during resize
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return

      const containerRect = resizeRef.current.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleResizeStart = () => {
    setIsResizing(true)
  }

  const toggleSymbol = (symbolKey: string) => {
    const newExpanded = new Set(expandedSymbols)
    if (newExpanded.has(symbolKey)) {
      newExpanded.delete(symbolKey)
    } else {
      newExpanded.add(symbolKey)
    }
    setExpandedSymbols(newExpanded)
  }

  const handleSymbolClick = (line: number) => {
    onSymbolClick?.(line)
  }

  return (
    <div
      ref={resizeRef}
      className="border-r border-border-DEFAULT bg-bg-elevated flex flex-col flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group transition-colors ${
          isResizing ? 'bg-warm-300/60' : 'hover:bg-warm-300/30'
        }`}
        onMouseDown={handleResizeStart}
        style={{ zIndex: 10 }}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-12 rounded-l bg-bg-elevated/80 opacity-0 group-hover:opacity-100 transition-opacity border border-r-0 border-border-DEFAULT">
          <GripVertical size={12} className="text-warm-300" />
        </div>
      </div>

      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-border-DEFAULT px-3 flex-shrink-0">
        <span className="label">DEFINITIONS</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-[1rem]">
        {symbols.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            No definitions found
          </div>
        ) : (
          symbols.map((symbol, idx) => (
            <DefinitionPanelItem
              key={`${symbol.line}-${symbol.name}-${idx}`}
              symbol={symbol}
              depth={0}
              isExpanded={expandedSymbols.has(`${symbol.line}-${symbol.name}`)}
              expandedSymbols={expandedSymbols}
              onToggle={toggleSymbol}
              onSymbolClick={handleSymbolClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
