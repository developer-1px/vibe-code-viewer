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
  // Extract external references from functionAnalysis
  const externalReferences = useMemo(() => {
    if (!node.functionAnalysis) return [];

    return node.functionAnalysis.externalDeps
      .filter(dep => dep.definedIn)
      .map(dep => {
        const refType: 'pure-function' | 'function' = dep.type === 'import' ? 'pure-function' : 'function';
        return {
          nodeId: dep.definedIn!,
          name: dep.name,
          summary: dep.type === 'import' && dep.source
            ? `from ${dep.source}`
            : dep.closureScope === 'file' ? 'file-level' : 'closure',
          type: refType,
        };
      });
  }, [node.functionAnalysis]);

  // Render code lines with syntax highlighting
  const processedLines = useMemo(() => {
    return renderCodeLines(node);
  }, [node]);

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

      {/* Code Lines */}
      <div className="flex flex-col bg-[#0b1221] py-2 rounded-b-lg">
        {processedLines.map((line, i) => (
          <CodeCardLine key={i} line={line} node={node} />
        ))}
      </div>

      {/* Copy Button - Bottom Right */}
      <CodeCardCopyButton codeSnippet={node.codeSnippet} />

      <div className="absolute inset-0 border-2 border-transparent group-hover/card:border-white/5 rounded-lg pointer-events-none transition-colors" />
    </div>
  );
};

export default CodeCard;
