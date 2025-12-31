
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { getTokenStyle } from '../../../entities/SourceFileNode/lib/styleUtils';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom, activeLocalVariablesAtom, cardPositionsAtom, transformAtom } from '../../../store/atoms';
import { pruneDetachedNodes } from '../../PipelineCanvas/utils';

const CodeToken = ({text, tokenId, nodeId, lineHasFocusedVariable }: {
  text: string;
  tokenId: string;
  nodeId: string;
  lineHasFocusedVariable?: boolean;
}) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);
  const setCardPositions = useSetAtom(cardPositionsAtom);
  const cardPositions = useAtomValue(cardPositionsAtom);
  const transform = useAtomValue(transformAtom);

  const isActive = visibleNodeIds.has(tokenId);

  // Focus mode check (line이 focused면 무시)
  const focusedVariables = activeLocalVariables.get(nodeId);
  const hasFocusMode = !lineHasFocusedVariable && focusedVariables && focusedVariables.size > 0;
  
  // Check if this token refers to a Component
  const targetNode = fullNodeMap.get(tokenId);
  const isComponent = targetNode 
    ? /^[A-Z]/.test(targetNode.label) // e.g. "UserList", "Header"
    : /^[A-Z]/.test(text); // Fallback to text if node lookup fails

  // Check if the link target actually exists
  const isLinkable = fullNodeMap.has(tokenId);

  const handleTokenClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isLinkable) return;

    const isOpening = !visibleNodeIds.has(tokenId);

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);

      // Check existence in the PREVIOUS state to ensure we are toggling correctly
      if (next.has(tokenId)) {
        // TOGGLE OFF (Fold)
        next.delete(tokenId);

        // When turning off, remove any nodes that are now "stranded" (unreachable)
        return pruneDetachedNodes(next, fullNodeMap, null, null);
      } else {
        // TOGGLE ON (Add only this node, no recursive expansion)
        next.add(tokenId);
      }
      return next;
    });

    // Calculate position for newly opened node
    if (isOpening) {
      // Get current card's DOM element
      const currentCard = document.getElementById(`node-${nodeId}`);
      if (currentCard) {
        const cardRect = currentCard.getBoundingClientRect();

        // Get current card's position (including offset)
        const currentNode = fullNodeMap.get(nodeId);
        const currentOffset = cardPositions.get(nodeId) || { x: 0, y: 0 };

        if (currentNode) {
          // Get clicked element's position within the card
          const clickedElement = e.target as HTMLElement;
          const clickedRect = clickedElement.getBoundingClientRect();

          // Calculate relative Y position of clicked line within the card
          const relativeY = (clickedRect.top - cardRect.top) / transform.k;

          // Position new card to the left of current card
          const HORIZONTAL_SPACING = 600; // Distance to the left
          const newX = currentNode.x + currentOffset.x - HORIZONTAL_SPACING;
          const newY = currentNode.y + currentOffset.y + relativeY - 100; // Align with clicked line (offset for header)

          setCardPositions(prev => {
            const next = new Map(prev);
            next.set(tokenId, { x: newX, y: newY });
            return next;
          });
        }
      }
    }
  };

  return (
    <span
      data-token={tokenId}
      className={`
        inline-block px-0.5 rounded transition-all duration-200 select-text
        ${isLinkable ? 'cursor-pointer border' : 'cursor-default'}
        ${hasFocusMode
          ? 'text-slate-600' // Focus mode: grayscale
          : isLinkable
            ? getTokenStyle(isActive, isComponent)
            : (isComponent ? 'text-emerald-300' : 'text-blue-300') // Fallback style for broken/missing links
        }
      `}
      onClick={isLinkable ? handleTokenClick : undefined}
    >
      {text}
    </span>
  );
};

export default CodeToken;
