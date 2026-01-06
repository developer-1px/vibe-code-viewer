/**
 * FocusedIdentifierItem - Focus mode의 active identifier 표시 및 제거
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { fullNodeMapAtom } from '../../../../app/model/atoms.ts';
import { visibleNodeIdsAtom } from '../../../../widgets/PipelineCanvas/model/atoms.ts';
import { pruneDetachedNodes } from '../../../../widgets/PipelineCanvas/utils.ts';
import { activeLocalVariablesAtom } from '../model/atoms.ts';
import type { IdentifierMetadata } from './FocusedIdentifiers.tsx';

interface FocusedIdentifierItemProps {
  metadata: IdentifierMetadata;
  nodeId: string;
}

export const FocusedIdentifierItem: React.FC<FocusedIdentifierItemProps> = ({ metadata, nodeId }) => {
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const chipRef = useRef<HTMLDivElement>(null);

  const handleRemove = () => {
    // Deactivate (remove from focus mode)
    setActiveLocalVariables((prev: Map<string, Set<string>>) => {
      const next = new Map(prev);
      const nodeVars = new Set(next.get(nodeId) || new Set());

      nodeVars.delete(metadata.name);

      if (nodeVars.size > 0) {
        next.set(nodeId, nodeVars);
      } else {
        next.delete(nodeId);
      }

      return next;
    });

    // Close the node
    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);

      // Try to remove the specific node
      if (next.has(nodeId)) {
        next.delete(nodeId);
      }

      // Also try file node if it's a function/variable node
      const filePath = nodeId.split('::')[0];
      if (fullNodeMap.has(filePath) && next.has(filePath)) {
        next.delete(filePath);
      }

      return pruneDetachedNodes(next, fullNodeMap, null, null);
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleRemove();
  };

  // Delete/Backspace to remove
  useHotkeys('delete,backspace', handleRemove, {
    enabled: () => chipRef.current === document.activeElement,
    enableOnFormTags: false,
  });

  return (
    <div
      ref={chipRef}
      onClick={handleClick}
      className="
        group relative flex items-start gap-2 px-3 py-1.5 text-xs font-mono
        border-l-2 border-l-cyan-400 rounded-r transition-all duration-200
        cursor-pointer bg-cyan-500/10 hover:bg-cyan-500/20 focus:bg-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
      "
      title="Click or press Delete/Backspace to close"
    >
      {/* Identifier name */}
      <span className="flex-shrink-0 font-semibold text-cyan-100">{metadata.name}</span>

      {/* Type info summary */}
      {metadata.hoverInfo && (
        <span className="flex-1 text-theme-text-secondary truncate opacity-70">{metadata.hoverInfo}</span>
      )}

      {/* Close icon */}
      <span className="ml-auto text-cyan-400/60 group-hover:text-cyan-300 transition-colors">✕</span>

      {/* Active indicator */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-theme-panel" />
    </div>
  );
};
