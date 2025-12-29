import React, { useMemo, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CanvasNode } from '../../entities/CanvasNode';

// Lib - Pure Utilities
import { renderCodeLines } from '../../entities/CodeRenderer/lib/renderCodeLines';
import { renderVueFile } from '../../entities/CodeRenderer/lib/renderVueFile';
import type { CodeLine } from '../../entities/CodeRenderer/model/types';
import { getNodeBorderColor } from '../../entities/SourceFileNode/lib/styleUtils';

// UI Components
import CodeCardHeader from './ui/CodeCardHeader';
import CodeCardCopyButton from './ui/CodeCardCopyButton';
import CodeCardLine from './ui/CodeCardLine';
import CodeCardReferences from './ui/CodeCardReferences';
import VueTemplateSection from './ui/VueTemplateSection';

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
    // 그 외의 경우 기존 renderCodeLines 사용
    return renderCodeLines(node, files);
  }, [node, files]);

  const setFoldedLinesMap = useSetAtom(foldedLinesAtom);

  // Import 블록 자동 접기 (초기 렌더링 시 한 번만)
  useEffect(() => {
    const importFoldLines = processedLines
      .filter(line => line.foldInfo?.isFoldable && line.foldInfo.foldType === 'import-block')
      .map(line => line.num);

    if (importFoldLines.length > 0) {
      setFoldedLinesMap(prev => {
        const next = new Map(prev);
        const nodeFolds = new Set(next.get(node.id) || new Set());
        importFoldLines.forEach(lineNum => nodeFolds.add(lineNum));
        next.set(node.id, nodeFolds);
        return next;
      });
    }
  }, [node.id, processedLines, setFoldedLinesMap]);

  // Fold ranges 계산 (CodeCardLine에서 사용)
  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();

  const foldRanges = useMemo(() => {
    const ranges: Array<{ start: number; end: number }> = [];
    for (const foldedLineNum of foldedLines) {
      const foldedLine = processedLines.find(l => l.num === foldedLineNum);
      if (foldedLine?.foldInfo?.isFoldable) {
        ranges.push({
          start: foldedLine.foldInfo.foldStart,
          end: foldedLine.foldInfo.foldEnd
        });
      }
    }
    return ranges;
  }, [processedLines, foldedLines]);

  // Script 영역의 마지막 라인 번호 계산
  const scriptEndLine = useMemo(() => {
    if (processedLines.length === 0) return 0;
    return processedLines[processedLines.length - 1].num;
  }, [processedLines]);

  return (
    <div
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
