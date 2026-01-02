import {
  ChevronDown,
  ChevronRight,
  PackageOpen,
  Type,
  BookA,
  Dot,
  FunctionSquare,
  Box,
} from 'lucide-react'
import { cn } from '@/components/lib/utils'
import type { DefinitionSymbol, SymbolKind } from '../../shared/definitionExtractor'

interface DefinitionPanelItemProps {
  symbol: DefinitionSymbol
  depth: number
  isExpanded: boolean
  expandedSymbols: Set<string>
  onToggle: (symbolKey: string) => void
  onSymbolClick: (line: number) => void
}

// Get icon for symbol kind
function getSymbolIcon(kind: SymbolKind, isExported?: boolean) {
  const iconProps = { size: 10 }

  switch (kind) {
    case 'import':
      return <PackageOpen {...iconProps} className="text-emerald-300" />
    case 'type':
      return <Type {...iconProps} className="text-sky-300" />
    case 'interface':
      return <Type {...iconProps} className="text-cyan-200" />
    case 'enum':
      return <BookA {...iconProps} className="text-amber-200/85" />
    case 'const':
    case 'let':
      return <BookA {...iconProps} className="text-amber-200/85" />
    case 'function':
      return <FunctionSquare {...iconProps} className="text-purple-300/90" />
    case 'class':
      return <Box {...iconProps} className="text-emerald-300" />
    case 'method':
      return <Dot {...iconProps} className="text-cyan-200" fill="currentColor" />
    case 'property':
      return <Dot {...iconProps} className="text-slate-400/85" fill="currentColor" />
    default:
      return <BookA {...iconProps} className="text-slate-400" />
  }
}

// Get color for symbol kind
function getSymbolColor(kind: SymbolKind): string {
  switch (kind) {
    case 'import':
      return 'text-emerald-300'
    case 'type':
      return 'text-sky-300'
    case 'interface':
      return 'text-cyan-200'
    case 'enum':
      return 'text-amber-200/85'
    case 'const':
    case 'let':
      return 'text-amber-200/85'
    case 'function':
      return 'text-purple-300/90'
    case 'class':
      return 'text-emerald-300'
    case 'method':
      return 'text-cyan-200'
    case 'property':
      return 'text-slate-400/85'
    default:
      return 'text-slate-400'
  }
}

export function DefinitionPanelItem({
  symbol,
  depth,
  isExpanded,
  expandedSymbols,
  onToggle,
  onSymbolClick
}: DefinitionPanelItemProps) {
  const hasChildren = symbol.children && symbol.children.length > 0

  // Create unique key for this symbol (line + name)
  const symbolKey = `${symbol.line}-${symbol.name}`

  // Display name with export indicator
  const displayName = symbol.modifiers?.export ? `${symbol.name}` : symbol.name

  const handleClick = () => {
    onSymbolClick(symbol.line)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggle(symbolKey)
    }
  }

  return (
    <div>
      {/* Symbol Header */}
      <div
        className={cn(
          'group flex flex-nowrap h-[var(--limn-file-item-height)] items-center gap-1 px-2 cursor-pointer hover:bg-white/5 transition-colors',
          'border-l-2 border-transparent'
        )}
        style={{
          paddingLeft: `calc(12px + ${depth} * var(--limn-indent))`
        }}
        onClick={handleClick}
      >
        {/* Chevron */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="shrink-0"
          >
            {isExpanded ? (
              <ChevronDown size={11} className="text-text-secondary" />
            ) : (
              <ChevronRight size={11} className="text-text-secondary" />
            )}
          </button>
        ) : (
          <div className="w-[11px] shrink-0" />
        )}

        {/* Kind Icon */}
        <div className="shrink-0">
          {getSymbolIcon(symbol.kind, symbol.modifiers?.export)}
        </div>

        {/* Symbol Name */}
        <span className={cn(
          'flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex items-center gap-1',
          getSymbolColor(symbol.kind)
        )}>
          {displayName}
          {symbol.modifiers?.export && (
            <span className="text-warm-300 text-2xs opacity-60">↗</span>
          )}
        </span>

        {/* Type annotation (if exists) */}
        {symbol.type && (
          <span className="text-text-tertiary text-2xs shrink-0">
            {symbol.type.length > 30 ? symbol.type.substring(0, 30) + '...' : symbol.type}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {symbol.children!.map((child, idx) => (
            <DefinitionPanelItem
              key={`${child.line}-${child.name}-${idx}`}
              symbol={child}
              depth={depth + 1}
              isExpanded={expandedSymbols.has(`${child.line}-${child.name}`)}
              expandedSymbols={expandedSymbols}
              onToggle={onToggle}
              onSymbolClick={onSymbolClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
