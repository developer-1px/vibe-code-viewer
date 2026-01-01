/**
 * Search Results List Component
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  searchResultsAtom,
  searchFocusedIndexAtom,
  targetLineAtom,
  openedFilesAtom,
  collapsedFoldersAtom,
  focusedPaneAtom,
  activeLocalVariablesAtom,
} from '../../../store/atoms';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultsProps {
  onSelect: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ onSelect }) => {
  const results = useAtomValue(searchResultsAtom);
  const focusedIndex = useAtomValue(searchFocusedIndexAtom);
  const [collapsedFolders, setCollapsedFolders] = useAtom(collapsedFoldersAtom);
  const setOpenedFiles = useSetAtom(openedFilesAtom);
  const setTargetLine = useSetAtom(targetLineAtom);
  const setFocusedPane = useSetAtom(focusedPaneAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);

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
      console.log('[SearchResults] CodeSymbol selected:', {
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

      // For Declaration: open file and scroll to symbol location
      // Open the file containing this symbol
      setOpenedFiles(prev => new Set([...prev, result.filePath]));

      // Activate focus mode for this symbol (using filePath as key)
      setActiveLocalVariables((prev: Map<string, Set<string>>) => {
        const next = new Map(prev);
        const nodeVars = new Set(next.get(result.filePath) || new Set());
        nodeVars.add(result.name); // Add the symbol name to focus
        next.set(result.filePath, nodeVars);
        console.log('[SearchResults] Activated focus mode for:', result.name, 'in file:', result.filePath);
        return next;
      });

      // Scroll to the definition line
      setTargetLine({ nodeId: result.filePath, lineNum: result.lineNumber || 0 });

      // Focus canvas to show the file
      setFocusedPane('canvas');

      // Clear highlight after 2 seconds
      setTimeout(() => {
        setTargetLine(null);
      }, 2000);
    }

    onSelect();
  }, [setTargetLine, setOpenedFiles, collapsedFolders, setCollapsedFolders, setFocusedPane, setActiveLocalVariables, onSelect]);

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
