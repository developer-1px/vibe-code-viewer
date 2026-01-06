/**
 * useAutoScroll - Auto-scroll to focused item hook
 * Headless hook for automatic scrolling to keep focused item visible
 *
 * Extracted from useTreeState for reusability across all navigation components
 */
import { useEffect, useRef } from 'react';

export interface UseAutoScrollProps {
  /** Currently focused index */
  focusedIndex: number;
  /** Map of item refs (index -> HTMLElement) */
  itemRefs: React.MutableRefObject<Map<number, HTMLElement>>;
  /** Scroll container ref */
  scrollContainerRef: React.RefObject<HTMLElement>;
  /** Top/bottom margin in pixels (default: 28 * 2 = 2 items) */
  margin?: number;
  /** Enable debug console logs */
  debug?: boolean;
}

export function useAutoScroll({
  focusedIndex,
  itemRefs,
  scrollContainerRef,
  margin = 28 * 2,
  debug = false,
}: UseAutoScrollProps) {
  const prevFocusedIndexRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Skip if focusedIndex hasn't actually changed
    if (prevFocusedIndexRef.current === focusedIndex) {
      if (debug) {
        console.log('[useAutoScroll] Skipping auto-scroll - focusedIndex unchanged:', focusedIndex);
      }
      return;
    }

    // Update previous index
    prevFocusedIndexRef.current = focusedIndex;

    const scrollContainer = scrollContainerRef.current;

    // For first item (index 0) - scroll to top
    if (focusedIndex === 0) {
      if (scrollContainer) {
        if (debug) {
          console.log('[useAutoScroll] Scrolling to top for first item');
        }
        scrollContainer.scrollTop = 0;
      }
      return;
    }

    const focusedElement = itemRefs.current.get(focusedIndex);

    if (!focusedElement || !scrollContainer) {
      if (debug) {
        console.log('[useAutoScroll] Auto-scroll skipped:', {
          hasFocusedElement: !!focusedElement,
          hasScrollContainer: !!scrollContainer,
          focusedIndex,
        });
      }
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = focusedElement.getBoundingClientRect();

    // Skip if element is not yet laid out properly (width/height = 0)
    if (elementRect.width === 0 || elementRect.height === 0) {
      if (debug) {
        console.log('[useAutoScroll] Auto-scroll skipped - element not yet laid out:', {
          focusedIndex,
          width: elementRect.width,
          height: elementRect.height,
        });
      }
      return;
    }

    // Skip if element position seems invalid (way outside container)
    const maxDistance = containerRect.height * 3; // Allow 3x container height
    if (Math.abs(elementRect.top - containerRect.top) > maxDistance) {
      if (debug) {
        console.log('[useAutoScroll] Auto-scroll skipped - element position invalid:', {
          focusedIndex,
          elementTop: elementRect.top,
          containerTop: containerRect.top,
          distance: Math.abs(elementRect.top - containerRect.top),
          maxDistance,
        });
      }
      return;
    }

    if (debug) {
      console.log('[useAutoScroll] Auto-scroll check:', {
        focusedIndex,
        elementTop: elementRect.top,
        elementBottom: elementRect.bottom,
        containerTop: containerRect.top,
        containerBottom: containerRect.bottom,
        topThreshold: containerRect.top + margin,
        bottomThreshold: containerRect.bottom - margin,
      });
    }

    // Element above top threshold - scroll up
    if (elementRect.top < containerRect.top + margin) {
      const scrollAmount = containerRect.top + margin - elementRect.top;
      if (debug) {
        console.log('[useAutoScroll] Scrolling UP by:', scrollAmount);
      }
      scrollContainer.scrollTop -= scrollAmount;
    }
    // Element below bottom threshold - scroll down
    else if (elementRect.bottom > containerRect.bottom - margin) {
      const scrollAmount = elementRect.bottom - (containerRect.bottom - margin);
      if (debug) {
        console.log('[useAutoScroll] Scrolling DOWN by:', scrollAmount);
      }
      scrollContainer.scrollTop += scrollAmount;
    } else {
      if (debug) {
        console.log('[useAutoScroll] No scroll needed - element in view with margin');
      }
    }
  }, [focusedIndex, itemRefs, scrollContainerRef, margin, debug]);
}
