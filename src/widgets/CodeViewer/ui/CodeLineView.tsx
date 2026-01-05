import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const CodeLineView = ({
  line,
  node,
  foldRanges,
  isHighlighted = false,
  allLines,
}: {
  line: CodeLine;
  node: CanvasNode | SourceFileNode;
  foldRanges: Array<{ start: number; end: number }>;
  isHighlighted?: boolean;
  allLines?: CodeLine[]; // 전체 라인 (끝 라인 판별용)
}) => {
  const theme = useEditorTheme();
  const targetLine = useAtomValue(targetLineAtom);
  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const layoutNodes = useAtomValue(layoutNodesAtom);
  const lineRef = useRef<HTMLDivElement>(null);

  // Calculate definition line status (lines with export declarations)
  const hasDeclarationKeyword = line.hasDeclarationKeyword || false;
  const isDefinitionLine = hasDeclarationKeyword;

  // Extract symbol name from declaration
  const exportedSymbolName = useMemo(() => {
    if (!hasDeclarationKeyword) return undefined;
    // Find segment with isDeclarationName = true
    const declSegment = line.segments.find((seg) => seg.isDeclarationName);
    return declSegment?.text;
  }, [hasDeclarationKeyword, line.segments]);

  // Calculate usage count (how many nodes import THIS SYMBOL)
  const usageCount = useMemo(() => {
    if (!hasDeclarationKeyword || !exportedSymbolName) return 0;

    let count = 0;

    // Check all nodes (regardless of visibility)
    layoutNodes.forEach((n) => {
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
    const isHighlighted = hasDeclarationKeyword || isDefinitionLine || isFolded; // Only highlight when actually folded, not just foldable

    return isHighlighted ? 'text-vibe-accent font-bold' : '';
  }, [hasDeclarationKeyword, isDefinitionLine, isFolded]);

  // Auto-scroll to target line
  useEffect(() => {
    if (isTargetLine && lineRef.current) {
      lineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isTargetLine]);

  // Sticky 대상: 모든 foldable block
  // (function, interface, arrow function, control-flow, const 등 모든 블록)
  const isBlockStartLine = line.foldInfo?.isFoldable === true;

  // Sticky offset (depth별로 다른 offset)
  const HEADER_HEIGHT = 32; // FileSection header 높이

  // 동적 offset 계산을 위한 state
  const [stickyTop, setStickyTop] = useState(HEADER_HEIGHT);

  // Sticky 활성 여부 (함수 끝을 지나가면 false)
  const [isStickyActive, setIsStickyActive] = useState(true);

  // 최신 isStickyActive 값을 참조하기 위한 ref
  const isStickyActiveRef = useRef(isStickyActive);
  useEffect(() => {
    isStickyActiveRef.current = isStickyActive;
  }, [isStickyActive]);

  // 마지막 sticky 라인인지 여부 (border 표시용)
  const [isLastSticky, setIsLastSticky] = useState(false);

  const isStickyEnabled = isBlockStartLine;

  // ResizeObserver로 sticky 라인들의 실제 높이 측정 및 offset 재계산
  useEffect(() => {
    if (!isStickyEnabled || !lineRef.current) return;

    // DOM 순서 기반: 현재 라인을 포함하는 부모 블록들의 높이 합산
    const calculateDynamicOffset = () => {
      let offset = HEADER_HEIGHT;

      // 모든 sticky START 라인 찾기
      const allStickyStarts = document.querySelectorAll('[data-function-start]');
      const currentLineNum = line.num;

      // 현재 라인을 포함하는 부모 블록들 찾기
      const parentBlocks: { lineNum: number; height: number }[] = [];

      allStickyStarts.forEach((el) => {
        const lineNum = parseInt(el.getAttribute('data-line-num') || '0', 10);
        const foldEnd = parseInt(el.getAttribute('data-fold-end') || '0', 10);

        // 이 블록이 현재 라인을 포함하는가?
        if (lineNum < currentLineNum && foldEnd >= currentLineNum) {
          const height = el.getBoundingClientRect().height;
          parentBlocks.push({ lineNum, height });
        }
      });

      // 라인 번호 순으로 정렬 (위에서 아래로)
      parentBlocks.sort((a, b) => a.lineNum - b.lineNum);

      // 부모 블록들의 높이 합산
      parentBlocks.forEach((block) => {
        offset += block.height;
      });

      // ✅ 소수점 내림 (틈 방지)
      return Math.floor(offset);
    };

    const newOffset = calculateDynamicOffset();
    setStickyTop(newOffset);

    // ResizeObserver로 높이 변화 감지
    const resizeObserver = new ResizeObserver(() => {
      const updatedOffset = calculateDynamicOffset();
      setStickyTop(updatedOffset);
    });

    // 현재 라인 관찰
    resizeObserver.observe(lineRef.current);

    // 모든 sticky START 라인 관찰 (부모의 높이 변화가 자식에 영향)
    const allStickyStartLines = document.querySelectorAll('[data-function-start]');
    allStickyStartLines.forEach((el) => {
      resizeObserver.observe(el as HTMLElement);
    });

    return () => resizeObserver.disconnect();
  }, [isStickyEnabled, line.num]);

  // Scroll 이벤트로 함수 끝 라인 감지 (sticky 해제/복원)
  useEffect(() => {
    if (!isStickyEnabled || !line.foldInfo?.foldEnd) return;

    const endLineElement = document.querySelector(`[data-line-num="${line.foldInfo.foldEnd}"]`);
    if (!endLineElement) {
      setIsStickyActive(true);
      return;
    }

    const currentRect = lineRef.current?.getBoundingClientRect();
    if (!currentRect) {
      setIsStickyActive(true);
      return;
    }

    const lineHeight = currentRect.height;
    const stickyBottom = stickyTop + lineHeight;

    // 실시간 체크 함수
    const checkStickyState = () => {
      const endRect = endLineElement.getBoundingClientRect();
      const endTop = endRect.top;
      const currentState = isStickyActiveRef.current;

      // Dead Zone: sticky 해제 후 재활성화 방지 구간
      const DEAD_ZONE_SIZE = lineHeight; // 한 라인 높이만큼
      const DEAD_ZONE_START = stickyBottom;
      const DEAD_ZONE_END = stickyBottom + DEAD_ZONE_SIZE;
      const inDeadZone = endTop >= DEAD_ZONE_START && endTop <= DEAD_ZONE_END;

      // Case 1: 현재 ON 상태 → 정확히 stickyBottom에서 해제
      if (currentState) {
        const shouldStayActive = endTop > stickyBottom;

        if (!shouldStayActive) {
          setIsStickyActive(false);
          console.log(`[Sticky OFF] Line ${line.num}:`, {
            stickyTop,
            stickyBottom,
            endTop: Math.floor(endTop),
            reason: `endTop(${Math.floor(endTop)}) <= stickyBottom(${stickyBottom.toFixed(1)})`,
            distance: Math.floor(endTop - stickyBottom),
          });
        }
        return; // ON 상태일 때는 여기서 종료
      }

      // Case 2: 현재 OFF 상태 → dead zone에서는 재활성화 금지
      if (inDeadZone) {
        console.log(`[Sticky DEAD ZONE] Line ${line.num}:`, {
          stickyBottom,
          endTop: Math.floor(endTop),
          deadZone: `${DEAD_ZONE_START.toFixed(1)} ~ ${DEAD_ZONE_END.toFixed(1)}`,
          distance: Math.floor(endTop - stickyBottom),
          action: 'Prevent reactivation',
        });
        return; // 재활성화 방지
      }

      // Case 3: OFF 상태 + dead zone 밖 → 충분히 멀어지면 재활성화
      if (endTop > DEAD_ZONE_END) {
        setIsStickyActive(true);
        console.log(`[Sticky ON] Line ${line.num}:`, {
          stickyTop,
          stickyBottom,
          endTop: Math.floor(endTop),
          reason: `endTop(${Math.floor(endTop)}) > deadZoneEnd(${DEAD_ZONE_END.toFixed(1)})`,
          distance: Math.floor(endTop - stickyBottom),
        });
      }
    };

    // 초기 상태 체크
    checkStickyState();

    // 스크롤 이벤트 리스너
    const handleScroll = () => {
      checkStickyState();
    };

    // 모든 스크롤 가능한 부모에 리스너 추가
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isStickyEnabled, line.foldInfo?.foldEnd, line.num, stickyTop]);

  // 마지막 sticky 라인 판별 (border 표시용)
  useEffect(() => {
    if (!isStickyActive) {
      setIsLastSticky(false);
      return;
    }

    const checkIfLast = () => {
      // .sticky 클래스가 있는 라인들만 찾기 (CSS sticky 상태인 것들)
      const allStickyElements = Array.from(document.querySelectorAll('[data-function-start].sticky'));

      if (allStickyElements.length === 0) {
        setIsLastSticky(false);
        return;
      }

      // 실제로 sticky 위치에 고정되어 있는 라인들만 필터링
      // (position: sticky는 클래스만으로는 실제 고정 여부를 알 수 없음)
      // data-sticky-active 속성으로 판별
      const activeStickyElements = allStickyElements.filter((el) => {
        return el.getAttribute('data-sticky-active') === 'true';
      });

      if (activeStickyElements.length === 0) {
        setIsLastSticky(false);
        return;
      }

      // Top 위치로 정렬 (아래쪽이 먼저)
      const sortedByTop = activeStickyElements
        .map((el) => ({
          el,
          top: el.getBoundingClientRect().top,
        }))
        .sort((a, b) => b.top - a.top);

      // 맨 아래 sticky의 line number
      const lastLineNum = sortedByTop[0]?.el.getAttribute('data-line-num');
      setIsLastSticky(lastLineNum === String(line.num));
    };

    checkIfLast();

    // Scroll 이벤트 감지
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(checkIfLast);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      cancelAnimationFrame(rafId);
    };
  }, [isStickyActive, line.num]);

  // Debug logging
  useEffect(() => {
    if (isStickyEnabled) {
      const lineText = line.segments
        .map((s) => s.text)
        .join('')
        .trim()
        .substring(0, 50);
      console.log(
        `[Sticky] Line ${line.num} | START | top=${stickyTop}px | active=${isStickyActive} | last=${isLastSticky} | "${lineText}"`
      );
    }
  }, [isStickyEnabled, line.num, stickyTop, isStickyActive, isLastSticky, line.segments]);

  // 접힌 범위 내부 라인은 숨김 처리 (모든 Hook 호출 이후에 체크)
  if (isLineInsideFold(line.num, foldRanges)) {
    return null;
  }

  return (
    <div
      ref={lineRef}
      className={`
        flex w-full group/line relative
        ${isBlockStartLine && isStickyActive ? 'sticky z-10 bg-bg-elevated shadow-md' : ''}
        ${isLastSticky ? 'border-b border-border-active' : ''}
        ${isDefinitionLine && !isStickyEnabled ? 'bg-vibe-accent/5' : ''}
        ${isTargetLine ? 'bg-yellow-400/20 ring-2 ring-yellow-400/50' : ''}
        ${isHighlighted ? 'bg-warm-500/10' : ''}
        ${!isStickyEnabled ? 'hover:bg-warm-500/5' : ''}
      `}
      style={{
        top: isBlockStartLine && isStickyActive ? `${stickyTop}px` : undefined,
      }}
      data-line-num={line.num}
      data-function-start={isBlockStartLine ? line.num : undefined}
      data-fold-end={isBlockStartLine && line.foldInfo ? line.foldInfo.foldEnd : undefined}
      data-sticky-active={isBlockStartLine && isStickyActive ? 'true' : undefined}
    >
      {/* Line Number Column: Aligned text-right, fixed leading/padding to match code */}
      <div
        className={`flex-none ${theme.dimensions.lineNumberWidth} ${theme.spacing.lineNumberX} text-[9px] text-right ${theme.colors.lineNumber.text} border-r ${theme.colors.lineNumber.border} ${theme.colors.lineNumber.background} ${theme.spacing.lineY}`}
      >
        <div className="relative inline-block w-full flex items-center justify-end gap-1">
          {/* Render input slots for each dependency token in this line */}
          <CodeLineSlots line={line} />

          <span className={lineNumberClassName}>{line.num}</span>
        </div>
      </div>

      {/* Fold Button Column */}
      <div className="flex-none w-4 flex items-center justify-center">
        <FoldButton line={line} node={node} />
      </div>

      {/* Code Content Column */}
      <div
        className={`flex-1 ${theme.spacing.lineX} ${theme.spacing.lineY} overflow-x-auto whitespace-pre-wrap break-words select-text`}
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
            Export (line {line.num}){usageCount > 0 && ` • ${usageCount} usage${usageCount > 1 ? 's' : ''}`}
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
