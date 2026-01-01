/**
 * Code Fold Button Component
 * Chevron icon button for folding/unfolding code blocks
 */

import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { foldedLinesAtom } from '../model/atoms';
import type { CodeLine } from '../../../widgets/CodeViewer/core/types';
import type { CanvasNode } from '../../../entities/CanvasNode';

interface FoldButtonProps {
  line: CodeLine;
  node: CanvasNode;
}

const FoldButton: React.FC<FoldButtonProps> = ({ line, node }) => {
  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const setFoldedLinesMap = useSetAtom(foldedLinesAtom);

  const { foldInfo, num: lineNum } = line;
  const nodeId = node.id;

  // Calculate isFolded from atom state
  const foldedLines = foldedLinesMap.get(nodeId) || new Set<number>();
  const isFolded = foldInfo?.isFoldable && foldedLines.has(lineNum);

  if (!foldInfo?.isFoldable) {
    // Placeholder to maintain consistent spacing
    return <div className="flex-shrink-0 w-3 h-3" />;
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    setFoldedLinesMap((prev) => {
      const next = new Map(prev);
      const nodeFolds = new Set(next.get(nodeId) || new Set());

      if (nodeFolds.has(lineNum)) {
        nodeFolds.delete(lineNum);
      } else {
        nodeFolds.add(lineNum);
      }

      next.set(nodeId, nodeFolds);
      return next;
    });
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex-shrink-0 w-3 h-3 flex items-center justify-center transition-colors cursor-pointer ${
        isFolded
          ? 'text-vibe-accent hover:text-vibe-accent/80'
          : 'text-theme-text-tertiary hover:text-vibe-accent'
      }`}
      title={isFolded ? 'Unfold' : 'Fold'}
    >
      {/* Chevron SVG Icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-3 h-3 transition-transform ${isFolded ? '' : 'rotate-90'}`}
      >
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  );
};

export default FoldButton;
