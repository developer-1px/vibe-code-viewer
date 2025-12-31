/**
 * CodeCardLineSlots - Line의 dependency slots 렌더링
 * identifier 토큰에 대한 input slot 표시
 */

import React from 'react';
import { useAtomValue } from 'jotai';
import { fullNodeMapAtom } from '../../../store/atoms';
import type { CodeLine } from '../../../entities/CodeRenderer/model/types';
import CodeCardSlot from './CodeCardSlot';

interface CodeCardLineSlotsProps {
  line: CodeLine;
}

export const CodeCardLineSlots: React.FC<CodeCardLineSlotsProps> = ({ line }) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  const slots = line.segments
    .filter(seg => seg.kinds.includes('identifier') && seg.nodeId)
    .map((seg, slotIdx) => {
      const depNode = fullNodeMap.get(seg.nodeId!);

      if (!depNode) return null;

      // Use pre-calculated definition location or fallback to startLine
      const defLine = seg.definitionLocation?.line ?? depNode.startLine;

      return (
        <CodeCardSlot
          key={`slot-${slotIdx}`}
          tokenId={seg.nodeId!}
          lineNum={line.num}
          slotIdx={slotIdx}
          depNode={depNode}
          definitionLine={defLine}
        />
      );
    })
    .filter(Boolean);

  return <>{slots}</>;
};

export default CodeCardLineSlots;
