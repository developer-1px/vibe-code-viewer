/**
 * ExternalSegment - 외부 import/closure/function 토글 핸들러
 */

import React from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';
import type { CanvasNode } from '../../../../entities/CanvasNode';
import { visibleNodeIdsAtom, fullNodeMapAtom, entryFileAtom, templateRootIdAtom } from '../../../../store/atoms';
import { pruneDetachedNodes } from '../../../PipelineCanvas/utils';

interface ExternalSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
}

export const ExternalSegment: React.FC<ExternalSegmentProps> = ({ segment, node, style }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);

  // Check if active
  const isActive = segment.kinds.includes('external-import') &&
    segment.definedIn &&
    (visibleNodeIds.has(segment.definedIn) || visibleNodeIds.has(segment.definedIn.split('::')[0]));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!segment.definedIn) return;

    // Toggle: 이미 열려있으면 닫기
    if (isActive) {
      setVisibleNodeIds((prev: Set<string>) => {
        const next = new Set(prev);

        // 함수/변수 노드가 열려있으면 제거
        if (fullNodeMap.has(segment.definedIn!) && next.has(segment.definedIn!)) {
          next.delete(segment.definedIn!);
        }

        // 파일 노드가 열려있으면 제거
        const filePath = segment.definedIn!.split('::')[0];
        if (fullNodeMap.has(filePath) && next.has(filePath)) {
          next.delete(filePath);
        }

        return pruneDetachedNodes(next, fullNodeMap, entryFile, templateRootId);
      });
      return;
    }

    // Open: 닫혀있으면 열기
    // 1. 해당 함수/변수 노드가 있으면 추가
    if (fullNodeMap.has(segment.definedIn)) {
      setVisibleNodeIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(segment.definedIn!);
        return next;
      });
      return;
    }

    // 2. 파일 노드 열기
    const filePath = segment.definedIn.split('::')[0];
    if (fullNodeMap.has(filePath)) {
      setVisibleNodeIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(filePath);
        return next;
      });
    }
  };

  return (
    <span onClick={handleClick} className={style.className} title={style.title}>
      {segment.text}
    </span>
  );
};
