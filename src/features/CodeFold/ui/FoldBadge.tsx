/**
 * Inline Fold Badge Component
 * Shows {...} for statement blocks or ... /> for JSX elements
 */

import React from 'react';
import { useSetAtom } from 'jotai';
import { foldedLinesAtom } from '../../../store/atoms';
import type { CodeLine } from '../../../entities/CodeRenderer/model/types';
import type { CanvasNode } from '../../../entities/CanvasNode';

interface FoldBadgeProps {
  line: CodeLine;
  node: CanvasNode;
  isFolded: boolean;
  foldedCount?: number;
}

const FoldBadge: React.FC<FoldBadgeProps> = ({ line, node, isFolded, foldedCount }) => {
  const setFoldedLinesMap = useSetAtom(foldedLinesAtom);

  const { foldInfo, num: lineNum } = line;
  const nodeId = node.id;

  if (!isFolded || foldedCount === undefined) {
    return null;
  }

  const handleUnfold = (e: React.MouseEvent) => {
    e.stopPropagation();

    setFoldedLinesMap((prev) => {
      const next = new Map(prev);
      const nodeFolds = new Set(next.get(nodeId) || new Set());
      nodeFolds.delete(lineNum);
      next.set(nodeId, nodeFolds);
      return next;
    });
  };

  // Fold type에 따라 다른 텍스트 표시
  const isJsx = foldInfo?.foldType === 'jsx-children' || foldInfo?.foldType === 'jsx-fragment';
  const isImport = foldInfo?.foldType === 'import-block';

  let badgeText = '{...}';
  if (isImport) {
    badgeText = '...';
  } else if (isJsx) {
    badgeText = '... />';
  }

  return (
    <span
      onClick={handleUnfold}
      className="ml-1 px-1 py-1 rounded bg-slate-700/40 text-slate-400 text-[10px] select-none border border-slate-600/30 cursor-pointer hover:bg-slate-600/60 hover:text-slate-300 hover:border-slate-500/50 transition-colors"
      title="Click to unfold"
    >
      {badgeText}
    </span>
  );
};

export default FoldBadge;
