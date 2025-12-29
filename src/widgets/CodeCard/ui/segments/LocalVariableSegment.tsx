/**
 * LocalVariableSegment - 로컬 변수 하이라이트 토글 핸들러
 */

import React from 'react';
import { useSetAtom } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';
import type { CanvasNode } from '../../../../entities/CanvasNode';
import { activeLocalVariablesAtom } from '../../../../store/atoms';

interface LocalVariableSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
}

export const LocalVariableSegment: React.FC<LocalVariableSegmentProps> = ({ segment, node, style }) => {
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

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

  return (
    <span onClick={handleClick} className={style.className} title={style.title}>
      {segment.text}
    </span>
  );
};
