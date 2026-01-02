/**
 * Command Palette - LIMN Design System Component
 * Adapted for vibe-code-viewer UnifiedSearch
 */

import * as React from 'react';
import {
  Search,
  File,
  Folder,
  Code2,
  Database,
  Calculator,
  Eye,
  Upload,
  CornerDownLeft,
  CodeXml,
  SquareFunction
} from 'lucide-react';
import { cn } from '@/components/lib/utils';
import type { SearchResult } from '../../features/UnifiedSearch/model/types';
import { getFileName } from '../../shared/pathUtils';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  results: SearchResult[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onSelectResult: (result: SearchResult) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  results,
  selectedIndex,
  onSelectedIndexChange,
  onSelectResult,
}: CommandPaletteProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onSelectedIndexChange(Math.min(selectedIndex + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onSelectedIndexChange(Math.max(selectedIndex - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0) {
          onSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, results, onOpenChange, onSelectedIndexChange, onSelectResult]);

  // Get icon for result type
  const getIcon = (result: SearchResult) => {
    if (result.type === 'file') {
      const ext = result.filePath.includes('.') ? '.' + result.filePath.split('.').pop() : '';

      switch (ext.toLowerCase()) {
        case '.tsx':
        case '.vue':
          return CodeXml;
        case '.ts':
        case '.js':
        case '.jsx':
          return SquareFunction;
        default:
          return File;
      }
    }

    if (result.type === 'folder') {
      return Folder;
    }

    // Symbol icons
    if (result.nodeType === 'usage') {
      return Eye;
    }

    if (result.isExported) {
      return Upload;
    }

    switch (result.nodeType) {
      case 'pure-function':
      case 'function':
        return Code2;
      case 'state-ref':
      case 'ref':
        return Database;
      case 'computed':
        return Calculator;
      default:
        return Code2;
    }
  };

  // Get icon color for result type
  const getIconColor = (result: SearchResult, isSelected: boolean) => {
    if (isSelected) return 'text-warm-300';

    if (result.type === 'file') {
      const ext = result.filePath.includes('.') ? '.' + result.filePath.split('.').pop() : '';

      switch (ext.toLowerCase()) {
        case '.tsx':
        case '.vue':
          return 'text-blue-400';
        case '.ts':
        case '.js':
        case '.jsx':
          return 'text-emerald-400';
        default:
          return 'text-blue-400';
      }
    }

    if (result.type === 'folder') {
      return 'text-yellow-400';
    }

    // Symbol colors
    if (result.nodeType === 'usage') {
      return 'text-slate-400';
    }

    if (result.isExported) {
      return 'text-orange-400';
    }

    switch (result.nodeType) {
      case 'pure-function':
      case 'function':
        return 'text-emerald-400';
      case 'state-ref':
      case 'ref':
        return 'text-emerald-500';
      case 'computed':
        return 'text-teal-400';
      default:
        return 'text-emerald-400';
    }
  };

  // Highlight matched text based on fuzzy match indices (only if selected)
  const highlightText = (text: string, key: string, result: SearchResult, isSelected: boolean) => {
    // Only show highlights when this item is selected
    if (!isSelected) {
      return <span>{text}</span>;
    }

    const match = result.matches?.find((m) => m.key === key);
    if (!match || !match.indices.length) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Sort indices by start position
    const sortedIndices = [...match.indices].sort((a, b) => a[0] - b[0]);

    sortedIndices.forEach(([start, end], idx) => {
      // Add non-highlighted part
      if (start > lastIndex) {
        parts.push(<span key={`text-${idx}`}>{text.slice(lastIndex, start)}</span>);
      }
      // Add highlighted part
      parts.push(
        <span key={`match-${idx}`} className="text-warm-300">
          {text.slice(start, end + 1)}
        </span>
      );
      lastIndex = end + 1;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  // Render result subtitle
  const renderSubtitle = (result: SearchResult, isSelected: boolean) => {
    if (result.type === 'file' || result.type === 'folder') {
      return highlightText(result.filePath, 'filePath', result, isSelected);
    }

    // For symbols: show code snippet if available
    if (result.codeSnippet) {
      const snippet = result.codeSnippet;
      const symbolName = result.name;
      const index = snippet.indexOf(symbolName);

      if (index === -1) {
        return <span>{snippet}</span>;
      }

      return (
        <>
          <span>{snippet.slice(0, index)}</span>
          <span className={isSelected ? 'text-warm-300 font-semibold' : 'text-text-secondary'}>
            {highlightText(symbolName, 'name', result, isSelected)}
          </span>
          <span>{snippet.slice(index + symbolName.length)}</span>
        </>
      );
    }

    return null;
  };

  // Render location for symbols
  const renderLocation = (result: SearchResult) => {
    if (result.type === 'symbol') {
      const fileName = getFileName(result.filePath);
      return (
        <span className="text-2xs text-text-muted flex-shrink-0">
          {fileName}
          {result.lineNumber && `:${result.lineNumber}`}
        </span>
      );
    }
    return null;
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-bg-overlay backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-3xl -translate-x-1/2">
        <div className="mx-4 rounded-lg border border-border-active bg-bg-elevated shadow-xl">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-border-DEFAULT px-3 py-1.5">
            <Search size={16} className="text-warm-300 shrink-0" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search files, symbols, and folders..."
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1.5 py-0.5 text-2xs text-text-muted">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[500px] overflow-y-auto p-1">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-secondary text-xs">
                No results found
              </div>
            ) : (
              results.map((result, index) => {
                const Icon = getIcon(result);
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={result.id}
                    className={cn(
                      'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-all',
                      isSelected
                        ? 'bg-warm-glow/30 border border-warm-300/20'
                        : 'border border-transparent hover:bg-white/5'
                    )}
                    onClick={() => onSelectResult(result)}
                    onMouseEnter={() => onSelectedIndexChange(index)}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded',
                        isSelected
                          ? 'bg-warm-glow/30'
                          : 'bg-bg-surface group-hover:bg-bg-base'
                      )}
                    >
                      <Icon size={11} strokeWidth={1.5} className={getIconColor(result, isSelected)} />
                    </div>

                    {/* Content */}
                    {result.type === 'file' || result.type === 'folder' ? (
                      // FILE/FOLDER: Name → full path
                      <>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-semibold truncate',
                              isSelected ? 'text-text-primary' : 'text-text-secondary'
                            )}
                          >
                            {highlightText(result.name, 'name', result, isSelected)}
                          </span>
                        </div>
                        <span className="text-2xs text-text-muted truncate">
                          {renderSubtitle(result, isSelected)}
                        </span>
                      </>
                    ) : (
                      // SYMBOL: Code snippet with symbol name highlighted
                      <>
                        <div className="flex-1 min-w-0 text-2xs text-text-muted truncate">
                          {renderSubtitle(result, isSelected) || (
                            <span className={isSelected ? 'text-warm-300 font-semibold' : 'text-text-secondary'}>
                              {highlightText(result.name, 'name', result, isSelected)}
                            </span>
                          )}
                        </div>
                        {renderLocation(result)}
                      </>
                    )}

                    {isSelected && (
                      <CornerDownLeft size={12} className="shrink-0 text-text-muted" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-DEFAULT px-3 py-1 text-2xs text-text-muted">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1 py-0.5">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1 py-0.5">↵</kbd>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-text-faint">
              <span>Shift+Shift</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
