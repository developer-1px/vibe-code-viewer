import React, { useMemo, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CanvasNode } from '../../entities/CanvasNode';

// Lib - Pure Utilities
import { renderCodeLines, CodeLine } from '../../entities/VariableNode/lib/renderCodeLines';
import { getNodeBorderColor } from '../../entities/VariableNode/lib/styleUtils';

// UI Components
import CodeCardHeader from './ui/CodeCardHeader';
import CodeCardCopyButton from './ui/CodeCardCopyButton';
import CodeCardLine from './ui/CodeCardLine';
import CodeCardReferences from './ui/CodeCardReferences';
import VueTemplateSection from './ui/VueTemplateSection';

// Atoms
import { foldedLinesAtom } from '../../store/atoms';

const CodeCard = ({ node }: { node: CanvasNode }) => {
  // Render code lines with syntax highlighting
  const processedLines = useMemo(() => {
    return renderCodeLines(node);
  }, [node]);

  const foldedLinesMap = useAtomValue(foldedLinesAtom);
  const setFoldedLinesMap = useSetAtom(foldedLinesAtom);

  const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();

  // Module 노드면 자동으로 모든 함수 접기 (초기화)
  useEffect(() => {
    const isModule = node.id.endsWith('::FILE_ROOT');

    if (isModule && !foldedLinesMap.has(node.id)) {
      const initialFolds = new Set<number>();

      console.log(`📁 [CodeCard] Node: ${node.id}, isModule: ${isModule}, processedLines: ${processedLines.length}`);

      // 모든 foldable 라인 찾기 (디버깅)
      const foldableLines = processedLines.filter(line => line.foldInfo?.isFoldable);
      console.log(`📁 [CodeCard] Foldable lines found:`, foldableLines.map(l => `Line ${l.num} (${l.foldInfo?.foldStart}-${l.foldInfo?.foldEnd})`));

      processedLines.forEach(line => {
        if (line.foldInfo?.isFoldable) {
          initialFolds.add(line.num);
        }
      });

      console.log(`📁 [CodeCard] Module node ${node.id}: auto-folding ${initialFolds.size} lines`, Array.from(initialFolds));

      setFoldedLinesMap(prev => {
        const next = new Map(prev);
        next.set(node.id, initialFolds);
        return next;
      });
    }
  }, [node.id, processedLines, foldedLinesMap, setFoldedLinesMap]);

  // 렌더링할 라인 계산 (모든 라인을 포함하되, fold 상태를 마킹)
  const displayLines = useMemo(() => {
    return processedLines.map(line => {
      const foldInfo = line.foldInfo;

      // 먼저 접힌 범위 내부인지 확인 (우선 체크)
      let isInsideFold = false;

      // 현재 라인이 어떤 fold 범위 내부에 있는지 확인
      for (const foldedLineNum of foldedLines) {
        const foldedLine = processedLines.find(l => l.num === foldedLineNum);
        if (foldedLine?.foldInfo?.isFoldable) {
          const { foldStart, foldEnd } = foldedLine.foldInfo;
          // 현재 라인이 접힌 범위 내부에 있으면 (fold 시작 라인 제외)
          if (line.num > foldStart && line.num <= foldEnd) {
            isInsideFold = true;
            break;
          }
        }
      }

      // 접힌 범위 내부 라인이면 바로 반환
      if (isInsideFold) {
        return {
          ...line,
          isInsideFold: true
        };
      }

      // 접을 수 있는 라인이고 현재 접혀있으면
      if (foldInfo?.isFoldable && foldedLines.has(line.num)) {
        return {
          ...line,
          isFolded: true, // 접기 시작 라인
          foldedCount: foldInfo.foldEnd - foldInfo.foldStart
        };
      }

      return {
        ...line,
        isInsideFold: false
      };
    });
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

      {/* Variables Section: Show external references from functionAnalysis OR localReferences for other types */}
      <CodeCardReferences node={node} />

      {/* Code Lines (script가 있을 때만) */}
      {displayLines.length > 0 && (
        <div className="flex flex-col bg-[#0b1221] py-2">
          {displayLines.map((line) => (
            <CodeCardLine
              key={line.num}
              line={line}
              node={node}
            />
          ))}
        </div>
      )}

      {/* Vue Template Section (Module 노드이면서 vueTemplate이 있을 때만) */}
      {node.type === 'module' && node.vueTemplate && (
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
