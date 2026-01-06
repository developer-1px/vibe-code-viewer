import {
  Blocks,
  BookA,
  Box,
  BugPlay,
  CheckCircle,
  Dot,
  FunctionSquare,
  Layers,
  MessageSquare,
  PackageOpen,
  Settings,
  Type,
} from 'lucide-react';
import { cn } from '@/components/lib/utils';
import type { DefinitionSymbol, SymbolKind } from '../../shared/definitionExtractor';

interface DefinitionPanelItemProps {
  symbol: DefinitionSymbol;
  depth: number;
  isExpanded: boolean;
  expandedSymbols: Set<string>;
  onToggle: (symbolKey: string) => void;
  onSymbolClick: (line: number) => void;
}

// Get icon for symbol kind
function getSymbolIcon(kind: SymbolKind, _isExported?: boolean) {
  const iconProps = { size: 10 };

  switch (kind) {
    case 'import':
      return <PackageOpen {...iconProps} className="text-emerald-300" />;
    case 'type':
      return <Type {...iconProps} className="text-sky-300" />;
    case 'interface':
      return <Type {...iconProps} className="text-cyan-200" />;
    case 'enum':
      return <BookA {...iconProps} className="text-amber-200/85" />;
    case 'const':
    case 'let':
      return <BookA {...iconProps} className="text-amber-200/85" />;
    case 'function':
      return <FunctionSquare {...iconProps} className="text-purple-300/90" />;
    case 'class':
      return <Box {...iconProps} className="text-emerald-300" />;
    case 'method':
      return <Dot {...iconProps} className="text-cyan-200" fill="currentColor" />;
    case 'property':
      return <Dot {...iconProps} className="text-slate-400/85" fill="currentColor" />;
    case 'comment':
      return <MessageSquare {...iconProps} className="text-slate-400/70" />;
    case 'block':
      return <Blocks {...iconProps} className="text-slate-500" />;
    case 'test-suite':
      return <BugPlay {...iconProps} className="text-blue-300" />;
    case 'test-case':
      return <BugPlay {...iconProps} className="text-green-300" />;
    case 'test-hook':
      return <BugPlay {...iconProps} className="text-orange-300" />;
    default:
      return <BookA {...iconProps} className="text-slate-400" />;
  }
}

// Get color for symbol kind
function getSymbolColor(kind: SymbolKind): string {
  switch (kind) {
    case 'import':
      return 'text-emerald-300';
    case 'type':
      return 'text-sky-300';
    case 'interface':
      return 'text-cyan-200';
    case 'enum':
      return 'text-amber-200/85';
    case 'const':
    case 'let':
      return 'text-amber-200/85';
    case 'function':
      return 'text-purple-300/90';
    case 'class':
      return 'text-emerald-300';
    case 'method':
      return 'text-cyan-200';
    case 'property':
      return 'text-slate-400/85';
    case 'test-suite':
      return 'text-blue-300';
    case 'test-case':
      return 'text-green-300';
    case 'test-hook':
      return 'text-orange-300';
    default:
      return 'text-slate-400';
  }
}

export function DefinitionPanelItem({
  symbol,
  depth,
  isExpanded,
  expandedSymbols,
  onToggle,
  onSymbolClick,
}: DefinitionPanelItemProps) {
  // Display name with export indicator
  const displayName = symbol.modifiers?.export ? `${symbol.name}` : symbol.name;

  // Block detection
  const isBlockStart = symbol.foldInfo && symbol.foldInfo.foldStart === symbol.line;

  const handleClick = () => {
    onSymbolClick(symbol.line);
  };

  return (
    <div className={cn(isBlockStart && 'mt-3 border-t border-border-subtle pt-1')}>
      {/* Comment - Label style with // prefix */}
      {symbol.kind === 'comment' ? (
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 text-2xs text-text-muted italic',
            symbol.hasBlankLineBefore && 'mt-2',
            symbol.hasBlankLineAfter && 'mb-2'
          )}
          style={{
            paddingLeft: `calc(12px + ${depth} * var(--limn-indent))`,
          }}
        >
          {/* // prefix aligned with icon position */}
          <span className="shrink-0 text-2xs opacity-50">//</span>
          {/* Comment text */}
          <span className="flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis">{displayName}</span>
        </div>
      ) : (
        /* Symbol Header */
        <div
          className={cn(
            'group flex flex-nowrap h-[var(--limn-file-item-height)] items-center gap-1 px-2 text-xs cursor-pointer border-l-2',
            'border-transparent text-text-secondary hover:bg-white/5 transition-colors'
          )}
          style={{
            paddingLeft: `calc(12px + ${depth} * var(--limn-indent))`,
          }}
          onClick={handleClick}
        >
          {/* Kind Icon */}
          <div className="shrink-0">{getSymbolIcon(symbol.kind, symbol.modifiers?.export)}</div>

          {/* Symbol Name */}
          <span className="flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex items-center gap-1">
            {displayName}
            {symbol.modifiers?.export && <span className="text-warm-300 text-2xs opacity-60">↗</span>}
          </span>

          {/* Type annotation (if exists) */}
          {symbol.type && (
            <span className="text-text-tertiary text-2xs shrink-0">
              {symbol.type.length > 30 ? `${symbol.type.substring(0, 30)}...` : symbol.type}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
