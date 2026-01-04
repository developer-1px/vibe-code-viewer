/**
 * Unified Search Modal - LIMN Design System
 * Triggered by Shift+Shift
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { CommandPalette } from '@/components/ui/CommandPalette.tsx';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile.ts';
import { filesAtom, focusedPaneAtom, fullNodeMapAtom } from '../../../../app/model/atoms.ts';
import { searchResultsFuzzy } from '../lib/searchService.ts';
import { getAllSearchableItems } from '../lib/symbolExtractor.ts';
import {
  collapsedFoldersAtom,
  searchModalOpenAtom,
  searchQueryAtom,
  searchResultsAtom,
  symbolMetadataAtom,
} from '../model/atoms.ts';
import type { SearchResult } from '../model/types.ts';

export const UnifiedSearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(searchModalOpenAtom);
  const [query, setQuery] = useAtom(searchQueryAtom);
  const results = useAtomValue(searchResultsAtom);
  const setResults = useSetAtom(searchResultsAtom);
  const [_collapsedFolders, setCollapsedFolders] = useAtom(collapsedFoldersAtom);
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
      return;
    }

    // Fuzzy search only
    searchResultsFuzzy(query, allSearchableItems).then((fuzzyResults) => {
      console.log(`[Search] Query: "${query}", Results: ${fuzzyResults.length}`);
      if (fuzzyResults.length > 0 && fuzzyResults.length <= 20) {
        console.log(
          '[Search] Top results:',
          fuzzyResults.map((r) => `${r.name} (${r.type}) - ${r.filePath}`)
        );
      }
      setResults(fuzzyResults);
    });
  }, [query, allSearchableItems, isOpen, setResults]);

  // Handle close (defined first, used by handleSelectResult)
  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Keep query - don't clear it
    setResults([]);
  }, [setIsOpen, setResults]);

  // Handle result selection
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
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
        setCollapsedFolders((prev) => {
          const next = new Set(prev);
          for (const folder of foldersToOpen) {
            next.delete(folder);
          }
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
            lineNumber: result.lineNumber,
          });
        } else {
          // For Declaration: open file, scroll to symbol, and activate focus mode
          openFile(result.filePath, {
            lineNumber: result.lineNumber || 0,
            focusSymbol: result.name,
            focusPane: 'canvas',
          });

          console.log('[SearchResults] Activated focus mode for:', result.name, 'in file:', result.filePath);
        }
      }

      // Close modal
      handleClose();
    },
    [openFile, setCollapsedFolders, setFocusedPane, handleClose]
  );

  return (
    <CommandPalette
      open={isOpen}
      onOpenChange={setIsOpen}
      query={query}
      onQueryChange={setQuery}
      results={results}
      selectedIndex={0}
      onSelectedIndexChange={() => {}}
      onSelectResult={handleSelectResult}
    />
  );
};
