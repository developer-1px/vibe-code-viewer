/**
 * CodeContent - Code rendering widget
 * Handles code lines, slots, syntax highlighting, and fold management
 */

import React from 'react';
import { CanvasNode } from '../../entities/CanvasNode';
import type { CodeLine as CodeLineType } from '../../entities/CodeRenderer/model/types';
import CodeLine from './ui/CodeLine';

interface CodeContentProps {
  processedLines: CodeLineType[];
  node: CanvasNode;
  foldRanges: Array<{ start: number; end: number }>;
}

const CodeContent = ({ processedLines, node, foldRanges }: CodeContentProps) => {
  return (
    <div className="flex flex-col bg-[#0b1221] py-2">
      {processedLines.map((line) => {
        // Check for duplicate line numbers
        const duplicates = processedLines.filter(l => l.num === line.num);
        if (duplicates.length > 1) {
          console.warn(`[CodeContent] Duplicate line number detected: ${line.num} in node ${node.id}`, duplicates);
        }

        return (
          <CodeLine
            key={`${node.id}-line-${line.num}`}
            line={line}
            node={node}
            foldRanges={foldRanges}
          />
        );
      })}
    </div>
  );
};

export default CodeContent;
