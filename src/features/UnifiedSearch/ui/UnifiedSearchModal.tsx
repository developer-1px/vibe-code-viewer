/**
 * Unified Search Modal - JetBrains-style search UI
 * Triggered by Shift+Shift
 */

import React, { useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  searchModalOpenAtom,
  searchQueryAtom,
  searchResultsAtom,
  searchFocusedIndexAtom,
  searchModeAtom,
  filesAtom,
  fullNodeMapAtom,
  symbolMetadataAtom,
} from '../../../store/atoms';
import { extractAllSearchableItems } from '../../../services/symbolExtractor';
import { searchResultsFuzzy } from '../lib/searchService';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';

export const UnifiedSearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(searchModalOpenAtom);
  const [query, setQuery] = useAtom(searchQueryAtom);
  const [results, setResults] = useAtom(searchResultsAtom);
  const [focusedIndex, setFocusedIndex] = useAtom(searchFocusedIndexAtom);

  const files = useAtomValue(filesAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const symbolMetadata = useAtomValue(symbolMetadataAtom);

  // Extract all searchable items (files + folders + symbols + usages) from single source
  const allSearchableItems = useMemo(() => {
    return extractAllSearchableItems(fullNodeMap, symbolMetadata, files);
  }, [fullNodeMap, symbolMetadata, files]);

  // Perform fuzzy search only
  useEffect(() => {
    if (!isOpen) return;

    // Empty query - show all results (limited)
    if (!query.trim()) {
      setResults(allSearchableItems.slice(0, 50));
      setFocusedIndex(0);
      return;
    }

    // Fuzzy search only
    searchResultsFuzzy(query, allSearchableItems).then(fuzzyResults => {
      console.log(`[Search] Query: "${query}", Results: ${fuzzyResults.length}`);
      if (fuzzyResults.length > 0 && fuzzyResults.length <= 20) {
        console.log('[Search] Top results:', fuzzyResults.map(r => `${r.name} (${r.type}) - ${r.filePath}`));
      }
      setResults(fuzzyResults);
      setFocusedIndex(0);
    });
  }, [query, allSearchableItems, isOpen, setResults, setFocusedIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results.length, setFocusedIndex]);

  const handleClose = () => {
    setIsOpen(false);
    // Keep query - don't clear it
    setResults([]);
    setFocusedIndex(0);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl bg-[#0f172a] border border-vibe-border rounded shadow-2xl overflow-hidden">
        {/* Search Input */}
        <SearchInput />

        {/* Search Results */}
        <SearchResults onSelect={handleClose} />

        {/* Footer */}
        <div className="px-2.5 py-1.5 bg-black/20 border-t border-vibe-border/50 flex items-center justify-between text-[9px] text-slate-500 font-mono">
          <div className="flex gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
            <span className="text-slate-600">|</span>
            <span className="text-vibe-accent/70">symbol/file or symbol file</span>
          </div>
          <div>Shift+Shift to open</div>
        </div>
      </div>
    </div>
  );
};
