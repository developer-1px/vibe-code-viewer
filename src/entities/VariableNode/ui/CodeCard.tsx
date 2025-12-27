
import React, { useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { CanvasNode } from '../../CanvasNode';

// Model - Business Logic
import {
  checkAllDepsExpanded,
  expandDependenciesRecursive,
  collapseDependencies,
  getFirstDependency
} from '../model/nodeVisibility';

// Lib - Pure Utilities
import { extractTokenRanges } from '../lib/tokenUtils.ts';
import { processCodeLines } from '../lib/lineUtils.ts';
import { getNodeBorderColor } from '../lib/styleUtils.ts';

// UI Components
import CodeCardHeader from './components/CodeCardHeader.tsx';
import CodeCardCopyButton from './components/CodeCardCopyButton.tsx';
import CodeCardLine from './components/CodeCardLine.tsx';

// Atoms
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom } from '../../../store/atoms';

interface CodeCardProps {
  node: CanvasNode;
}

const CodeCard: React.FC<CodeCardProps> = ({ node }) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);

  const isTemplate = node.type === 'template';

  // Check if all dependencies are expanded
  const allDepsExpanded = useMemo(() => {
    return checkAllDepsExpanded(node.dependencies, visibleNodeIds);
  }, [node.dependencies, visibleNodeIds]);

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.dependencies.length === 0) return;

    setVisibleNodeIds(prev => {
      if (!allDepsExpanded) {
        // Expand all dependencies recursively
        const newVisible = expandDependenciesRecursive(node.id, fullNodeMap, prev);

        // Center on the first expanded dependency
        const firstDep = getFirstDependency(node.id, fullNodeMap);
        if (firstDep) {
          setLastExpandedId(firstDep);
        }

        return newVisible;
      } else {
        // Collapse dependencies (keep nodes reachable from other paths)
        return collapseDependencies(node.id, fullNodeMap, prev);
      }
    });
  };

  // --- 1. Prepare Data (Pure Logic) ---
  const tokenRanges = useMemo(() => {
    return extractTokenRanges(node.codeSnippet, node.id, node.dependencies, isTemplate);
  }, [node.codeSnippet, node.id, node.dependencies, isTemplate]);

  const processedLines = useMemo(() => {
    return processCodeLines(
        node.codeSnippet,
        node.startLine || 1,
        node.id,
        node.dependencies,
        tokenRanges,
        isTemplate,
        node.templateTokenRanges // AST-based token positions for templates
    );
  }, [node.codeSnippet, node.startLine, node.id, node.dependencies, tokenRanges, isTemplate, node.templateTokenRanges]);


  const maxWidthClass = 'max-w-[700px]';

  return (
    <div
      id={`node-${node.visualId || node.id}`}
      className={`
        bg-vibe-panel/95 backdrop-blur-md border shadow-2xl rounded-lg flex flex-col relative group/card overflow-visible transition-colors
        ${getNodeBorderColor(node.type)}
        min-w-[420px] ${maxWidthClass} w-fit cursor-default
      `}
    >
      {/* Header */}
      <CodeCardHeader
        node={node}
        allDepsExpanded={allDepsExpanded}
        onToggleAll={handleToggleAll}
        showToggleButton={node.dependencies.length > 0}
      />

      {/* Body: Render Lines from Processed Data */}
      <div className="flex flex-col bg-[#0b1221] rounded-b-lg py-2">
        {processedLines.map((line, i) => {
          const isDefinitionLine = line.num === node.startLine;
          return (
            <CodeCardLine
              key={i}
              line={line}
              node={node}
              isDefinitionLine={isDefinitionLine}
            />
          );
        })}
      </div>

      {/* Copy Button - Bottom Right */}
      <CodeCardCopyButton codeSnippet={node.codeSnippet} />

      <div className="absolute inset-0 border-2 border-transparent group-hover/card:border-white/5 rounded-lg pointer-events-none transition-colors" />
    </div>
  );
};

export default CodeCard;
