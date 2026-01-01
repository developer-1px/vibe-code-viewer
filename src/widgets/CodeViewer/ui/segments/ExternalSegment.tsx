/**
 * ExternalSegment - 외부 import/closure/function 핸들러
 * - 일반 클릭: 파일 닫혀있으면 열기
 * - Cmd+Click: 해당 노드로 시점 이동 (Canvas) 또는 파일 전환 (IDE)
 */

import React from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../core/types';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import { visibleNodeIdsAtom, fullNodeMapAtom, cardPositionsAtom, transformAtom, viewModeAtom, focusedNodeIdAtom } from '../../../../store/atoms';
import { pruneDetachedNodes } from '../../../PipelineCanvas/utils';

interface ExternalSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  isFocused?: boolean;
}

export const ExternalSegment: React.FC<ExternalSegmentProps> = ({ segment, node, style, isFocused }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setCardPositions = useSetAtom(cardPositionsAtom);
  const cardPositions = useAtomValue(cardPositionsAtom);
  const transform = useAtomValue(transformAtom);
  const setTransform = useSetAtom(transformAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const setFocusedNodeId = useSetAtom(focusedNodeIdAtom);

  // Check if active
  const isActive = segment.kinds.includes('external-import') &&
    segment.definedIn &&
    (visibleNodeIds.has(segment.definedIn) || visibleNodeIds.has(segment.definedIn.split('::')[0]));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!segment.definedIn) return;

    // Find target node
    let targetNode = fullNodeMap.get(segment.definedIn);
    if (!targetNode) {
      // Try file node
      const filePath = segment.definedIn.split('::')[0];
      targetNode = fullNodeMap.get(filePath);
    }

    if (!targetNode) {
      console.warn('[ExternalSegment] Target node not found:', segment.definedIn);
      return;
    }

    // Cmd+Click: 해당 노드로 시점 이동
    if (e.metaKey) {
      if (viewMode === 'canvas') {
        // Canvas 모드: 카메라 이동
        const targetX = targetNode.x || 0;
        const targetY = targetNode.y || 0;
        const cardOffset = cardPositions.get(targetNode.id) || { x: 0, y: 0 };

        // Center the target node in viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scale = transform.k;

        setTransform({
          k: scale,
          x: -((targetX + cardOffset.x) * scale - viewportWidth / 2),
          y: -((targetY + cardOffset.y) * scale - viewportHeight / 2)
        });
      } else {
        // IDE 모드: 파일 전환
        setFocusedNodeId(targetNode.id);
      }
      return;
    }

    // 일반 클릭: 파일 닫혀있으면 열기
    if (!isActive) {
      // 노드 열기
      setVisibleNodeIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(targetNode!.id);
        return next;
      });

      // 카드 위치 계산
      const currentCard = document.getElementById(`node-${node.id}`);
      if (currentCard) {
        const cardRect = currentCard.getBoundingClientRect();
        const currentOffset = cardPositions.get(node.id) || { x: 0, y: 0 };

        // Get clicked element's position within the card
        const clickedElement = e.target as HTMLElement;
        const clickedRect = clickedElement.getBoundingClientRect();

        // Calculate relative Y position of clicked line within the card
        const relativeY = (clickedRect.top - cardRect.top) / transform.k;

        // Position new card to the left of current card
        const HORIZONTAL_SPACING = 600;
        const newX = node.x + currentOffset.x - HORIZONTAL_SPACING;
        const newY = node.y + currentOffset.y + relativeY - 100;

        setCardPositions(prev => {
          const next = new Map(prev);
          next.set(targetNode!.id, { x: newX, y: newY });
          return next;
        });
      }
    }
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
