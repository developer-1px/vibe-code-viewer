/**
 * Search Result Item Component
 */

import React, { forwardRef } from 'react';
import { File, Folder, Code2, Database, Zap, Calculator, Shield, Box, Eye, Upload } from 'lucide-react';
import type { SearchResult } from '../model/types';

interface SearchResultItemProps {
  result: SearchResult;
  isFocused: boolean;
  onClick: () => void;
}

export const SearchResultItem = forwardRef<HTMLDivElement, SearchResultItemProps>(
  ({ result, isFocused, onClick }, ref) => {
    const getIcon = () => {
      if (result.type === 'file') {
        return <File className="w-2.5 h-2.5 text-blue-400" />;
      }

      if (result.type === 'folder') {
        return <Folder className="w-2.5 h-2.5 text-yellow-400" />;
      }

      // Usage: Eye icon (참조/사용) - 회색
      if (result.nodeType === 'usage') {
        return <Eye className="w-2.5 h-2.5 text-slate-400" />;
      }

      // Exported symbols: Upload icon - 주황색
      if (result.isExported) {
        return <Upload className="w-2.5 h-2.5 text-orange-400" />;
      }

      // Declaration icons - 녹색 계열로 통일
      switch (result.nodeType) {
        case 'pure-function':
        case 'function':
          return <Code2 className="w-2.5 h-2.5 text-emerald-400" />;
        case 'state-ref':
        case 'ref':
          return <Database className="w-2.5 h-2.5 text-emerald-500" />;
        case 'state-action':
          return <Code2 className="w-2.5 h-2.5 text-green-400" />;
        case 'computed':
          return <Calculator className="w-2.5 h-2.5 text-teal-400" />;
        case 'effect-action':
          return <Zap className="w-2.5 h-2.5 text-lime-400" />;
        default:
          return <Box className="w-2.5 h-2.5 text-emerald-400" />;
      }
    };

    // Get color for symbol type badge
    const getTypeColor = () => {
      switch (result.nodeType) {
        case 'pure-function':
          return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
        case 'computed':
          return 'text-sky-400 border-sky-400/30 bg-sky-400/10';
        case 'state-ref':
        case 'ref':
          return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
        case 'state-action':
          return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
        case 'effect-action':
          return 'text-red-400 border-red-400/30 bg-red-400/10';
        case 'hook':
          return 'text-violet-400 border-violet-400/30 bg-violet-400/10';
        default:
          return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
      }
    };

    const getTypeLabel = () => {
      if (result.type === 'file') return 'FILE';
      if (result.type === 'folder') return 'FOLDER';
      return result.nodeType?.toUpperCase() || 'SYMBOL';
    };

    // Highlight matched text based on fuzzy match indices (only if focused)
    const highlightText = (text: string, key: string) => {
      // Only show highlights when this item is focused
      if (!isFocused) {
        return <span>{text}</span>;
      }

      const match = result.matches?.find(m => m.key === key);
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
          <span key={`match-${idx}`} className="text-vibe-accent">
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

    // For files: show full path
    // For symbols: show just filename
    const fileName = result.filePath.split('/').pop() || result.filePath;

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`
          flex items-center gap-3 px-2.5 py-1 cursor-pointer
          ${isFocused ? 'bg-vibe-accent/20' : 'hover:bg-white/5'}
        `}
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Content - Different layout for file/folder vs symbol */}
        {result.type === 'file' || result.type === 'folder' ? (
          // FILE/FOLDER: Name → full path
          <>
            <div className="text-[11px] text-slate-100 font-mono font-semibold flex-shrink-0">
              {highlightText(result.name, 'name')}
            </div>
            <div className="text-[9px] text-slate-500 font-mono truncate flex-1" title={result.filePath}>
              {highlightText(result.filePath, 'filePath')}
            </div>
          </>
        ) : (
          // SYMBOL: Code snippet with symbol name highlighted
          <>
            {/* Code snippet with symbol name highlighted */}
            {result.codeSnippet ? (
              <div className="text-[9px] text-slate-500 font-mono truncate flex-1" title={result.codeSnippet}>
                {(() => {
                  const snippet = result.codeSnippet;
                  const symbolName = result.name;
                  const index = snippet.indexOf(symbolName);

                  if (index === -1) {
                    return snippet;
                  }

                  return (
                    <>
                      <span>{snippet.slice(0, index)}</span>
                      <span className="text-white font-semibold">{highlightText(symbolName, 'name')}</span>
                      <span>{snippet.slice(index + symbolName.length)}</span>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-[11px] text-white font-mono font-semibold flex-1">
                {highlightText(result.name, 'name')}
              </div>
            )}

            {/* File location */}
            <div className="text-[9px] text-slate-500 font-mono flex-shrink-0" title={result.filePath}>
              {fileName}{result.lineNumber && `:${result.lineNumber}`}
            </div>
          </>
        )}
      </div>
    );
  }
);

SearchResultItem.displayName = 'SearchResultItem';
