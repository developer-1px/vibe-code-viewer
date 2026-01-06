/**
 * CodeLineSlots - Line의 dependency slots 렌더링
 * identifier 토큰에 대한 input slot 표시
 */

import { useAtomValue } from 'jotai';
import type React from 'react';
import { fullNodeMapAtom } from '../../../app/model/atoms';
import type { CodeLine } from '../core/types';
import CodeSlot from './CodeSlot';

interface CodeLineSlotsProps {
  line: CodeLine;
}

export const CodeLineSlots: React.FC<CodeLineSlotsProps> = ({ line }) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  const slots = line.segments
    .filter((seg) => seg.kinds?.includes('identifier') && seg.nodeId) // ✅ Bug fix: Optional chaining for kinds
    .map((seg, slotIdx) => {
      const depNode = fullNodeMap.get(seg.nodeId!);

      if (!depNode) return null;

      // Use pre-calculated definition location or fallback to startLine
      const defLine = seg.definitionLocation?.line ?? depNode.startLine;

      return (
        <CodeSlot
          key={`slot-${slotIdx}`}
          tokenId={seg.nodeId!}
          lineNum={line.num}
          slotIdx={slotIdx}
          depNode={depNode}
          definitionLine={defLine}
          symbolName={seg.text}
          isDead={seg.isDead} // ✅ Dead identifier 표시
        />
      );
    })
    .filter(Boolean);

  return <>{slots}</>;
};

export default CodeLineSlots;
