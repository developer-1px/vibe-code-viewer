
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
  onToggleFold: (lineNum: number) => void;  // 🆕 토글 콜백
}

const CodeCardLine: React.FC<CodeCardLineProps> = ({ line, node, onToggleFold }) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const foldInfo = line.foldInfo;
  const isFolded = line.isFolded || false; // 🆕 line 자체에 fold 상태 저장됨

  // Calculate definition line status
  const isDefinitionLine = line.num === node.startLine;
  const isTemplate = node.type === 'template';
  const isModule = node.type === 'module';
  const hasDeclarationKeyword = line.hasDeclarationKeyword || false;

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
      {/* w-16 (64px) for line number + fold button space */}
      <div className="flex-none w-16 pr-2 text-right select-none text-xs font-mono text-slate-600 border-r border-white/5 bg-[#0f172a]/50 leading-5 py-0.5">
        <div className="relative inline-block w-full flex items-center justify-end gap-1">
          {/* Render input slots for each dependency token in this line */}
          {/* 외부 모듈 import (depNode 없음)는 제외 */}
          {line.segments
            .filter(seg => seg.kind === 'identifier' && seg.nodeId)
            .map((seg, slotIdx) => {
              const depNode = fullNodeMap.get(seg.nodeId!);
              return depNode ? (
                <CodeCardSlot
                  key={`slot-${slotIdx}`}
                  tokenId={seg.nodeId!}
                  lineNum={line.num}
                  slotIdx={slotIdx}
                  depNode={depNode}
                />
              ) : null;
            })
            .filter(Boolean)}

          <span className={
            // 선언 라인에 색상 (템플릿 정의 라인은 제외)
            (hasDeclarationKeyword && !(isDefinitionLine && isTemplate)) || (isDefinitionLine && !isTemplate)
              ? 'text-vibe-accent font-bold'
              : ''
          }>
            {line.num}
          </span>

          {/* 🆕 Fold 버튼 또는 Placeholder (항상 w-3 h-3 공간 확보) */}
          {foldInfo?.isFoldable ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFold(line.num);
              }}
              className={`flex-shrink-0 w-3 h-3 flex items-center justify-center transition-colors cursor-pointer ${
                isFolded
                  ? 'text-vibe-accent hover:text-vibe-accent/80'
                  : 'text-slate-500 hover:text-vibe-accent'
              }`}
              title={isFolded ? 'Unfold' : 'Fold'}
            >
              {/* Chevron SVG 아이콘 */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-3 h-3 transition-transform ${isFolded ? '' : 'rotate-90'}`}
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          ) : (
            <div className="flex-shrink-0 w-3 h-3" />
          )}
        </div>
      </div>

      {/* Code Content Column: leading-5 (20px) + py-0.5 (2px) = 24px total height per line */}
      <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-5 overflow-x-auto whitespace-pre-wrap break-words">
        {line.segments.map((segment, segIdx) => {
          // 🆕 접힌 라인의 마지막 { 제거 (배지에 포함시키기 위해)
          if (isFolded && segIdx === line.segments.length - 1 && segment.text.trim() === '{') {
            return null;
          }

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

        {/* 🆕 접힌 상태면 {...} 전체 표시 (클릭 시 unfold) */}
        {isFolded && line.foldedCount !== undefined && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onToggleFold(line.num);
            }}
            className="ml-1 px-1 py-1 rounded bg-slate-700/40 text-slate-400 text-[10px] select-none border border-slate-600/30 cursor-pointer hover:bg-slate-600/60 hover:text-slate-300 hover:border-slate-500/50 transition-colors"
            title="Click to unfold"
          >
            {'{...}'}
          </span>
        )}
      </div>

      {/* Output Port: Show for declaration keyword lines (함수 본문 내 선언) */}
      {/* 함수 정의 라인(isDefinitionLine && isTemplate)은 제외 */}
      {hasDeclarationKeyword && !(isDefinitionLine && isTemplate) && (
        <div
          className="absolute right-0 top-3 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%] ring-2 ring-vibe-panel"
          data-output-port={node.id}
        />
      )}

      {/* Definition line port: 모듈과 일반 함수의 정의 라인 */}
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
