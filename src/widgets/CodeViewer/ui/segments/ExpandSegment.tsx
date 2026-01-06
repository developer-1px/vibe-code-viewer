/**
 * ExpandSegment - 의존성 노드 열기 핸들러
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { hoveredIdentifierAtom } from '@/app/model/atoms';
import { visibleNodeIdsAtom } from '@/widgets/MainContents/PipelineCanvas/model/atoms';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import type { CodeSegment, SegmentStyle } from '../../core/types';

interface ExpandSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  isFocused?: boolean;
}

export const ExpandSegment: React.FC<ExpandSegmentProps> = ({ segment, node: _node, style, isFocused }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const hoveredIdentifier = useAtomValue(hoveredIdentifierAtom);
  const setHoveredIdentifier = useSetAtom(hoveredIdentifierAtom);

  const isHovered = hoveredIdentifier === segment.text;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!segment.nodeId) return;

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.add(segment.nodeId!);
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
    <>
      {/* ✅ Inlay Hint */}
      {segment.inlayHint && segment.inlayHint.position === 'before' && (
        <span className="text-[10px] bg-gray-500/10 text-gray-600 px-1 py-0.5 rounded mr-1 select-none pointer-events-none">
          {segment.inlayHint.text}
        </span>
      )}

      <span
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={className}
        title={style.title}
      >
        {segment.text}
      </span>

      {segment.inlayHint && segment.inlayHint.position === 'after' && (
        <span className="text-[10px] bg-gray-500/10 text-gray-600 px-1 py-0.5 rounded ml-1 select-none pointer-events-none">
          {segment.inlayHint.text}
        </span>
      )}
    </>
  );
};
