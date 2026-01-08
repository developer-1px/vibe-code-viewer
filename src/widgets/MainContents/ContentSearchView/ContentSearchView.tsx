/**
 * ContentSearchView - File content search view (Cmd+Shift+F)
 * Grep-style search across all files (mainContent tab, not modal)
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { filesAtom, viewModeAtom } from '../../../entities/AppView/model/atoms';
import { useOpenFile } from '../../../features/File/OpenFiles/lib/useOpenFile';
import { searchInContent } from '../../../features/Search/ContentSearch/lib/searchContent';
import {
  contentSearchLoadingAtom,
  contentSearchOptionsAtom,
  contentSearchQueryAtom,
  contentSearchResultsAtom,
} from '../../../features/Search/ContentSearch/model/atoms';
import { useListKeyboardNavigation } from '../../../shared/hooks/useListKeyboardNavigation';

export function ContentSearchView() {
  const viewMode = useAtomValue(viewModeAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const [query, setQuery] = useAtom(contentSearchQueryAtom);
  const [options, setOptions] = useAtom(contentSearchOptionsAtom);
  const setResults = useSetAtom(contentSearchResultsAtom);
  const setLoading = useSetAtom(contentSearchLoadingAtom);
  const results = useAtomValue(contentSearchResultsAtom);
  const files = useAtomValue(filesAtom);
  const { openFile } = useOpenFile();

  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = viewMode === 'contentSearch';

  // Focus input when view opens
  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
    }
  }, [isActive]);

  // Debounced search
  useEffect(() => {
    if (!isActive) return;

    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        setLoading(true);
        const searchResults = searchInContent(files, query, options);
        setResults(searchResults);
        setLoading(false);
        // Note: focusedIndex is automatically reset to 0 by useListKeyboardNavigation when items change
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, options, files, isActive, setResults, setLoading]);

  // Flatten results for navigation
  const flatResults = useMemo(() => {
    const flat: Array<{ type: 'file' | 'match'; fileIndex: number; matchIndex?: number }> = [];
    results.forEach((result, fileIndex) => {
      flat.push({ type: 'file', fileIndex });
      result.matches.forEach((_, matchIndex) => {
        flat.push({ type: 'match', fileIndex, matchIndex });
      });
    });
    return flat;
  }, [results]);

  // Keyboard navigation with auto-scroll
  const { focusedIndex, setFocusedIndex, itemRefs, scrollContainerRef } = useListKeyboardNavigation({
    items: flatResults,
    onSelect: (item) => {
      const result = results[item.fileIndex];
      openFile(result.filePath);
      setViewMode('ide');
      // TODO: Scroll to line number if match item
    },
    onClose: () => {
      setViewMode('ide');
      setQuery('');
      setResults([]);
    },
    scope: 'contentSearch',
    enabled: isActive,
    enableOnFormTags: true,
  });

  let currentFlatIndex = 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-deep">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-DEFAULT bg-bg-elevated flex-shrink-0">
        <Search size={16} className="text-text-tertiary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in files... (Cmd+Shift+F)"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-tertiary outline-none"
        />
      </div>

      {/* Options */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border-DEFAULT bg-bg-elevated text-2xs flex-shrink-0">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={options.caseSensitive}
            onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })}
            className="rounded"
          />
          <span className="text-text-secondary">Case Sensitive</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={options.wholeWord}
            onChange={(e) => setOptions({ ...options, wholeWord: e.target.checked })}
            className="rounded"
          />
          <span className="text-text-secondary">Whole Word</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={options.useRegex}
            onChange={(e) => setOptions({ ...options, useRegex: e.target.checked })}
            className="rounded"
          />
          <span className="text-text-secondary">Use Regex</span>
        </label>
      </div>

      {/* Results */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            {query ? 'No results found' : 'Type to search...'}
          </div>
        ) : (
          <div className="py-2">
            {results.map((result, _fileIndex) => {
              const fileItemIndex = currentFlatIndex++;
              const isFileFocused = focusedIndex === fileItemIndex;

              return (
                <div key={result.filePath} className="mb-3">
                  {/* File header */}
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) itemRefs.current.set(fileItemIndex, el);
                      else itemRefs.current.delete(fileItemIndex);
                    }}
                    onClick={() => setFocusedIndex(fileItemIndex)}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-bg-elevated transition-colors ${
                      isFileFocused ? 'bg-bg-elevated' : ''
                    }`}
                  >
                    <span className="text-xs font-medium text-text-primary">{result.filePath}</span>
                    <span className="text-2xs text-text-tertiary">
                      {result.totalMatches} {result.totalMatches === 1 ? 'match' : 'matches'}
                    </span>
                  </button>

                  {/* Matches */}
                  <div className="space-y-0.5 ml-4">
                    {result.matches.map((match, matchIndex) => {
                      const matchItemIndex = currentFlatIndex++;
                      const isMatchFocused = focusedIndex === matchItemIndex;

                      return (
                        <button
                          key={matchIndex}
                          type="button"
                          ref={(el) => {
                            if (el) itemRefs.current.set(matchItemIndex, el);
                            else itemRefs.current.delete(matchItemIndex);
                          }}
                          onClick={() => setFocusedIndex(matchItemIndex)}
                          className={`w-full px-4 py-1 text-left hover:bg-bg-elevated transition-colors ${
                            isMatchFocused ? 'bg-bg-elevated' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 text-2xs">
                            <span className="text-text-tertiary font-mono">{match.line}</span>
                            <span className="text-text-secondary truncate font-mono">
                              {match.text.slice(0, match.matchStart)}
                              <span className="bg-warm-300/20 text-warm-300">
                                {match.text.slice(match.matchStart, match.matchEnd)}
                              </span>
                              {match.text.slice(match.matchEnd)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
