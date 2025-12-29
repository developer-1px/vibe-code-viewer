/**
 * FocusedIdentifierItem - Focus mode의 active identifier 표시 및 제거
 */

import React from 'react';
import { useSetAtom } from 'jotai';
import { activeLocalVariablesAtom } from '../model/atoms';
import type { IdentifierMetadata } from './FocusedIdentifiers';

interface FocusedIdentifierItemProps {
  metadata: IdentifierMetadata;
  nodeId: string;
}

export const FocusedIdentifierItem: React.FC<FocusedIdentifierItemProps> = ({ metadata, nodeId }) => {
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

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
  };

  return (
    <div
      onClick={handleClick}
      className="
        group relative flex items-start gap-2 px-3 py-1.5 text-xs font-mono
        border-l-2 border-l-cyan-400 rounded-r transition-all duration-200
        cursor-pointer bg-cyan-500/10 hover:bg-cyan-500/20
      "
      title="Click to deactivate highlight"
    >
      {/* Identifier name */}
      <span className="flex-shrink-0 font-semibold text-cyan-100">
        {metadata.name}
      </span>

      {/* Type info summary */}
      {metadata.hoverInfo && (
        <span className="flex-1 text-slate-400 truncate opacity-70">
          {metadata.hoverInfo}
        </span>
      )}

      {/* Close icon */}
      <span className="ml-auto text-cyan-400/60 group-hover:text-cyan-300 transition-colors">
        ✕
      </span>

      {/* Active indicator */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-vibe-panel" />
    </div>
  );
};
