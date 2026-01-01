/**
 * Search Results List Component
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  searchResultsAtom,
  searchFocusedIndexAtom,
  visibleNodeIdsAtom,
  targetLineAtom,
  openedFilesAtom,
  collapsedFoldersAtom,
  focusedPaneAtom,
  activeLocalVariablesAtom,
  fullNodeMapAtom,
  lastExpandedIdAtom,
} from '../../../store/atoms';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultsProps {
  onSelect: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ onSelect }) => {
  const results = useAtomValue(searchResultsAtom);
  const focusedIndex = useAtomValue(searchFocusedIndexAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const [collapsedFolders, setCollapsedFolders] = useAtom(collapsedFoldersAtom);
  const setOpenedFiles = useSetAtom(openedFilesAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const setTargetLine = useSetAtom(targetLineAtom);
  const setFocusedPane = useSetAtom(focusedPaneAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);

  const containerRef = useRef<HTMLDivElement>(null);
  const focusedItemRef = useRef<HTMLDivElement>(null);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedItemRef.current && containerRef.current) {
      const container = containerRef.current;
      const item = focusedItemRef.current;

      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.bottom > containerRect.bottom) {
        item.scrollIntoView({ block: 'end', behavior: 'auto' });
      } else if (itemRect.top < containerRect.top) {
        item.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
    }
  }, [focusedIndex]);

  const handleSelectResult = useCallback((result: typeof results[0]) => {
    if (result.type === 'file') {
      // Open file - add to openedFiles
      setOpenedFiles(prev => new Set([...prev, result.filePath]));
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
      console.log('[SearchResults] Symbol selected:', {
        name: result.name,
        nodeId: result.nodeId,
        filePath: result.filePath,
        lineNumber: result.lineNumber,
        nodeType: result.nodeType,
      });

      // For Usage: just open file and scroll to line
      if (result.nodeType === 'usage') {
        // Open file - add to openedFiles
        setOpenedFiles(prev => new Set([...prev, result.filePath]));

        // Scroll to the usage line
        setTargetLine({ nodeId: result.filePath, lineNum: result.lineNumber });

        setTimeout(() => {
          setTargetLine(null);
        }, 2000);

        return;
      }

      // For Declaration: open file and try to open node if available
      // Open the file containing this symbol
      setOpenedFiles(prev => new Set([...prev, result.filePath]));

      // Try to open the node containing this symbol (add to canvas)
      if (result.nodeId) {
        const targetNode = fullNodeMap.get(result.nodeId);
        console.log('[SearchResults] Target node:', targetNode);

        if (targetNode) {
          // Node exists in graph - open it in canvas with focus mode
          setVisibleNodeIds((prev: Set<string>) => {
            const next = new Set(prev);
            next.add(result.nodeId!);
            console.log('[SearchResults] Added to visibleNodeIds:', result.nodeId);
            return next;
          });

          setLastExpandedId(result.nodeId);

          // Activate focus mode for this symbol
          setActiveLocalVariables((prev: Map<string, Set<string>>) => {
            const next = new Map(prev);
            const nodeVars = new Set(next.get(result.nodeId!) || new Set());
            nodeVars.add(result.name); // Add the symbol name to focus
            next.set(result.nodeId!, nodeVars);
            console.log('[SearchResults] Activated focus mode for:', result.name);
            return next;
          });

          // Scroll to the definition line
          setTargetLine({ nodeId: result.nodeId, lineNum: result.lineNumber || 0 });

          // Focus canvas to show the node
          setFocusedPane('canvas');

          // Clear highlight after 2 seconds
          setTimeout(() => {
            setTargetLine(null);
          }, 2000);
        } else {
          // Node not in graph (orphaned) - just scroll to line in file
          console.log('[SearchResults] Node not in graph, scrolling to line in file');
          setTargetLine({ nodeId: result.filePath, lineNum: result.lineNumber || 0 });

          setTimeout(() => {
            setTargetLine(null);
          }, 2000);
        }
      } else {
        // No nodeId - just scroll to line
        console.log('[SearchResults] No nodeId, scrolling to line in file');
        setTargetLine({ nodeId: result.filePath, lineNum: result.lineNumber || 0 });

        setTimeout(() => {
          setTargetLine(null);
        }, 2000);
      }
    }

    onSelect();
  }, [setTargetLine, setOpenedFiles, collapsedFolders, setCollapsedFolders, setFocusedPane, setVisibleNodeIds, setActiveLocalVariables, fullNodeMap, onSelect]);

  // Handle Enter key to select focused result
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        handleSelectResult(results[focusedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, results, handleSelectResult]);

  if (results.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-theme-text-secondary text-[11px]">
        No results found
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[400px] overflow-y-auto overflow-x-hidden"
    >
      {results.map((result, index) => (
        <SearchResultItem
          key={result.id}
          result={result}
          isFocused={index === focusedIndex}
          onClick={() => handleSelectResult(result)}
          ref={index === focusedIndex ? focusedItemRef : null}
        />
      ))}
    </div>
  );
};
