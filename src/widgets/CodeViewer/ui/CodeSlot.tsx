
import React, { useMemo } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import { getSlotColor } from '../../../entities/SourceFileNode/lib/styleUtils';
import { targetLineAtom, visibleNodeIdsAtom, lastExpandedIdAtom, layoutLinksAtom } from '../../../store/atoms';
import { useEditorTheme } from '../../../app/theme';

const CodeSlot = ({tokenId, lineNum, slotIdx, depNode, definitionLine, isOutputSlot = false }: {
  tokenId: string;
  lineNum: number;
  slotIdx: number;
  depNode?: SourceFileNode;
  definitionLine?: number;
  isOutputSlot?: boolean;
}) => {
  const theme = useEditorTheme();
  const setTargetLine = useSetAtom(targetLineAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const layoutLinks = useAtomValue(layoutLinksAtom);

  // Check if this slot has an active connection
  const hasConnection = useMemo(() => {
    return layoutLinks.some(link => link.source === tokenId);
  }, [layoutLinks, tokenId]);

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
  // Input slots: left side (starting at 2px)
  // Output slots: right side (starting at 2px from right edge)
  const horizontalPos = 2 + (slotIdx * theme.dimensions.slotSpacing);
  const positionStyle = isOutputSlot
    ? { top: '6px', right: `${horizontalPos}px` }
    : { top: '6px', left: `${horizontalPos}px` };

  // Data attributes based on slot type
  const dataAttributes = isOutputSlot
    ? {
        'data-output-port': tokenId,
        'data-output-port-line': lineNum,
        'data-output-slot-for': tokenId,
        'data-output-slot-line': lineNum,
        'data-output-slot-def-line': definitionLine,
        'data-output-slot-unique': `${tokenId}::line${lineNum}`
      }
    : {
        'data-input-slot-for': tokenId,
        'data-input-slot-line': lineNum,
        'data-input-slot-def-line': definitionLine,
        'data-input-slot-unique': `${tokenId}::line${lineNum}`
      };

  // Border only shown when connected
  const borderClass = hasConnection ? 'border-2' : 'border-0';

  return (
    <div
      className={`${theme.dimensions.slotSize} rounded-full absolute z-10 transition-all duration-300 ${borderClass} group-hover/line:scale-110 shadow-lg cursor-pointer hover:scale-125 ${slotColorClass}`}
      style={positionStyle}
      {...dataAttributes}
      onClick={handleSlotClick}
    />
  );
};

export default CodeSlot;
