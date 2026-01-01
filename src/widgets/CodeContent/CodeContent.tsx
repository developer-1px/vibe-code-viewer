/**
 * CodeContent - Code rendering widget
 * Handles code lines, slots, syntax highlighting, and fold management
 */

import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../entities/CanvasNode';
import type { CodeLine as CodeLineType } from '../../entities/CodeRenderer/model/types';
import CodeLine from './ui/CodeLine';
import { defaultTheme, jetbrainsTheme, vscodeTheme, CodeThemeProvider } from './config';
import { currentThemeAtom } from '../../store/atoms';

interface CodeContentProps {
  processedLines: CodeLineType[];
  node: CanvasNode;
  foldRanges: Array<{ start: number; end: number }>;
}

const CodeContent = ({ processedLines, node, foldRanges }: CodeContentProps) => {
  const currentThemeName = useAtomValue(currentThemeAtom);

  // Select theme based on atom value
  const theme = useMemo(() => {
    switch (currentThemeName) {
      case 'jetbrains':
        return jetbrainsTheme;
      case 'vscode':
        return vscodeTheme;
      default:
        return defaultTheme;
    }
  }, [currentThemeName]);

  return (
    <CodeThemeProvider theme={theme}>
      <div className={`flex flex-col ${theme.colors.background} ${theme.spacing.containerY}`}>
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
    </CodeThemeProvider>
  );
};

export default CodeContent;
