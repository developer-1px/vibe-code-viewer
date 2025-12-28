
import React from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../../CanvasNode';
import { CodeLine } from '../../lib/renderCodeLines.ts';
import CodeCardSlot from './CodeCardSlot.tsx';
import CodeCardLineSegment from './CodeCardLineSegment.tsx';
import { fullNodeMapAtom } from '../../../../store/atoms';

interface CodeCardLineProps {
  line: CodeLine;
  node: CanvasNode;
}

const CodeCardLine: React.FC<CodeCardLineProps> = ({ line, node }) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  // Calculate definition line status
  const isDefinitionLine = line.num === node.startLine;
  const isTemplate = node.type === 'template';
  const isModule = node.type === 'module';

  // 최상위 return 문의 범위 찾기 (return 키워드 인덱스부터 세미콜론까지)
  let returnStartIdx = -1;
  let returnEndIdx = -1;

  if (line.hasTopLevelReturn) {
    returnStartIdx = line.segments.findIndex(seg => seg.kind === 'keyword' && seg.text === 'return');
    if (returnStartIdx !== -1) {
      // return 이후 세미콜론 찾기
      returnEndIdx = line.segments.findIndex((seg, idx) =>
        idx > returnStartIdx && seg.kind === 'punctuation' && seg.text === ';'
      );
      // 세미콜론이 없으면 라인 끝까지
      if (returnEndIdx === -1) {
        returnEndIdx = line.segments.length - 1;
      }
    }
  }

  return (
    <div
      className={`
        flex w-full group/line relative
        ${isDefinitionLine && !isTemplate && !isModule ? 'bg-vibe-accent/5' : ''}
      `}
      data-line-num={line.num}
    >
      {/* Line Number Column: Aligned text-right, fixed leading/padding to match code */}
      {/* Reduced padding from pr-3 to pr-2 to allow more space for internal slots */}
      <div className="flex-none w-12 pr-2 text-right select-none text-xs font-mono text-slate-600 border-r border-white/5 bg-[#0f172a]/50 leading-5 py-0.5">
        <div className="relative inline-block w-full">
          {/* Render input slots for each dependency token in this line */}
          {line.segments.filter(seg => seg.kind === 'identifier' && seg.nodeId).map((seg, slotIdx) => {
            const depNode = fullNodeMap.get(seg.nodeId!);

            return (
              <CodeCardSlot
                key={`slot-${slotIdx}`}
                tokenId={seg.nodeId!}
                lineNum={line.num}
                slotIdx={slotIdx}
                depNode={depNode}
              />
            );
          })}

          <span className={isDefinitionLine && !isTemplate && !isModule ? 'text-vibe-accent font-bold' : ''}>
            {line.num}
          </span>
        </div>
      </div>

      {/* Code Content Column: leading-5 (20px) + py-0.5 (2px) = 24px total height per line */}
      <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-5 overflow-x-auto whitespace-pre-wrap break-words">
        {line.segments.map((segment, segIdx) => {
          const isInReturnStatement = returnStartIdx !== -1 && segIdx >= returnStartIdx && segIdx <= returnEndIdx;
          return (
            <CodeCardLineSegment
              key={segIdx}
              segment={segment}
              segIdx={segIdx}
              node={node}
              isInReturnStatement={isInReturnStatement}
            />
          );
        })}
      </div>

      {/* Output Port (Definition Line): Only show for nodes with actual definitions */}
      {isDefinitionLine && !isTemplate && !isModule && (
        <div
          className="absolute right-0 top-3 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%] ring-2 ring-vibe-panel"
          data-output-port={node.id}
        />
      )}
    </div>
  );
};

export default CodeCardLine;
