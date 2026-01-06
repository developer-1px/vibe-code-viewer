/**
 * LocalVariableSegment - 통합된 로컬 변수 핸들러
 * - 일반 클릭: Focus mode toggle
 * - Cmd+Click: 정의로 이동
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { hoveredIdentifierAtom } from '@/app/model/atoms';
import { useGotoDefinition } from '@/features/File/GotoDefinition/lib/useGotoDefinition.ts';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types.ts';
import type { CodeSegment, SegmentStyle } from '../../../../widgets/CodeViewer/core/types/codeLine.ts';
import { activeLocalVariablesAtom } from '../model/atoms.ts';

interface LocalVariableSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  isFocused?: boolean;
}

export const LocalVariableSegment: React.FC<LocalVariableSegmentProps> = ({ segment, node, style, isFocused }) => {
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const { handleGotoDefinitionByLocation } = useGotoDefinition();
  const hoveredIdentifier = useAtomValue(hoveredIdentifierAtom);
  const setHoveredIdentifier = useSetAtom(hoveredIdentifierAtom);

  const isHovered = hoveredIdentifier === segment.text;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Cmd+Click: 정의로 이동
    if (segment.definitionLocation) {
      const handled = handleGotoDefinitionByLocation(e, segment.definitionLocation);
      if (handled) {
        return; // Cmd+Click으로 처리됨, Focus mode toggle 스킵
      }
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
