/**
 * ExternalSegment - 외부 import/closure/function 핸들러
 * - 일반 클릭: Focus mode toggle
 * - Cmd+Click: 노드 열기/닫기
 */

import React from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';
import type { CanvasNode } from '../../../../entities/CanvasNode';
import { visibleNodeIdsAtom, fullNodeMapAtom, activeLocalVariablesAtom, cardPositionsAtom, transformAtom } from '../../../../store/atoms';
import { pruneDetachedNodes } from '../../../PipelineCanvas/utils';

interface ExternalSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  isFocused?: boolean;
}

export const ExternalSegment: React.FC<ExternalSegmentProps> = ({ segment, node, style, isFocused }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setCardPositions = useSetAtom(cardPositionsAtom);
  const cardPositions = useAtomValue(cardPositionsAtom);
  const transform = useAtomValue(transformAtom);

  // Check if active
  const isActive = segment.kinds.includes('external-import') &&
    segment.definedIn &&
    (visibleNodeIds.has(segment.definedIn) || visibleNodeIds.has(segment.definedIn.split('::')[0]));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Cmd+Click: 노드 닫기만
    if (e.metaKey && segment.definedIn) {
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

          return pruneDetachedNodes(next, fullNodeMap, null, null);
        });
      }
      return;
    }

    // 일반 클릭: Focus mode toggle + 노드 열기/닫기
    // 1. Check if currently focused
    const nodeVars = activeLocalVariables.get(node.id);
    const wasFocused = nodeVars?.has(segment.text) || false;

    // 2. Focus mode toggle
    setActiveLocalVariables((prev: Map<string, Set<string>>) => {
      const next = new Map(prev);
      const nodeVars = new Set(next.get(node.id) || new Set());

      // Toggle
      if (nodeVars.has(segment.text)) {
        nodeVars.delete(segment.text);
      } else {
        nodeVars.add(segment.text);
      }

      if (nodeVars.size > 0) {
        next.set(node.id, nodeVars);
      } else {
        next.delete(node.id);
      }

      return next;
    });

    // 3. 노드 열기/닫기
    if (segment.definedIn) {
      if (wasFocused && isActive) {
        // Focus 해제 + 노드 열려있음 → 노드 닫기
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

          return pruneDetachedNodes(next, fullNodeMap, null, null);
        });
      } else if (!wasFocused && !isActive) {
        // Focus 추가 + 노드 안 열려있음 → 노드 열기
        let targetNodeId: string | null = null;

        if (fullNodeMap.has(segment.definedIn)) {
          targetNodeId = segment.definedIn;
          setVisibleNodeIds((prev: Set<string>) => {
            const next = new Set(prev);
            next.add(segment.definedIn!);
            return next;
          });
        } else {
          // 파일 노드 열기
          const filePath = segment.definedIn.split('::')[0];
          if (fullNodeMap.has(filePath)) {
            targetNodeId = filePath;
            setVisibleNodeIds((prev: Set<string>) => {
              const next = new Set(prev);
              next.add(filePath);
              return next;
            });
          }
        }

        // Calculate position for newly opened node
        if (targetNodeId) {
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
              next.set(targetNodeId!, { x: newX, y: newY });
              return next;
            });
          }
        }
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
