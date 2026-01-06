/**
 * ExternalSegment - 외부 import/closure/function 핸들러
 * - IDE 모드: 일반 클릭으로 해당 파일 열고 정의 위치로 이동
 * - Canvas 모드: 일반 클릭으로 파일 열기, Cmd+Click으로 시점 이동
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import { fullNodeMapAtom, hoveredIdentifierAtom, viewModeAtom } from '../../../../app/model/atoms';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import { focusedNodeIdAtom } from '../../../IDEView/model/atoms';
import { cardPositionsAtom, transformAtom, visibleNodeIdsAtom } from '../../../PipelineCanvas/model/atoms';
import type { CodeSegment, SegmentStyle } from '../../core/types';

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
  const setFocusedNodeId = useSetAtom(focusedNodeIdAtom);
  const { openFile } = useOpenFile();
  const hoveredIdentifier = useAtomValue(hoveredIdentifierAtom);
  const setHoveredIdentifier = useSetAtom(hoveredIdentifierAtom);

  // Check if active
  const isActive =
    segment.kinds?.includes('external-import') &&
    segment.definedIn &&
    (visibleNodeIds.has(segment.definedIn) || visibleNodeIds.has(segment.definedIn.split('::')[0]));

  const isHovered = hoveredIdentifier === segment.text;

  const handleClick = (e: React.MouseEvent) => {
    console.log('[ExternalSegment] Clicked:', {
      text: segment.text,
      definedIn: segment.definedIn,
      definitionLocation: segment.definitionLocation,
      viewMode,
    });

    e.stopPropagation();

    // IDE 모드: 외부 파일을 새 탭으로 열고 정의 위치로 이동
    if (viewMode === 'ide' && segment.definedIn) {
      // definedIn에서 파일 경로 추출 (예: "src/store/atoms.ts" 또는 "src/store/atoms.ts::parseErrorAtom")
      const filePath = segment.definedIn.split('::')[0];

      console.log('[ExternalSegment] Opening external file:', filePath);

      // definitionLocation이 있고 filePath가 definedIn과 일치하면 라인 번호도 전달
      if (segment.definitionLocation && segment.definitionLocation.filePath === filePath) {
        openFile(filePath, {
          lineNumber: segment.definitionLocation.line,
        });
      } else {
        // 라인 번호 없이 파일만 열기
        openFile(filePath);
      }
      return;
    }

    // Canvas 모드: 기존 동작
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
          y: -((targetY + cardOffset.y) * scale - viewportHeight / 2),
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
        next.add(targetNode?.id);
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

        setCardPositions((prev) => {
          const next = new Map(prev);
          next.set(targetNode?.id, { x: newX, y: newY });
          return next;
        });
      }
    }
  };

  const handleMouseEnter = () => {
    setHoveredIdentifier(segment.text);
  };

  const handleMouseLeave = () => {
    setHoveredIdentifier(null);
  };

  const className = isFocused
    ? `${style.className} bg-cyan-500/30 rounded`
    : isHovered
      ? `${style.className} bg-yellow-400/20 rounded`
      : style.className;

  return (
    <span
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      title={style.title}
    >
      {segment.text}
    </span>
  );
};
