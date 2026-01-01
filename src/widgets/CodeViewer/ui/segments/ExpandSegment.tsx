/**
 * ExpandSegment - 의존성 노드 열기 핸들러
 */

import React from 'react';
import { useSetAtom } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../core/types';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import { visibleNodeIdsAtom } from '../../../../store/atoms';

interface ExpandSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  isFocused?: boolean;
}

export const ExpandSegment: React.FC<ExpandSegmentProps> = ({ segment, node, style, isFocused }) => {
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

  const className = isFocused
    ? `${style.className} bg-cyan-500/30 rounded`
    : style.className;

  return (
    <span onClick={handleClick} className={className} title={style.title}>
      {segment.text}
    </span>
  );
};
