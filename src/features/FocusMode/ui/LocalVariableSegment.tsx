/**
 * LocalVariableSegment - 통합된 로컬 변수 핸들러
 * - 일반 클릭: Focus mode toggle
 * - Cmd+Click: 정의로 이동
 */

import React from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../../widgets/CodeViewer/core/types/codeLine';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';
import { activeLocalVariablesAtom } from '../model/atoms';
import {
  visibleNodeIdsAtom,
  fullNodeMapAtom,
  lastExpandedIdAtom,
  targetLineAtom
} from '../../../store/atoms';

interface LocalVariableSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  isFocused?: boolean;
}

export const LocalVariableSegment: React.FC<LocalVariableSegmentProps> = ({ segment, node, style, isFocused }) => {
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const setTargetLine = useSetAtom(targetLineAtom);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Cmd+Click: 정의로 이동
    if (e.metaKey && segment.definitionLocation) {
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

      return;
    }

    // 일반 클릭: Focus mode toggle
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
