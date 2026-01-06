import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
import * as ts from 'typescript';
import { getFoldedCount, isLineFolded, isLineInsideFold } from '@/features/Code/CodeFold/lib/foldUtils';
import { foldedLinesAtom } from '@/features/Code/CodeFold/model/atoms';
import FoldBadge from '@/features/Code/CodeFold/ui/FoldBadge';
import FoldButton from '@/features/Code/CodeFold/ui/FoldButton';
import { targetLineAtom } from '@/features/File/Navigation/model/atoms';
import { useEditorTheme } from '../../../app/theme/EditorThemeProvider';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import { layoutNodesAtom } from '../../PipelineCanvas/model/atoms';
import type { CodeLine } from '../core/types';
import CodeLineExportSlots from './CodeLineExportSlots';
import CodeLineSegment from './CodeLineSegment';
import CodeLineSlots from './CodeLineSlots';

// ============================================
// Block Line Detection (for data attributes)
// ============================================

/**
 * 블록 시작 라인 판별 (DOM 쿼리용 data 속성)
 * StickyLens는 블록 시작점만 추적하면 충분 (닫는 괄호는 불필요)
 */
const getBlockLineInfo = (line: CodeLine) => {
  const isImportBlock = line.foldInfo?.foldType === 'import-block';
  const isBlockStartLine = line.foldInfo?.isFoldable === true && !isImportBlock;

  return {
    isBlockStartLine,
    blockStartLineNum: line.num,
  };
};

export interface CodeLineViewOptions {
  showFoldButton?: boolean;
  showSlots?: boolean;
  showExportSlots?: boolean;
  interactive?: boolean; // pointer-events 제어
  softWrap?: boolean; // 코드 줄바꿈 여부
}

const CodeLineView = ({
  line,
  node,
  foldRanges,
  isHighlighted = false,
  allLines,
  options = {
    showFoldButton: true,
    showSlots: true,
    showExportSlots: true,
    interactive: true,
    softWrap: false,
  },
}: {
  line: CodeLine;
  node: CanvasNode | SourceFileNode;
  foldRanges: Array<{ start: number; end: number }>;
  isHighlighted?: boolean;
  allLines?: CodeLine[]; // 전체 라인 (끝 라인 판별용)
  options?: CodeLineViewOptions;
}) => {
  const theme = useEditorTheme();
  const targetLine = useAtomValue(targetLineAtom);
  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const layoutNodes = useAtomValue(layoutNodesAtom);
  const lineRef = useRef<HTMLDivElement>(null);

  // 사용자에게 이 라인이 export 선언임을 시각적으로 표시하기 위함
  const hasDeclarationKeyword = line.hasDeclarationKeyword || false;
  const isDefinitionLine = hasDeclarationKeyword;

  // Output Port에 심볼 이름을 표시하여 어떤 identifier가 export되는지 명확히 하기 위함
  const exportedSymbolName = useMemo(() => {
    if (!hasDeclarationKeyword) return undefined;
    const declSegment = line.segments.find((seg) => seg.isDeclarationName);
    return declSegment?.text;
  }, [hasDeclarationKeyword, line.segments]);

  // 사용자가 dependency 연결 강도를 직관적으로 파악할 수 있도록 badge 숫자로 표시
  const usageCount = useMemo(() => {
    if (!hasDeclarationKeyword || !exportedSymbolName) return 0;

    return layoutNodes
      .filter((n) => n.dependencies?.includes(node.filePath))
      .flatMap((n) => {
        const sourceFile = (n as any).sourceFile as ts.SourceFile | undefined;
        if (!sourceFile) return [];

        return sourceFile.statements.filter(ts.isImportDeclaration).flatMap((statement) => {
          const importClause = statement.importClause;
          if (!importClause?.namedBindings) return [];
          if (!ts.isNamedImports(importClause.namedBindings)) return [];

          return importClause.namedBindings.elements
            .map((element) => element.name.text)
            .filter((importedName) => importedName === exportedSymbolName);
        });
      }).length;
  }, [hasDeclarationKeyword, exportedSymbolName, layoutNodes, node.filePath]);

  // Go to Definition으로 이동한 라인을 자동으로 highlight하여 사용자가 목표 위치를 놓치지 않도록 함
  const isTargetLine = targetLine?.nodeId === node.id && targetLine.lineNum === line.num;

  // 현재 라인이 접혀있는지 확인하여 UI 상태를 결정
  const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();
  const isFolded = isLineFolded(line, foldedLines);
  const foldedCount = isFolded ? getFoldedCount(line) : undefined;

  // 사용자가 클릭한 정의 위치로 자동 스크롤하여 수동 스크롤 없이 바로 코드를 확인할 수 있도록 함
  useEffect(() => {
    if (isTargetLine && lineRef.current) {
      lineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isTargetLine]);

  // 블록 라인 정보 (data 속성용)
  const { isBlockStartLine, blockStartLineNum } = getBlockLineInfo(line);

  // 중요한 라인(export, fold 등)을 시각적으로 강조하여 코드 구조를 빠르게 파악할 수 있도록 함
  const lineNumberClassName = useMemo(() => {
    const isHighlighted = hasDeclarationKeyword || isDefinitionLine || isFolded || isBlockStartLine;

    return isHighlighted ? 'text-vibe-accent font-bold' : '';
  }, [hasDeclarationKeyword, isDefinitionLine, isFolded, isBlockStartLine]);

  // 접힌 범위 내부 라인은 숨김 처리 (모든 Hook 호출 이후에 체크)
  if (isLineInsideFold(line.num, foldRanges)) {
    return null;
  }

  return (
    <div
      ref={lineRef}
      className={`
        flex w-full group/line relative
        ${isDefinitionLine ? 'bg-vibe-accent/5' : ''}
        ${isTargetLine ? 'bg-yellow-400/20 ring-2 ring-yellow-400/50' : ''}
        ${isHighlighted ? 'bg-warm-500/10' : ''}
        hover:bg-warm-500/5
        ${!options.interactive ? 'pointer-events-none' : ''}
      `}
      data-line-num={line.num}
      data-block-start={isBlockStartLine ? blockStartLineNum : undefined}
      data-fold-end={isBlockStartLine && line.foldInfo ? line.foldInfo.foldEnd : undefined}
    >
      {/* Line Number Column: Aligned text-right, fixed leading/padding to match code */}
      <div
        className={`flex-none ${theme.dimensions.lineNumberWidth} ${theme.spacing.lineNumberX} flex items-center justify-end gap-1 text-3xs leading-snug ${theme.colors.lineNumber.text} border-r ${theme.colors.lineNumber.border} ${theme.colors.lineNumber.background}`}
      >
        {/* Render input slots for each dependency token in this line */}
        {options.showSlots && <CodeLineSlots line={line} />}

        <span className={lineNumberClassName}>{line.num}</span>
      </div>

      {/* Fold Button Column */}
      <div className="flex-none w-4 flex items-center justify-center">
        {options.showFoldButton && <FoldButton line={line} node={node} />}
      </div>

      {/* Code Content Column */}
      <div
        className={`${options.softWrap ? 'flex-1' : 'w-fit min-w-full'} ${theme.spacing.lineX} ${theme.spacing.lineY} overflow-hidden ${options.softWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'} select-text font-mono ${!options.interactive ? 'pointer-events-none' : ''}`}
      >
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
        <FoldBadge line={line} node={node} isFolded={isFolded} foldedCount={foldedCount} />
      </div>

      {/* Output Port: Show only for exported declarations */}
      {options.showExportSlots && hasDeclarationKeyword && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[50%] flex items-center gap-1.5 group"
          data-output-port={node.id}
          data-output-port-line={line.num}
          data-output-port-symbol={exportedSymbolName}
        >
          {/* Usage count badge */}
          {usageCount > 0 && (
            <div className="text-2xs font-bold text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded-full border border-emerald-500/30 min-w-[20px] text-center">
              {usageCount}
            </div>
          )}

          {/* Output port dot */}
          <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300/30 shadow-lg shadow-emerald-500/50" />

          {/* Hover tooltip */}
          <div className="hidden group-hover:block absolute right-5 whitespace-nowrap bg-slate-800 text-emerald-300 text-xs px-2 py-1 rounded border border-emerald-500/30">
            Export (line {line.num}){usageCount > 0 && ` • ${usageCount} usage${usageCount > 1 ? 's' : ''}`}
          </div>
        </div>
      )}

      {/* Export Slots: Show for export { ... } statements */}
      {options.showExportSlots && (
        <div className="absolute right-0 top-0">
          <CodeLineExportSlots line={line} />
        </div>
      )}
    </div>
  );
};

export default CodeLineView;
