import React, { useMemo, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CanvasNode } from '../../entities/CanvasNode';

// Lib - Pure Utilities
import { renderCodeLinesDirect } from '../../entities/CodeRenderer/lib/renderCodeLinesDirect';
import { renderVueFile } from '../../entities/CodeRenderer/lib/renderVueFile';
import type { CodeLine } from '../../entities/CodeRenderer/model/types';
import { getNodeBorderColor } from '../../entities/SourceFileNode/lib/styleUtils';
import { extractImportFoldLines, calculateFoldRanges } from '../../features/CodeFold/lib';

// UI Components
import CodeCardHeader from './ui/CodeCardHeader';
import CodeCardCopyButton from './ui/CodeCardCopyButton';
import CodeCardLine from './ui/CodeCardLine';
import VueTemplateSection from './ui/VueTemplateSection';

// Atoms
import { foldedLinesAtom, cardPositionsAtom, filesAtom, layoutTriggerAtom } from '../../store/atoms';

const CodeCard = ({ node }: { node: CanvasNode }) => {
  const files = useAtomValue(filesAtom);

  // Render code lines with syntax highlighting
  const processedLines = useMemo(() => {
    // Vue 파일인 경우 renderVueFile 사용
    if (node.filePath.endsWith('.vue')) {
      return renderVueFile(node, files);
    }
    // 그 외의 경우 renderCodeLinesDirect 사용
    return renderCodeLinesDirect(node, files);
  }, [node, files]);

  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const setFoldedLinesMap = useSetAtom(foldedLinesAtom);

  // Import 블록 자동 접기 (초기 렌더링 시 한 번만)
  useEffect(() => {
    // 이미 fold 상태가 설정되어 있으면 초기화하지 않음
    if (foldedLinesMap.has(node.id)) {
      return;
    }

    const importFoldLines = extractImportFoldLines(processedLines);

    if (importFoldLines.length > 0) {
      setFoldedLinesMap(prev => {
        const next = new Map(prev);
        const nodeFolds = new Set<number>();
        importFoldLines.forEach(lineNum => nodeFolds.add(lineNum));
        next.set(node.id, nodeFolds);
        return next;
      });
    }
  }, [node.id, processedLines, foldedLinesMap, setFoldedLinesMap]);

  // Fold ranges 계산 (CodeCardLine에서 사용)
  const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();

  const foldRanges = useMemo(() => {
    return calculateFoldRanges(foldedLines, processedLines);
  }, [processedLines, foldedLines]);

  // Script 영역의 마지막 라인 번호 계산
  const scriptEndLine = useMemo(() => {
    if (processedLines.length === 0) return 0;
    return processedLines[processedLines.length - 1].num;
  }, [processedLines]);

  // ResizeObserver로 카드 크기 변화 감지하여 레이아웃 재계산
  const cardRef = useRef<HTMLDivElement>(null);
  const setLayoutTrigger = useSetAtom(layoutTriggerAtom);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    const resizeObserver = new ResizeObserver(() => {
      // 크기가 변하면 레이아웃 재계산 트리거
      setLayoutTrigger(prev => prev + 1);
    });

    resizeObserver.observe(cardElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [setLayoutTrigger]);

  return (
    <div
      ref={cardRef}
      id={`node-${node.visualId || node.id}`}
      className={`
        bg-vibe-panel/95 backdrop-blur-md border shadow-2xl rounded-lg flex flex-col relative group/card overflow-visible transition-colors
        ${getNodeBorderColor(node.type)}
        min-w-[420px] max-w-[700px] w-fit cursor-default
      `}
    >
      {/* Header */}
      <CodeCardHeader node={node} />

      {/* Code Lines (script가 있을 때만) */}
      {processedLines.length > 0 && (
        <div className="flex flex-col bg-[#0b1221] py-2">
          {processedLines.map((line) => (
            <CodeCardLine
              key={line.num}
              line={line}
              node={node}
              foldRanges={foldRanges}
            />
          ))}
        </div>
      )}

      {/* Vue Template Section (파일 노드이면서 vueTemplate이 있을 때만) */}
      {node.vueTemplate && (
        <div className="flex flex-col bg-[#0b1221] py-2">
          <VueTemplateSection template={node.vueTemplate} node={node} scriptEndLine={scriptEndLine} />
        </div>
      )}

      {/* Copy Button - Bottom Right */}
      <CodeCardCopyButton codeSnippet={node.codeSnippet} />

      <div className="absolute inset-0 border-2 border-transparent group-hover/card:border-white/5 rounded-lg pointer-events-none transition-colors" />
    </div>
  );
};

export default CodeCard;
