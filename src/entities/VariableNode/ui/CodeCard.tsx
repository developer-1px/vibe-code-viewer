import React, { useMemo, useState } from 'react';
import { CanvasNode } from '../../CanvasNode';

// Lib - Pure Utilities
import { renderCodeLines, CodeLine, FoldPlaceholder } from '../lib/renderCodeLines.ts';
import { getNodeBorderColor } from '../lib/styleUtils.ts';

// UI Components
import CodeCardHeader from './components/CodeCardHeader.tsx';
import CodeCardCopyButton from './components/CodeCardCopyButton.tsx';
import CodeCardLine from './components/CodeCardLine.tsx';
import CodeCardReferences from './components/CodeCardReferences.tsx';
import VueTemplateSection from './components/VueTemplateSection.tsx';

interface CodeCardProps {
  node: CanvasNode;
}

const CodeCard: React.FC<CodeCardProps> = ({ node }) => {
  // Render code lines with syntax highlighting
  const processedLines = useMemo(() => {
    return renderCodeLines(node);
  }, [node]);

  // 접힌 라인 번호를 Set으로 관리 (fold 시작 라인 번호)
  const [foldedLines, setFoldedLines] = useState<Set<number>>(() => {
    const initialFolds = new Set<number>();

    // Module 노드면 자동으로 모든 함수 접기
    const isModule = node.id.endsWith('::FILE_ROOT');

    console.log(`📁 [CodeCard] Node: ${node.id}, isModule: ${isModule}, processedLines: ${processedLines.length}`);

    // 모든 foldable 라인 찾기 (디버깅)
    const foldableLines = processedLines.filter(line => line.foldInfo?.isFoldable);
    console.log(`📁 [CodeCard] Foldable lines found:`, foldableLines.map(l => `Line ${l.num} (${l.foldInfo?.foldStart}-${l.foldInfo?.foldEnd})`));

    if (isModule) {
      processedLines.forEach(line => {
        if (line.foldInfo?.isFoldable) {
          initialFolds.add(line.num);
        }
      });
      console.log(`📁 [CodeCard] Module node ${node.id}: auto-folding ${initialFolds.size} lines`, Array.from(initialFolds));
    }

    return initialFolds;
  });

  // 토글 함수
  const toggleFold = (lineNum: number) => {
    setFoldedLines(prev => {
      const next = new Set(prev);
      if (next.has(lineNum)) {
        next.delete(lineNum);
      } else {
        next.add(lineNum);
      }
      return next;
    });
  };

  // 렌더링할 라인 계산 (접힌 경우 마지막 닫는 중괄호만 inline으로 추가)
  const displayLines = useMemo(() => {
    const result: CodeLine[] = [];
    let i = 0;

    while (i < processedLines.length) {
      const line = processedLines[i];
      const foldInfo = line.foldInfo;

      // 접을 수 있는 라인이고 현재 접혀있으면
      if (foldInfo?.isFoldable && foldedLines.has(line.num)) {
        // 1. 접기 시작 라인에 fold 정보 추가 (CodeCardLine에서 { ... } 렌더링)
        result.push({
          ...line,
          isFolded: true, // 🆕 fold 상태 추가
          foldedCount: foldInfo.foldEnd - foldInfo.foldStart
        });

        // 2. 접힌 범위 스킵 (foldEnd 라인 다음부터 계속)
        while (i < processedLines.length && processedLines[i].num <= foldInfo.foldEnd) {
          i++;
        }
      } else {
        // 일반 라인
        result.push(line);
        i++;
      }
    }

    return result;
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
              onToggleFold={toggleFold}
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
