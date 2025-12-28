
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { getTokenStyle } from '../../lib/styleUtils.ts';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom, entryFileAtom, templateRootIdAtom } from '../../../../store/atoms';
import { pruneDetachedNodes } from '../../../../widgets/PipelineCanvas/utils.ts';

interface CodeCardTokenProps {
  text: string;
  tokenId: string;
  nodeId: string;
}

const CodeCardToken: React.FC<CodeCardTokenProps> = ({ text, tokenId, nodeId }) => {
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

    // Use current state reference for decision making, but verify inside setter
    const forceExpand = e.metaKey || e.ctrlKey; // cmd (Mac) or ctrl (Windows/Linux)
    let isExpanding = false;

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);

      // Check existence in the PREVIOUS state to ensure we are toggling correctly
      if (next.has(tokenId) && !forceExpand) {
        // TOGGLE OFF (Fold)
        next.delete(tokenId);
        
        // When turning off, remove any nodes that are now "stranded" (unreachable)
        return pruneDetachedNodes(next, fullNodeMap, entryFile, templateRootId);
      } else {
        // TOGGLE ON (Unfold Recursively)
        isExpanding = true;
        
        const expandRecursive = (id: string) => {
          if (next.has(id)) return;
          next.add(id);

          const node = fullNodeMap.get(id);
          if (node) {
            // Stop expanding if we hit a template node
            if (node.type === 'template') return;

            node.dependencies.forEach(depId => {
              if (fullNodeMap.has(depId)) {
                expandRecursive(depId);
              }
            });
          }
        };

        expandRecursive(tokenId);
      }
      return next;
    });

    // Center camera if we are Unfolding (Expanding) OR force expanding
    if (isExpanding || forceExpand) {
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
