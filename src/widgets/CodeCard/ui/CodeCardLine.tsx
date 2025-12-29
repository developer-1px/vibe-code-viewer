
import React, { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../../entities/CanvasNode';
import type { CodeLine } from '../../../entities/CodeRenderer/model/types';
import CodeCardSlot from './CodeCardSlot';
import CodeCardLineSegment from './CodeCardLineSegment';
import FoldButton from '../../../features/CodeFold/ui/FoldButton';
import FoldBadge from '../../../features/CodeFold/ui/FoldBadge';
import { fullNodeMapAtom, targetLineAtom } from '../../../store/atoms';

const CodeCardLine = ({line, node }: {
  line: CodeLine;
  node: CanvasNode;
}) => {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const targetLine = useAtomValue(targetLineAtom);
  const lineRef = useRef<HTMLDivElement>(null);

  const foldInfo = line.foldInfo;
  const isFolded = line.isFolded || false; // 🆕 line 자체에 fold 상태 저장됨
  const isInsideFold = line.isInsideFold || false; // 🆕 접힌 범위 내부 라인

  // Calculate definition line status
  const isDefinitionLine = line.num === node.startLine;
  const isTemplate = node.type === 'template';
  const hasDeclarationKeyword = line.hasDeclarationKeyword || false;

  // Check if this line is the target for Go to Definition
  const isTargetLine = targetLine?.nodeId === node.id && targetLine.lineNum === line.num;

  // Auto-scroll to target line
  useEffect(() => {
    if (isTargetLine && lineRef.current) {
      lineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isTargetLine]);

  // 접힌 범위 내부 라인은 숨김 처리 (Hook 호출 이후에 체크)
  if (isInsideFold) {
    return null;
  }

  // 최상위 return 문의 범위 찾기 (return 키워드 인덱스부터 세미콜론까지)
  let returnStartIdx = -1;
  let returnEndIdx = -1;

  if (line.hasTopLevelReturn) {
    returnStartIdx = line.segments.findIndex(seg => seg.kinds.includes('keyword') && seg.text === 'return');
    if (returnStartIdx !== -1) {
      // return 이후 세미콜론 찾기
      returnEndIdx = line.segments.findIndex((seg, idx) =>
        idx > returnStartIdx && seg.kinds.includes('punctuation') && seg.text === ';'
      );
      // 세미콜론이 없으면 라인 끝까지
      if (returnEndIdx === -1) {
        returnEndIdx = line.segments.length - 1;
      }
    }
  }

  return (
    <div
      ref={lineRef}
      className={`
        flex w-full group/line relative transition-colors
        ${isDefinitionLine && !isTemplate ? 'bg-vibe-accent/5' : ''}
        ${isTargetLine ? 'bg-yellow-400/20 ring-2 ring-yellow-400/50' : ''}
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
            // 하이라이트 조건: 선언 라인 || 접힌 라인 || foldable 라인
            (hasDeclarationKeyword && !(isDefinitionLine && isTemplate)) ||
            (isDefinitionLine && !isTemplate) ||
            isFolded ||
            foldInfo?.isFoldable
              ? 'text-vibe-accent font-bold'
              : ''
          }>
            {line.num}
          </span>

          {/* Fold Button */}
          <FoldButton
            nodeId={node.id}
            lineNum={line.num}
            foldInfo={foldInfo}
            isFolded={isFolded}
          />
        </div>
      </div>

      {/* Code Content Column: leading-5 (20px) + py-0.5 (2px) = 24px total height per line */}
      <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-5 overflow-x-auto whitespace-pre-wrap break-words">
        {line.segments.map((segment, segIdx) => {
          if (isFolded && segIdx === line.segments.length - 1) {
            // Statement block의 경우 마지막 { 제거
            if (segment.text.trim() === '{') {
              return null;
            }
            // JSX의 경우 마지막 > 제거
            if (segment.text.trim() === '>' && (foldInfo?.foldType === 'jsx-children' || foldInfo?.foldType === 'jsx-fragment')) {
              return null;
            }
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

        {/* Inline Fold Badge */}
        <FoldBadge
          nodeId={node.id}
          lineNum={line.num}
          isFolded={isFolded}
          foldedCount={line.foldedCount}
          foldInfo={foldInfo}
        />
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
