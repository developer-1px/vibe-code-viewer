/**
 * Inline Fold Badge Component
 * Shows {...} for statement blocks or ... /> for JSX elements
 */

import React from 'react';
import { useSetAtom } from 'jotai';
import { foldedLinesAtom } from '../../../store/atoms';
import type { FoldInfo } from '../lib/types';

const FoldBadge = ({
  nodeId,
  lineNum,
  isFolded,
  foldedCount,
  foldInfo
}: {
  nodeId: string;
  lineNum: number;
  isFolded: boolean;
  foldedCount?: number;
  foldInfo?: FoldInfo;
}) => {
  const setFoldedLinesMap = useSetAtom(foldedLinesAtom);

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

  // JSX element/fragment의 경우 "... />" 형태로 표시
  const isJsx = foldInfo?.foldType === 'jsx-children' || foldInfo?.foldType === 'jsx-fragment';
  const badgeText = isJsx ? '... />' : '{...}';

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
