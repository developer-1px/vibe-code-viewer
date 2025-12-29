
import React from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { VariableNode } from '../../../entities/SourceFileNode/model/types';
import { getSlotColor } from '../../../entities/SourceFileNode/lib/styleUtils';
import { targetLineAtom, visibleNodeIdsAtom, lastExpandedIdAtom } from '../../../store/atoms';

const CodeCardSlot = ({tokenId, lineNum, slotIdx, depNode, definitionLine }: {
  tokenId: string;
  lineNum: number;
  slotIdx: number;
  depNode?: VariableNode;
  definitionLine?: number;
}) => {
  const setTargetLine = useSetAtom(targetLineAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);

  const slotColorClass = depNode
    ? getSlotColor(depNode.type)
    : 'bg-slate-500/60 border-slate-400/80 shadow-slate-500/30 group-hover/line:border-slate-300';

  const handleSlotClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!depNode) return;

    // Check if target node is visible
    const isVisible = visibleNodeIds.has(tokenId) || visibleNodeIds.has(tokenId.split('::')[0]);

    if (isVisible) {
      // Node is already visible - go to definition line
      setTargetLine({
        nodeId: tokenId,
        lineNum: depNode.startLine
      });
    } else {
      // Node is not visible - expand it first, then go to definition
      setLastExpandedId(tokenId);
      // Wait for node to be rendered, then scroll
      setTimeout(() => {
        setTargetLine({
          nodeId: tokenId,
          lineNum: depNode.startLine
        });
      }, 700); // Wait for expansion animation + layout
    }
  };

  // Vertical Center Calculation:
  // Line Height (leading-5) = 20px. Center = 10px.
  // Slot Height = 8px (h-2). Center = 4px.
  // Top Offset = 10px - 4px = 6px.
  
  // Horizontal Position:
  // Move inside column (starting at 2px).
  // Stagger multiple slots by 5px to avoid complete overlap while minimizing collision with line numbers.
  const leftPos = 2 + (slotIdx * 5);

  return (
    <div
      className={`w-2 h-2 rounded-full absolute z-10 transition-all duration-300 border-2 group-hover/line:scale-110 shadow-lg cursor-pointer hover:scale-125 ${slotColorClass}`}
      style={{ top: '6px', left: `${leftPos}px` }}
      data-input-slot-for={tokenId}
      data-input-slot-line={lineNum}
      data-input-slot-def-line={definitionLine}
      data-input-slot-unique={`${tokenId}::line${lineNum}`}
      onClick={handleSlotClick}
    />
  );
};

export default CodeCardSlot;
