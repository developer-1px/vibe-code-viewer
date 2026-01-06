/**
 * CodeSymbol opening utilities - shared logic for expanding symbols in canvas
 */

import type { SetStateAction } from 'jotai';

interface OpenSymbolParams {
  nodeId: string;
  setVisibleNodeIds: (update: SetStateAction<Set<string>>) => void;
  setLastExpandedId: (update: SetStateAction<string | null>) => void;
}

/**
 * Open a symbol in the canvas
 * Expands the node and centers the camera on it
 */
export function openSymbol({ nodeId, setVisibleNodeIds, setLastExpandedId }: OpenSymbolParams): void {
  // Expand symbol node in canvas
  setVisibleNodeIds((prev) => {
    const next = new Set(prev);
    next.add(nodeId);
    return next;
  });

  // Center camera on the symbol
  setLastExpandedId(nodeId);
}
