/**
 * CodeLineExportSlots - Line의 export slots 렌더링
 * export { foo, bar } 형태의 export 문에 대한 output slot 표시
 */

import { useAtomValue } from 'jotai';
import type React from 'react';
import { fullNodeMapAtom } from '../../../app/model/atoms';
import type { CodeLine } from '../core/types';
import CodeSlot from './CodeSlot';

interface CodeLineExportSlotsProps {
  line: CodeLine;
}

export const CodeLineExportSlots: React.FC<CodeLineExportSlotsProps> = ({ line }) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  if (!line.exportSlots || line.exportSlots.length === 0) {
    return null;
  }

  const slots = line.exportSlots
    .map((exportSlot, slotIdx) => {
      // TODO: nodeId 매핑이 구현되면 사용
      // 현재는 exportSlot.nodeId가 없을 수 있음
      if (!exportSlot.nodeId) {
        return null;
      }

      const depNode = fullNodeMap.get(exportSlot.nodeId);

      if (!depNode) return null;

      // Export slot은 선언된 위치를 가리킴
      const defLine = depNode.startLine;

      return (
        <CodeSlot
          key={`export-slot-${slotIdx}`}
          tokenId={exportSlot.nodeId}
          lineNum={line.num}
          slotIdx={slotIdx}
          depNode={depNode}
          definitionLine={defLine}
          isOutputSlot={true}
        />
      );
    })
    .filter(Boolean);

  return <>{slots}</>;
};

export default CodeLineExportSlots;
