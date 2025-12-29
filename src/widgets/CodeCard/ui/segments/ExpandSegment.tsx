/**
 * ExpandSegment - 의존성 노드 열기 핸들러
 */

import React from 'react';
import { useSetAtom } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';
import type { CanvasNode } from '../../../../entities/CanvasNode';
import { visibleNodeIdsAtom } from '../../../../store/atoms';

interface ExpandSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
}

export const ExpandSegment: React.FC<ExpandSegmentProps> = ({ segment, node, style }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!segment.nodeId) return;

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.add(segment.nodeId!);
      return next;
    });
  };

  return (
    <span onClick={handleClick} className={style.className} title={style.title}>
      {segment.text}
    </span>
  );
};
