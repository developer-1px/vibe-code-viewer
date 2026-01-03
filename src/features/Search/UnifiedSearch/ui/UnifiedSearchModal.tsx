/**
 * Unified Search Modal - LIMN Design System
 * Triggered by Shift+Shift
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { searchModalOpenAtom, searchQueryAtom, searchResultsAtom, searchFocusedIndexAtom, symbolMetadataAtom, collapsedFoldersAtom } from '../model/atoms';
import { filesAtom, fullNodeMapAtom, focusedPaneAtom } from '../../../app/model/atoms';
import { getAllSearchableItems } from '../lib/symbolExtractor';
import { searchResultsFuzzy } from '../lib/searchService';
import { useOpenFile } from '../../Files/lib/useOpenFile';
import { CommandPalette } from '@/components/ui/CommandPalette';
import type { SearchResult } from '../model/types';

export const UnifiedSearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(searchModalOpenAtom);
  const [query, setQuery] = useAtom(searchQueryAtom);
  const [results, setResults] = useAtom(searchResultsAtom);
  const [focusedIndex, setFocusedIndex] = useAtom(searchFocusedIndexAtom);
  const [collapsedFolders, setCollapsedFolders] = useAtom(collapsedFoldersAtom);
  const setFocusedPane = useSetAtom(focusedPaneAtom);

  const files = useAtomValue(filesAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const symbolMetadata = useAtomValue(symbolMetadataAtom);

  const { openFile } = useOpenFile();

  // Get all searchable items (files + folders + symbols + usages) from single source
  const allSearchableItems = useMemo(() => {
    return getAllSearchableItems(fullNodeMap, symbolMetadata, files);
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

  // Handle result selection
  const handleSelectResult = useCallback((result: SearchResult) => {
    if (result.type === 'file') {
      // Open file
      openFile(result.filePath);
    } else if (result.type === 'folder') {
      // Open folder in FolderView (expand recursively)
      const folderPath = result.filePath;

      // Get all parent folders (recursively)
      const parts = folderPath.split('/');
      const foldersToOpen: string[] = [];
      for (let i = 1; i <= parts.length; i++) {
        const parentFolder = parts.slice(0, i).join('/');
        if (parentFolder) {
          foldersToOpen.push(parentFolder);
        }
      }

      // Remove all parent folders from collapsed set
      setCollapsedFolders(prev => {
        const next = new Set(prev);
        foldersToOpen.forEach(folder => next.delete(folder));
        return next;
      });

      // Focus sidebar
      setFocusedPane('sidebar');
    } else if (result.type === 'symbol') {
      console.log('[SearchResults] CodeSymbol selected:', {
        name: result.name,
        nodeId: result.nodeId,
        filePath: result.filePath,
        lineNumber: result.lineNumber,
        nodeType: result.nodeType,
      });

      // For Usage: just open file and scroll to line
      if (result.nodeType === 'usage') {
        openFile(result.filePath, {
          lineNumber: result.lineNumber
        });
      } else {
        // For Declaration: open file, scroll to symbol, and activate focus mode
        openFile(result.filePath, {
          lineNumber: result.lineNumber || 0,
          focusSymbol: result.name,
          focusPane: 'canvas'
        });

        console.log('[SearchResults] Activated focus mode for:', result.name, 'in file:', result.filePath);
      }
    }

    // Close modal
    handleClose();
  }, [openFile, setCollapsedFolders, setFocusedPane]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Keep query - don't clear it
    setResults([]);
    setFocusedIndex(0);
  }, [setIsOpen, setResults, setFocusedIndex]);

  return (
    <CommandPalette
      open={isOpen}
      onOpenChange={setIsOpen}
      query={query}
      onQueryChange={setQuery}
      results={results}
      selectedIndex={focusedIndex}
      onSelectedIndexChange={setFocusedIndex}
      onSelectResult={handleSelectResult}
    />
  );
};
