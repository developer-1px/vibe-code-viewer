import React from 'react';
import { CanvasNode } from '../../model/types';
import { getSlotColor } from '../../lib/styleUtils';

interface CodeCardSlotProps {
  tokenId: string;
  lineNum: number;
  slotIdx: number;
  depNode?: CanvasNode;
  onSlotClick?: (tokenId: string) => void;
}

const CodeCardSlot: React.FC<CodeCardSlotProps> = ({ tokenId, lineNum, slotIdx, depNode, onSlotClick }) => {
  const slotColorClass = depNode
    ? getSlotColor(depNode.type)
    : 'bg-slate-500/60 border-slate-400/80 shadow-slate-500/30 group-hover/line:border-slate-300';

  return (
    <div
      className={`w-2 h-2 rounded-full absolute -left-3.5 transition-all duration-300 border-2 group-hover/line:scale-110 shadow-lg cursor-pointer hover:scale-125 ${slotColorClass}`}
      style={{ top: `${6 + slotIdx * 0}px` }}
      data-input-slot-for={tokenId}
      data-input-slot-line={lineNum}
      data-input-slot-unique={`${tokenId}::line${lineNum}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onSlotClick) {
          onSlotClick(tokenId);
        }
      }}
    />
  );
};

export default CodeCardSlot;
