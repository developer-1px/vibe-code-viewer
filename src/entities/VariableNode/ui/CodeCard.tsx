
import React, { useMemo } from 'react';
import { CanvasNode } from '../../CanvasNode';

// Lib - Pure Utilities
import { renderCodeLines } from '../lib/renderCodeLines.ts';
import { getNodeBorderColor } from '../lib/styleUtils.ts';

// UI Components
import CodeCardHeader from './components/CodeCardHeader.tsx';
import CodeCardCopyButton from './components/CodeCardCopyButton.tsx';
import CodeCardLine from './components/CodeCardLine.tsx';
import LocalReferenceItem from './components/LocalReferenceItem.tsx';

interface CodeCardProps {
  node: CanvasNode;
}

const CodeCard: React.FC<CodeCardProps> = ({ node }) => {
  const isTemplate = node.type === 'template';

  // --- 1. Prepare Data (Pure Logic) ---
  const isModule = node.type === 'module';

  // Extract external references (imports + closures) from functionAnalysis
  const externalReferences = useMemo(() => {
    if (!node.functionAnalysis) {
      console.log('🔍 No functionAnalysis for node:', node.id);
      return [];
    }

    console.log('🔍 FunctionAnalysis for', node.id, ':', {
      totalExternalDeps: node.functionAnalysis.externalDeps.length,
      externalDeps: node.functionAnalysis.externalDeps,
    });

    // Map all external dependencies (both imports and closures)
    const references = node.functionAnalysis.externalDeps.map(dep => {
      // For imports, use the source path as the node ID
      if (dep.type === 'import' && dep.source) {
        // Try to resolve the import to a function node in that file
        const nodeId = `${dep.source}::${dep.name}`;
        return {
          nodeId,
          name: dep.name,
          summary: `from ${dep.source}`,
          type: 'pure-function' as const, // Visual type for styling
        };
      }

      // For closures, use the current file path
      return {
        nodeId: `${node.filePath}::${dep.name}`,
        name: dep.name,
        summary: 'closure',
        type: 'function' as const, // Visual type for styling
      };
    });

    console.log('🔍 External references extracted:', references);

    return references;
  }, [node.functionAnalysis, node.filePath]);

  const processedLines = useMemo(() => {
    return renderCodeLines(
      node.codeSnippet,
      node.startLine || 1,
      node.id,
      node.dependencies,
      node.localVariableNames,
      node.functionAnalysis,
      node.filePath
    );
  }, [node.codeSnippet, node.startLine, node.id, node.dependencies, node.localVariableNames, node.functionAnalysis, node.filePath]);


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
      <CodeCardHeader node={node} />

      {/* Variables Section: Show external references from functionAnalysis OR localReferences for other types */}
      {(externalReferences.length > 0 || (node.localReferences && node.localReferences.length > 0)) && (
        <div className="flex flex-col gap-0.5 bg-[#0d1526] border-y border-white/5 py-2">
          <div className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            {externalReferences.length > 0 ? 'External References' : (node.type === 'module' ? 'Variables' : 'Local References')}
          </div>
          {/* Show external references if available (for functions analyzed by functional parser) */}
          {externalReferences.length > 0 ? (
            externalReferences.map((ref, idx) => (
              <LocalReferenceItem key={`${ref.nodeId}-${idx}`} reference={ref} />
            ))
          ) : (
            /* Otherwise show localReferences (for JSX_ROOT, TEMPLATE_ROOT, FILE_ROOT) */
            node.localReferences?.map((ref, idx) => (
              <LocalReferenceItem key={`${ref.nodeId}-${idx}`} reference={ref} />
            ))
          )}
        </div>
      )}

      {/* Body: Render Lines from Processed Data */}
      <div className={`flex flex-col bg-[#0b1221] py-2 ${node.localReferences && node.localReferences.length > 0 ? 'rounded-b-lg' : 'rounded-b-lg'}`}>
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
