
import React, { useMemo } from 'react';
import { CanvasNode } from '../model/types';

// Extracted Logic
import { extractTokenRanges } from '../lib/tokenUtils';
import { processCodeLines } from '../lib/lineUtils';
import { getNodeBorderColor } from '../lib/styleUtils';

// UI Components
import CodeCardHeader from './components/CodeCardHeader';
import CodeCardCopyButton from './components/CodeCardCopyButton';
import CodeCardLine from './components/CodeCardLine';

interface CodeCardProps {
  node: CanvasNode;
  onTokenClick: (token: string, sourceNodeId: string, event: React.MouseEvent) => void;
  onSlotClick?: (tokenId: string) => void;
  onToggleAllDependencies?: (nodeId: string, shouldExpand: boolean) => void;
  activeDependencies: string[];
  allKnownIds: string[];
  nodeMap?: Map<string, CanvasNode>;
  visibleNodeIds?: Set<string>;
}

const CodeCard: React.FC<CodeCardProps> = ({ node, onTokenClick, onSlotClick, onToggleAllDependencies, activeDependencies, nodeMap, visibleNodeIds }) => {

  const isTemplate = node.type === 'template';

  // Check if all dependencies are expanded
  const allDepsExpanded = useMemo(() => {
    if (!visibleNodeIds || node.dependencies.length === 0) return false;
    return node.dependencies.every(depId => visibleNodeIds.has(depId));
  }, [node.dependencies, visibleNodeIds]);

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleAllDependencies && node.dependencies.length > 0) {
      onToggleAllDependencies(node.id, !allDepsExpanded);
    }
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


  const maxWidthClass = 'max-w-[600px]';

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
        showToggleButton={node.dependencies.length > 0 && !!onToggleAllDependencies}
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
              onTokenClick={onTokenClick}
              onSlotClick={onSlotClick}
              nodeMap={nodeMap}
              activeDependencies={activeDependencies}
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
