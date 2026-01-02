
import React, { useEffect, useRef, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import * as ts from 'typescript';
import { CanvasNode } from '../../../entities/CanvasNode/model/types';
import type { CodeLine } from '../core/types';
import CodeLineSlots from './CodeLineSlots';
import CodeLineExportSlots from './CodeLineExportSlots';
import CodeLineSegment from './CodeLineSegment';
import FoldButton from '../../../features/CodeFold/ui/FoldButton';
import FoldBadge from '../../../features/CodeFold/ui/FoldBadge';
import { isLineInsideFold, isLineFolded, getFoldedCount } from '../../../features/CodeFold/lib/foldUtils';
import { targetLineAtom, foldedLinesAtom, layoutNodesAtom, visibleNodeIdsAtom } from '../../../store/atoms';
import { useEditorTheme } from '../../../app/theme/EditorThemeProvider';

const CodeLineView = ({
  line,
  node,
  foldRanges
}: {
  line: CodeLine;
  node: CanvasNode;
  foldRanges: Array<{ start: number; end: number }>;
}) => {
  const theme = useEditorTheme();
  const targetLine = useAtomValue(targetLineAtom);
  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const layoutNodes = useAtomValue(layoutNodesAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const lineRef = useRef<HTMLDivElement>(null);

  // Calculate definition line status (lines with export declarations)
  const hasDeclarationKeyword = line.hasDeclarationKeyword || false;
  const isDefinitionLine = hasDeclarationKeyword;

  // Extract symbol name from declaration
  const exportedSymbolName = useMemo(() => {
    if (!hasDeclarationKeyword) return undefined;
    // Find segment with isDeclarationName = true
    const declSegment = line.segments.find(seg => seg.isDeclarationName);
    return declSegment?.text;
  }, [hasDeclarationKeyword, line.segments]);

  // Calculate usage count (how many nodes import THIS SYMBOL)
  const usageCount = useMemo(() => {
    if (!hasDeclarationKeyword || !exportedSymbolName) return 0;

    let count = 0;

    // Check all nodes (regardless of visibility)
    layoutNodes.forEach(n => {
      // Skip if node doesn't import this file
      if (!n.dependencies?.includes(node.filePath)) return;

      // Check if this node's sourceFile imports the specific symbol
      const sourceFile = (n as any).sourceFile as ts.SourceFile | undefined;
      if (!sourceFile) return;

      // Parse import statements
      sourceFile.statements.forEach((statement) => {
        if (!ts.isImportDeclaration(statement)) return;

        // Check named imports
        const importClause = statement.importClause;
        if (!importClause?.namedBindings) return;
        if (!ts.isNamedImports(importClause.namedBindings)) return;

        // Check each imported symbol
        importClause.namedBindings.elements.forEach((element) => {
          const importedName = element.name.text;
          if (importedName === exportedSymbolName) {
            count++;
          }
        });
      });
    });

    return count;
  }, [hasDeclarationKeyword, exportedSymbolName, layoutNodes, node.filePath]);

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
      isFolded;  // Only highlight when actually folded, not just foldable

    return isHighlighted ? 'text-vibe-accent font-bold' : '';
  }, [hasDeclarationKeyword, isDefinitionLine, isFolded]);

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
      <div className={`flex-none ${theme.dimensions.lineNumberWidth} ${theme.spacing.lineNumberX} text-right select-none ${theme.colors.lineNumber.text} border-r ${theme.colors.lineNumber.border} ${theme.colors.lineNumber.background} ${theme.spacing.lineY}`}>
        <div className="relative inline-block w-full flex items-center justify-end gap-1">
          {/* Render input slots for each dependency token in this line */}
          <CodeLineSlots line={line} />

          <span className={lineNumberClassName}>
            {line.num}
          </span>
        </div>
      </div>

      {/* Fold Button Column */}
      <div className="flex-none w-4 flex items-center justify-center">
        <FoldButton
          line={line}
          node={node}
        />
      </div>

      {/* Code Content Column */}
      <div className={`flex-1 ${theme.spacing.lineX} ${theme.spacing.lineY} overflow-x-auto whitespace-pre-wrap break-words`}>
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
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[50%] flex items-center gap-1.5 group"
          data-output-port={node.id}
          data-output-port-line={line.num}
          data-output-port-symbol={exportedSymbolName}
        >
          {/* Usage count badge */}
          {usageCount > 0 && (
            <div className="text-[10px] font-bold text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded-full border border-emerald-500/30 min-w-[20px] text-center">
              {usageCount}
            </div>
          )}

          {/* Output port dot */}
          <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300/30 shadow-lg shadow-emerald-500/50" />

          {/* Hover tooltip */}
          <div className="hidden group-hover:block absolute right-5 whitespace-nowrap bg-slate-800 text-emerald-300 text-xs px-2 py-1 rounded border border-emerald-500/30">
            Export (line {line.num})
            {usageCount > 0 && ` • ${usageCount} usage${usageCount > 1 ? 's' : ''}`}
          </div>
        </div>
      )}

      {/* Export Slots: Show for export { ... } statements */}
      <div className="absolute right-0 top-0">
        <CodeLineExportSlots line={line} />
      </div>
    </div>
  );
};

export default CodeLineView;
