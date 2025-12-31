
import React, { useEffect, useRef, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../../entities/CanvasNode';
import type { CodeLine as CodeLineType } from '../../../entities/CodeRenderer/model/types';
import CodeLineSlots from './CodeLineSlots';
import CodeLineSegment from './CodeLineSegment';
import FoldButton from '../../../features/CodeFold/ui/FoldButton';
import FoldBadge from '../../../features/CodeFold/ui/FoldBadge';
import { isLineInsideFold, isLineFolded, getFoldedCount } from '../../../features/CodeFold/lib';
import { targetLineAtom, foldedLinesAtom } from '../../../store/atoms';
import { useCodeTheme } from '../config';

const CodeLine = ({
  line,
  node,
  foldRanges
}: {
  line: CodeLineType;
  node: CanvasNode;
  foldRanges: Array<{ start: number; end: number }>;
}) => {
  const theme = useCodeTheme();
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
  const isFolded = isLineFolded(line, foldedLines);
  const foldedCount = isFolded ? getFoldedCount(line) : undefined;

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
  if (isLineInsideFold(line.num, foldRanges)) {
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
      <div className={`flex-none ${theme.dimensions.lineNumberWidth} ${theme.spacing.lineNumberX} text-right select-none ${theme.typography.fontSize} ${theme.typography.fontFamily} ${theme.colors.lineNumber.text} border-r ${theme.colors.lineNumber.border} ${theme.colors.lineNumber.background} ${theme.typography.lineHeight} ${theme.spacing.lineY}`}>
        <div className="relative inline-block w-full flex items-center justify-end gap-1">
          {/* Render input slots for each dependency token in this line */}
          <CodeLineSlots line={line} />

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

      {/* Code Content Column */}
      <div className={`flex-1 ${theme.spacing.lineX} ${theme.spacing.lineY} ${theme.typography.fontFamily} ${theme.typography.fontSize} ${theme.typography.lineHeight} overflow-x-auto whitespace-pre-wrap break-words`}>
        {line.segments.map((segment, segIdx) => (
          <CodeLineSegment
            key={segIdx}
            segment={segment}
            segIdx={segIdx}
            node={node}
            line={line}
            isFolded={isFolded}
            foldedCount={foldedCount}
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

      {/* Output Port: Show only for exported declarations */}
      {hasDeclarationKeyword && (
        <div
          className="absolute right-0 top-3 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%] ring-2 ring-vibe-panel"
          data-output-port={node.id}
          data-output-port-line={line.num}
        />
      )}
    </div>
  );
};

export default CodeLine;
