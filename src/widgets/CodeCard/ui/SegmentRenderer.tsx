/**
 * Segment 렌더러 - Builder + 공통 컴포넌트 패턴
 */

import React, { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { CodeSegment } from '../../../entities/CodeSegment';
import type { CanvasNode } from '../../../entities/CanvasNode';
import { buildSegmentStyle } from '../../../entities/CodeSegment';
import CodeCardToken from './CodeCardToken';
import { fullNodeMapAtom, visibleNodeIdsAtom, entryFileAtom, templateRootIdAtom, lastExpandedIdAtom, targetLineAtom } from '../../../store/atoms';
import { pruneDetachedNodes } from '../../PipelineCanvas/utils';

export const SegmentRenderer = ({
  segment,
  segIdx,
  node,
  isInReturnStatement
}: {
  segment: CodeSegment;
  segIdx: number;
  node: CanvasNode;
  isInReturnStatement: boolean;
}) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const setTargetLine = useSetAtom(targetLineAtom);

  const [showTooltip, setShowTooltip] = useState(false);

  // external-import의 active 상태 체크 (해당 노드가 열려있는지)
  const isExternalActive = segment.kinds.includes('external-import') &&
    segment.definedIn &&
    (visibleNodeIds.has(segment.definedIn) || visibleNodeIds.has(segment.definedIn.split('::')[0]));

  // Build style
  const style = buildSegmentStyle(segment.kinds, {
    isDeclarationName: segment.isDeclarationName,
    hasNodeId: !!segment.nodeId,
    hasDefinedIn: !!segment.definedIn,
    hasDefinition: !!segment.definitionLocation,
    hasHoverInfo: !!segment.hoverInfo,
    isInReturn: isInReturnStatement,
    isActive: isExternalActive
  });

  // Click handlers
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(node.id);
      return pruneDetachedNodes(next, fullNodeMap, entryFile, templateRootId);
    });
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!segment.nodeId) return;

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.add(segment.nodeId!);
      return next;
    });
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!segment.definedIn) return;

    // Toggle: 이미 열려있으면 닫기
    if (isExternalActive) {
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

  const handleDefinitionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!segment.definitionLocation) return;

    const { filePath, line } = segment.definitionLocation;

    // Find all nodes from the target file
    const nodesInFile = Array.from(fullNodeMap.values()).filter(
      n => n.filePath === filePath
    );

    // Find the node that contains this line
    let targetNode = nodesInFile.find(n => n.startLine === line);

    if (!targetNode) {
      targetNode = nodesInFile.find(
        n =>
          n.startLine !== undefined &&
          line >= n.startLine
      );
    }

    if (!targetNode) {
      // Fallback: open file node
      targetNode = fullNodeMap.get(filePath);
    }

    if (!targetNode) {
      console.warn('[Go to Definition] No node found for', { filePath, line });
      return;
    }

    // Open the target node
    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.add(targetNode!.id);
      return next;
    });

    setLastExpandedId(targetNode.id);
    setTargetLine({ nodeId: targetNode.id, lineNum: line });

    setTimeout(() => {
      setTargetLine(null);
    }, 2000);
  };

  // Click handler 매핑
  const handleClick = style.clickable
    ? style.clickType === 'close'
      ? handleCloseClick
      : style.clickType === 'expand'
      ? handleExpandClick
      : style.clickType === 'external'
      ? handleExternalClick
      : style.clickType === 'definition'
      ? handleDefinitionClick
      : undefined
    : undefined;

  // Special case: identifier with nodeId → CodeCardToken (INPUT slot용)
  // 단, external-* 종류는 제외 (이들은 definedIn을 사용하고 클릭 핸들러가 별도로 있음)
  if (
    segment.kinds.includes('identifier') &&
    segment.nodeId &&
    !segment.kinds.includes('external-import') &&
    !segment.kinds.includes('external-closure') &&
    !segment.kinds.includes('external-function')
  ) {
    return (
      <span key={segIdx} className={style.className}>
        <CodeCardToken
          text={segment.text}
          tokenId={segment.nodeId}
          nodeId={node.id}
        />
      </span>
    );
  }

  // 공통 렌더링
  return (
    <span
      key={segIdx}
      onClick={handleClick}
      onMouseEnter={style.hoverTooltip ? () => setShowTooltip(true) : undefined}
      onMouseLeave={style.hoverTooltip ? () => setShowTooltip(false) : undefined}
      className={style.className}
      title={style.title}
    >
      {segment.text}

      {/* Hover Tooltip */}
      {showTooltip && segment.hoverInfo && (
        <div className="absolute bottom-full left-0 mb-1 z-50 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 whitespace-pre-wrap max-w-md shadow-lg pointer-events-none">
          <code className="font-mono text-[10px]">{segment.hoverInfo}</code>
        </div>
      )}
    </span>
  );
};
