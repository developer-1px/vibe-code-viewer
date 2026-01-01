import React, { useMemo, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CanvasNode } from '../../entities/CanvasNode';

// Lib - Pure Utilities
import { renderCodeLinesDirect, renderVueFile } from '../CodeViewer/core';
import type { CodeLine } from '../CodeViewer/core/types';
import { getNodeBorderColor } from '../../entities/SourceFileNode/lib/styleUtils';
import { getFoldableLinesByMaxDepth } from '../../features/CodeFold/lib';

// UI Components
import CodeCardHeader from './ui/CodeCardHeader';
import CodeCardCopyButton from './ui/CodeCardCopyButton';
import { CodeViewer, VueTemplateSection } from '../CodeViewer';

// Atoms
import { foldedLinesAtom, cardPositionsAtom, filesAtom } from '../../store/atoms';

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

  // Import만 접기 (초기 렌더링 시 한 번만) - Level 0 (import only folded)
  useEffect(() => {
    // 이미 fold 상태가 설정되어 있으면 초기화하지 않음
    if (foldedLinesMap.has(node.id)) {
      return;
    }

    // depth 1 (import)만 접기 (Level 0)
    const linesToFold = getFoldableLinesByMaxDepth(processedLines, 1);
    setFoldedLinesMap(prev => {
      const next = new Map(prev);
      const nodeFolds = new Set<number>();
      linesToFold.forEach(lineNum => nodeFolds.add(lineNum));
      next.set(node.id, nodeFolds);
      return next;
    });
  }, [node.id, processedLines, foldedLinesMap, setFoldedLinesMap]);

  // Script 영역의 마지막 라인 번호 계산
  const scriptEndLine = useMemo(() => {
    if (processedLines.length === 0) return 0;
    return processedLines[processedLines.length - 1].num;
  }, [processedLines]);

  // Card ref for ID assignment
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      id={`node-${node.visualId || node.id}`}
      className={`
        bg-theme-panel/95 backdrop-blur-md border shadow-2xl rounded-lg flex flex-col relative group/card overflow-visible transition-colors
        ${getNodeBorderColor(node.type)}
        min-w-[420px] max-w-[700px] w-fit cursor-default
      `}
    >
      {/* Header */}
      <CodeCardHeader node={node} />

      {/* Code Lines (script가 있을 때만) */}
      {processedLines.length > 0 && (
        <CodeViewer
          processedLines={processedLines}
          node={node}
        />
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
