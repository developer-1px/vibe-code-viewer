
import React, { useEffect, useRef, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../../entities/CanvasNode';
import type { CodeLine } from '../../../entities/CodeRenderer/model/types';
import CodeCardLineSlots from './CodeCardLineSlots';
import CodeCardLineSegment from './CodeCardLineSegment';
import FoldButton from '../../../features/CodeFold/ui/FoldButton';
import FoldBadge from '../../../features/CodeFold/ui/FoldBadge';
import { targetLineAtom, foldedLinesAtom } from '../../../store/atoms';

const CodeCardLine = ({
  line,
  node,
  foldRanges
}: {
  line: CodeLine;
  node: CanvasNode;
  foldRanges: Array<{ start: number; end: number }>;
}) => {
  const targetLine = useAtomValue(targetLineAtom);
  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const lineRef = useRef<HTMLDivElement>(null);

  // Calculate definition line status
  const isDefinitionLine = line.num === node.startLine;
  const hasDeclarationKeyword = line.hasDeclarationKeyword || false;

  // Check if this line is the target for Go to Definition
  const isTargetLine = targetLine?.nodeId === node.id && targetLine.lineNum === line.num;

  // Fold 상태 계산
  const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();
  const isFolded = line.foldInfo?.isFoldable && foldedLines.has(line.num);
  const foldedCount = isFolded && line.foldInfo ? line.foldInfo.foldEnd - line.foldInfo.foldStart : undefined;

  // Line number 스타일 계산 (useMemo로 캐싱)
  const lineNumberClassName = useMemo(() => {
    const isHighlighted =
      hasDeclarationKeyword ||
      isDefinitionLine ||
      isFolded ||
      line.foldInfo?.isFoldable;

    return isHighlighted ? 'text-vibe-accent font-bold' : '';
  }, [hasDeclarationKeyword, isDefinitionLine, isFolded, line.foldInfo]);

  // Auto-scroll to target line
  useEffect(() => {
    if (isTargetLine && lineRef.current) {
      lineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isTargetLine]);

  // 접힌 범위 내부 라인은 숨김 처리 (모든 Hook 호출 이후에 체크)
  const isInsideFold = foldRanges.some(range =>
    line.num > range.start && line.num <= range.end
  );

  if (isInsideFold) {
    return null;
  }

  return (
    <div
      ref={lineRef}
      className={`
        flex w-full group/line relative transition-colors
        ${isDefinitionLine ? 'bg-vibe-accent/5' : ''}
        ${isTargetLine ? 'bg-yellow-400/20 ring-2 ring-yellow-400/50' : ''}
      `}
      data-line-num={line.num}
    >
      {/* Line Number Column: Aligned text-right, fixed leading/padding to match code */}
      {/* w-16 (64px) for line number + fold button space */}
      <div className="flex-none w-16 pr-2 text-right select-none text-xs font-mono text-slate-600 border-r border-white/5 bg-[#0f172a]/50 leading-[1.15rem] py-0.5">
        <div className="relative inline-block w-full flex items-center justify-end gap-1">
          {/* Render input slots for each dependency token in this line */}
          <CodeCardLineSlots line={line} />

          <span className={lineNumberClassName}>
            {line.num}
          </span>

          {/* Fold Button */}
          <FoldButton
            line={line}
            node={node}
          />
        </div>
      </div>

      {/* Code Content Column: leading-[1.15rem] (~18.4px) + py-0.5 (2px) = ~22.4px total height per line */}
      <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-[1.15rem] overflow-x-auto whitespace-pre-wrap break-words">
        {line.segments.map((segment, segIdx) => (
          <CodeCardLineSegment
            key={segIdx}
            segment={segment}
            segIdx={segIdx}
            node={node}
            line={{ ...line, isFolded, foldedCount }}
          />
        ))}

        {/* Inline Fold Badge */}
        <FoldBadge
          line={line}
          node={node}
          isFolded={isFolded}
          foldedCount={foldedCount}
        />
      </div>

      {/* Output Port: Show for declaration keyword lines or definition lines */}
      {(hasDeclarationKeyword || isDefinitionLine) && (
        <div
          className="absolute right-0 top-3 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%] ring-2 ring-vibe-panel"
          data-output-port={node.id}
          data-output-port-line={line.num}
        />
      )}
    </div>
  );
};

export default CodeCardLine;
