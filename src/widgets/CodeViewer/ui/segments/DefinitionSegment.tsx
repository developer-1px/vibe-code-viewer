/**
 * DefinitionSegment - Go to Definition 핸들러 (with hover tooltip)
 */

import React, { useState } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import type { CodeSegment, SegmentStyle } from '../../core/types';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom, targetLineAtom } from '../../../../store/atoms';

interface DefinitionSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
}

export const DefinitionSegment: React.FC<DefinitionSegmentProps> = ({ segment, node, style }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const setTargetLine = useSetAtom(targetLineAtom);

  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
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

  return (
    <span
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
