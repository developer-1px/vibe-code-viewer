import { GripVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DefinitionSymbol } from '../../shared/definitionExtractor';
import { DefinitionPanelItem } from './DefinitionPanelItem';

export interface DefinitionPanelProps {
  /** Callback when a symbol is clicked */
  onSymbolClick?: (line: number) => void;
  /** Definition symbols to display */
  symbols?: DefinitionSymbol[];
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
  const [width, setWidth] = useState(320); // Default w-60 = 240px
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 800;

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    // Prevent text selection during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;

      const containerRect = resizeRef.current.getBoundingClientRect();
      // 우측 패널이므로 오른쪽에서 왼쪽으로 resize (containerRect.right - e.clientX)
      const newWidth = containerRect.right - e.clientX;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const handleSymbolClick = (line: number) => {
    onSymbolClick?.(line);
  };

  return (
    <div
      ref={resizeRef}
      className="border-l border-border-DEFAULT bg-bg-elevated flex flex-col flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group transition-colors ${
          isResizing ? 'bg-warm-300/60' : 'hover:bg-warm-300/30'
        }`}
        onMouseDown={handleResizeStart}
        style={{ zIndex: 10 }}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-12 rounded-r bg-bg-elevated/80 opacity-0 group-hover:opacity-100 transition-opacity border border-l-0 border-border-DEFAULT">
          <GripVertical size={12} className="text-warm-300" />
        </div>
      </div>

      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0">
        <span className="text-2xs font-medium text-text-tertiary normal-case">Definitions</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {symbols.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">No definitions found</div>
        ) : (
          symbols.map((symbol, idx) => (
            <DefinitionPanelItem
              key={`${symbol.line}-${symbol.name}-${idx}`}
              symbol={symbol}
              depth={0}
              isExpanded={false}
              expandedSymbols={new Set()}
              onToggle={() => {}}
              onSymbolClick={handleSymbolClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
