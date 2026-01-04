/**
 * useTreeState - Tree state management hook
 * Manages collapsed paths and focused index with optional external control
 * Also handles auto-scroll to focused item with margin
 */
import { useCallback, useRef, useState } from 'react';
import { useAutoScroll } from '../../../hooks/useAutoScroll';

export interface UseTreeStateProps {
  /** External collapsed paths (optional) */
  collapsedPaths?: Set<string>;
  /** External collapse toggle handler (optional) */
  onToggleCollapse?: (path: string) => void;
  /** External focused index (optional) */
  focusedIndex?: number;
  /** External focus change handler (optional) */
  onFocusChange?: (index: number) => void;
  /** External item refs (optional) */
  itemRefs?: React.MutableRefObject<Map<number, HTMLElement>>;
  /** Scroll container ref - TreeView's root div (required for auto-scroll) */
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function useTreeState({
  collapsedPaths: externalCollapsed,
  onToggleCollapse: externalToggle,
  focusedIndex: externalFocused,
  onFocusChange: externalFocusChange,
  itemRefs: externalRefs,
  scrollContainerRef,
}: UseTreeStateProps = {}) {
  // Internal states (used when external state not provided)
  const [internalCollapsed, setInternalCollapsed] = useState<Set<string>>(new Set());
  const [internalFocused, setInternalFocused] = useState(0);
  const internalRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Use external state if provided, otherwise use internal state
  const collapsedPaths = externalCollapsed ?? internalCollapsed;
  const focusedIndex = externalFocused ?? internalFocused;
  const itemRefs = externalRefs ?? internalRefs;

  const toggleCollapse = useCallback(
    (path: string) => {
      if (externalToggle) {
        externalToggle(path);
      } else {
        setInternalCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(path)) {
            next.delete(path);
          } else {
            next.add(path);
          }
          return next;
        });
      }
    },
    [externalToggle]
  );

  const setFocusedIndex = useCallback(
    (index: number) => {
      if (externalFocusChange) {
        externalFocusChange(index);
      } else {
        setInternalFocused(index);
      }
    },
    [externalFocusChange]
  );

  // Auto-scroll to focused item using shared hook
  useAutoScroll({
    focusedIndex,
    itemRefs,
    scrollContainerRef: scrollContainerRef as React.RefObject<HTMLElement>,
    margin: 28 * 2,
    debug: true, // Enable debug logs for TreeView
  });

  return {
    collapsedPaths,
    toggleCollapse,
    focusedIndex,
    setFocusedIndex,
    itemRefs,
  };
}
