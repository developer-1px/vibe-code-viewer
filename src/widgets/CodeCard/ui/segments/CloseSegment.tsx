/**
 * CloseSegment - 카드 닫기 핸들러
 */

import React from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';
import type { CanvasNode } from '../../../../entities/CanvasNode';
import { visibleNodeIdsAtom, fullNodeMapAtom } from '../../../../store/atoms';
import { pruneDetachedNodes } from '../../../PipelineCanvas/utils';

interface CloseSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
}

export const CloseSegment: React.FC<CloseSegmentProps> = ({ segment, node, style }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(node.id);
      return pruneDetachedNodes(next, fullNodeMap, null, null);
    });
  };

  return (
    <span onClick={handleClick} className={style.className} title={style.title}>
      {segment.text}
    </span>
  );
};
