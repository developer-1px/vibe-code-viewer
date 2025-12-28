import React, { useMemo } from 'react';
import { CanvasNode } from '../../CanvasNode';

// Lib - Pure Utilities
import { renderCodeLines } from '../lib/renderCodeLines.ts';
import { getNodeBorderColor } from '../lib/styleUtils.ts';

// UI Components
import CodeCardHeader from './components/CodeCardHeader.tsx';
import CodeCardCopyButton from './components/CodeCardCopyButton.tsx';
import CodeCardLine from './components/CodeCardLine.tsx';
import CodeCardReferences from './components/CodeCardReferences.tsx';

interface CodeCardProps {
  node: CanvasNode;
}

const CodeCard: React.FC<CodeCardProps> = ({ node }) => {
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
      <CodeCardReferences node={node} />

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
