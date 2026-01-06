/**
 * CloseSegment - 카드 닫기 핸들러
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { fullNodeMapAtom } from '../../../../app/model/atoms';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import { visibleNodeIdsAtom } from '../../../PipelineCanvas/model/atoms';
import { pruneDetachedNodes } from '../../../PipelineCanvas/utils';
import type { CodeSegment, SegmentStyle } from '../../core/types';

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
