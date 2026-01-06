/**
 * WorkspacePersistence - Workspace state persistence manager
 *
 * Responsibilities:
 * 1. Save workspace state to IndexedDB (visibleNodeIds, cardPositions, transform)
 * 2. Restore workspace state on app start
 * 3. Clean up chips for closed nodes
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { activeLocalVariablesAtom } from '@/features/Code/FocusMode/model/atoms';
import { loadWorkspaceState, saveWorkspaceState } from '../../shared/storage/indexedDB';
import { cardPositionsAtom, transformAtom, visibleNodeIdsAtom } from '../../widgets/PipelineCanvas/model/atoms';

export const WorkspacePersistence = () => {
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const cardPositions = useAtomValue(cardPositionsAtom);
  const setCardPositions = useSetAtom(cardPositionsAtom);
  const transform = useAtomValue(transformAtom);
  const setTransform = useSetAtom(transformAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);

  // Restore workspace state on app start
  useEffect(() => {
    loadWorkspaceState().then((state) => {
      if (state) {
        console.log('[Workspace] Restoring state:', state);
        setVisibleNodeIds(new Set(state.visibleNodeIds));
        setCardPositions(new Map(state.cardPositions));
        setTransform(state.transform);
      }
    });
  }, [setVisibleNodeIds, setCardPositions, setTransform]);

  // Save workspace state when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const state = {
        visibleNodeIds: Array.from(visibleNodeIds),
        cardPositions: Array.from(cardPositions.entries()),
        transform,
      };
      saveWorkspaceState(state).catch((err) => {
        console.error('[Workspace] Failed to save state:', err);
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [visibleNodeIds, cardPositions, transform]);

  // Clean up chips for closed nodes
  useEffect(() => {
    setActiveLocalVariables((prev: Map<string, Set<string>>) => {
      const next = new Map(prev);
      let changed = false;

      // Remove chips for closed nodes
      next.forEach((_identifiers, nodeId) => {
        if (!visibleNodeIds.has(nodeId)) {
          next.delete(nodeId);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [visibleNodeIds, setActiveLocalVariables]);

  // This component doesn't render anything
  return null;
};
