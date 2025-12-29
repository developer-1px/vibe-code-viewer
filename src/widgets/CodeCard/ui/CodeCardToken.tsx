
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { getTokenStyle } from '../../../entities/SourceFileNode/lib/styleUtils';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom, entryFileAtom, templateRootIdAtom } from '../../../store/atoms';
import { pruneDetachedNodes } from '../../PipelineCanvas/utils';

const CodeCardToken = ({text, tokenId, nodeId }: {
  text: string;
  tokenId: string;
  nodeId: string;
}) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);

  const isActive = visibleNodeIds.has(tokenId);
  
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

    let shouldCenterCamera = false;

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);

      // Check existence in the PREVIOUS state to ensure we are toggling correctly
      if (next.has(tokenId)) {
        // TOGGLE OFF (Fold)
        next.delete(tokenId);

        // When turning off, remove any nodes that are now "stranded" (unreachable)
        return pruneDetachedNodes(next, fullNodeMap, entryFile, templateRootId);
      } else {
        // TOGGLE ON (Add only this node, no recursive expansion)
        next.add(tokenId);
        shouldCenterCamera = true;
      }
      return next;
    });

    // Center camera when opening a node
    if (shouldCenterCamera) {
      setLastExpandedId(tokenId);
    }
  };

  return (
    <span
      data-token={tokenId}
      className={`
        inline-block px-0.5 rounded transition-all duration-200 select-text
        ${isLinkable ? 'cursor-pointer border' : 'cursor-default'}
        ${isLinkable
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

export default CodeCardToken;
