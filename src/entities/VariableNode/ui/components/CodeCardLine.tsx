
import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CanvasNode } from '../../../CanvasNode';
import { CodeLine } from '../../lib/renderCodeLines.ts';
import CodeCardSlot from './CodeCardSlot.tsx';
import CodeCardToken from './CodeCardToken.tsx';
import { fullNodeMapAtom, visibleNodeIdsAtom, entryFileAtom, templateRootIdAtom } from '../../../../store/atoms';
import { pruneDetachedNodes } from '../../../../widgets/PipelineCanvas/utils.ts';

interface CodeCardLineProps {
  line: CodeLine;
  node: CanvasNode;
  isDefinitionLine: boolean;
}

const CodeCardLine: React.FC<CodeCardLineProps> = ({
  line,
  node,
  isDefinitionLine
}) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);
  const isTemplate = node.type === 'template';

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

  const handleSelfClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Close this node and prune orphaned dependencies
    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(node.id);
      return pruneDetachedNodes(next, fullNodeMap, entryFile, templateRootId);
    });
  };

  const handleExternalRefClick = (e: React.MouseEvent, definedIn: string) => {
    e.stopPropagation();
    // definedIn이 있으면 해당 노드를 visibleNodeIds에 추가
    if (fullNodeMap.has(definedIn)) {
      setVisibleNodeIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(definedIn);
        return next;
      });
    }
  };

  return (
    <div
      className={`
        flex w-full group/line relative
        ${isDefinitionLine && !isTemplate ? 'bg-vibe-accent/5' : ''}
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

          <span className={isDefinitionLine && !isTemplate ? 'text-vibe-accent font-bold' : ''}>
            {line.num}
          </span>
        </div>
      </div>

      {/* Code Content Column: leading-5 (20px) + py-0.5 (2px) = 24px total height per line */}
      <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-5 overflow-x-auto whitespace-pre-wrap break-words">
        {line.segments.map((segment, segIdx) => {
          // return 문 범위 안에 있는지 확인
          const isInReturnStatement = returnStartIdx !== -1 && segIdx >= returnStartIdx && segIdx <= returnEndIdx;
          const returnBgClass = isInReturnStatement ? 'bg-green-500/10 px-0.5 rounded' : '';

          // Plain text
          if (segment.kind === 'text') {
            return <span key={segIdx} className={`text-slate-300 ${returnBgClass}`}>{segment.text}</span>;
          }

          // Keywords (export, function, const, return, etc.)
          if (segment.kind === 'keyword') {
            return <span key={segIdx} className={`text-purple-400 font-semibold ${returnBgClass}`}>{segment.text}</span>;
          }

          // Punctuation ({}, (), [], =>, :, ;, etc.)
          if (segment.kind === 'punctuation') {
            return <span key={segIdx} className={`text-slate-400 ${returnBgClass}`}>{segment.text}</span>;
          }

          // Strings
          if (segment.kind === 'string') {
            return <span key={segIdx} className={`text-orange-300 ${returnBgClass}`}>{segment.text}</span>;
          }

          // Comments
          if (segment.kind === 'comment') {
            return <span key={segIdx} className="text-slate-500 italic opacity-80">{segment.text}</span>;
          }

          // Self reference (node definition)
          if (segment.kind === 'self') {
            return (
              <span
                key={segIdx}
                onClick={handleSelfClick}
                title="Click to close this card"
                className="inline-block px-0.5 rounded bg-vibe-accent/10 text-vibe-accent font-bold cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:line-through transition-colors"
              >
                {segment.text}
              </span>
            );
          }

          // External Import Dependency
          if (segment.kind === 'external-import') {
            const hasDefinedIn = segment.definedIn && fullNodeMap.has(segment.definedIn);
            return (
              <span
                key={segIdx}
                onClick={hasDefinedIn ? (e) => handleExternalRefClick(e, segment.definedIn!) : undefined}
                className={`text-emerald-400 font-semibold underline decoration-dotted decoration-emerald-400/40 hover:bg-emerald-400/10 px-0.5 rounded transition-all ${hasDefinedIn ? 'cursor-pointer' : ''}`}
                title={hasDefinedIn ? `Click to show: ${segment.definedIn}` : `External Import: ${segment.text}`}
              >
                {segment.text}
              </span>
            );
          }

          // External Closure Dependency
          if (segment.kind === 'external-closure') {
            const hasDefinedIn = segment.definedIn && fullNodeMap.has(segment.definedIn);
            return (
              <span
                key={segIdx}
                onClick={hasDefinedIn ? (e) => handleExternalRefClick(e, segment.definedIn!) : undefined}
                className={`text-amber-400 font-semibold underline decoration-dotted decoration-amber-400/40 hover:bg-amber-400/10 px-0.5 rounded transition-all ${hasDefinedIn ? 'cursor-pointer' : ''}`}
                title={hasDefinedIn ? `Click to show: ${segment.definedIn}` : `Closure Variable: ${segment.text}`}
              >
                {segment.text}
              </span>
            );
          }

          // Local Variable
          if (segment.kind === 'local-variable') {
            return (
              <span
                key={segIdx}
                className="text-cyan-300 font-normal"
                title={`Local Variable: ${segment.text}`}
              >
                {segment.text}
              </span>
            );
          }

          // Regular identifier (dependency)
          if (segment.kind === 'identifier' && segment.nodeId) {
            return (
              <span key={segIdx} className={returnBgClass}>
                <CodeCardToken
                  text={segment.text}
                  tokenId={segment.nodeId}
                  nodeId={node.id}
                />
              </span>
            );
          }

          return null;
        })}
      </div>

      {/* Output Port (Definition Line): Centered vertically relative to the first line (12px top) */}
      {isDefinitionLine && !isTemplate && (
        <div
          className="absolute right-0 top-3 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%] ring-2 ring-vibe-panel"
          data-output-port={node.id}
        />
      )}
    </div>
  );
};

export default CodeCardLine;
