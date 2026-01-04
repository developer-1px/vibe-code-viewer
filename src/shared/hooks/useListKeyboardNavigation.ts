/**
 * useListKeyboardNavigation - Headless keyboard navigation for flat lists
 * Provides arrow up/down navigation, enter to select, escape to close, and auto-scroll
 *
 * Usage:
 * ```tsx
 * const { focusedIndex, setFocusedIndex, itemRefs, scrollContainerRef } =
 *   useListKeyboardNavigation({
 *     items: searchResults,
 *     onSelect: (item) => handleSelect(item),
 *     onClose: () => setOpen(false),
 *     scope: 'search',
 *     enabled: isOpen,
 *   });
 *
 * return (
 *   <div ref={scrollContainerRef} className="overflow-y-auto">
 *     {items.map((item, index) => (
 *       <div
 *         key={item.id}
 *         ref={(el) => {
 *           if (el) itemRefs.current.set(index, el);
 *           else itemRefs.current.delete(index);
 *         }}
 *         className={index === focusedIndex ? 'focused' : ''}
 *       >
 *         {item.name}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
import { useEffect, useRef, useState } from 'react';
import { useHotkeys, useHotkeysContext } from 'react-hotkeys-hook';
import { useAutoScroll } from './useAutoScroll';

export interface UseListKeyboardNavigationProps<T> {
  /** Array of items to navigate */
  items: T[];
  /** Callback when item is selected (Enter key) */
  onSelect: (item: T, index: number) => void;
  /** Callback when escape is pressed (optional) */
  onClose?: () => void;
  /** react-hotkeys-hook scope (required for modal/conditional components) */
  scope?: string;
  /** Enable/disable navigation (default: true) */
  enabled?: boolean;
  /** Auto-scroll margin in pixels (default: 28 * 2) */
  scrollMargin?: number;
  /** Enable debug console logs */
  debug?: boolean;
  /** Initial focused index (default: 0) */
  initialIndex?: number;
  /** Enable keys in form tags (input/textarea) - default: true for search modals */
  enableOnFormTags?: boolean;
}

export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  onClose,
  scope,
  enabled = true,
  scrollMargin = 28 * 2,
  debug = false,
  initialIndex = 0,
  enableOnFormTags = true,
}: UseListKeyboardNavigationProps<T>) {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scope management for modal/conditional components
  const { enableScope, disableScope } = useHotkeysContext();

  useEffect(() => {
    if (!scope) return;

    if (enabled) {
      enableScope(scope);
      if (debug) {
        console.log(`[useListKeyboardNavigation] Enabled scope: ${scope}`);
      }
    } else {
      disableScope(scope);
      if (debug) {
        console.log(`[useListKeyboardNavigation] Disabled scope: ${scope}`);
      }
    }
  }, [enabled, scope, enableScope, disableScope, debug]);

  // Reset focusedIndex when items change
  useEffect(() => {
    setFocusedIndex(0);
  }, []);

  // Auto-scroll to focused item
  useAutoScroll({
    focusedIndex,
    itemRefs,
    scrollContainerRef,
    margin: scrollMargin,
    debug,
  });

  // Arrow Down - Move to next item
  useHotkeys(
    'down',
    (e) => {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
      if (debug) {
        console.log('[useListKeyboardNavigation] Down key - focusedIndex:', focusedIndex + 1);
      }
    },
    {
      scopes: scope ? [scope] : undefined,
      enabled,
      enableOnFormTags,
    },
    [items.length, debug, setFocusedIndex]
  );

  // Arrow Up - Move to previous item
  useHotkeys(
    'up',
    (e) => {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
      if (debug) {
        console.log('[useListKeyboardNavigation] Up key - focusedIndex:', focusedIndex - 1);
      }
    },
    {
      scopes: scope ? [scope] : undefined,
      enabled,
      enableOnFormTags,
    },
    [debug, setFocusedIndex]
  );

  // Enter - Select focused item
  useHotkeys(
    'enter',
    (e) => {
      e.preventDefault();
      if (items.length > 0 && items[focusedIndex]) {
        onSelect(items[focusedIndex], focusedIndex);
        if (debug) {
          console.log('[useListKeyboardNavigation] Enter key - selected index:', focusedIndex);
        }
      }
    },
    {
      scopes: scope ? [scope] : undefined,
      enabled,
      enableOnFormTags,
    },
    [items, focusedIndex, onSelect, debug]
  );

  // Escape - Close (optional)
  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      if (onClose) {
        onClose();
        if (debug) {
          console.log('[useListKeyboardNavigation] Escape key - closing');
        }
      }
    },
    {
      scopes: scope ? [scope] : undefined,
      enabled,
      enableOnFormTags,
    },
    [onClose, debug]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    itemRefs,
    scrollContainerRef,
  };
}
