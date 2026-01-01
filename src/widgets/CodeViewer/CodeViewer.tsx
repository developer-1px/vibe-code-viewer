/**
 * CodeViewer - Code rendering widget
 * Handles code lines, slots, syntax highlighting, and fold management
 */

import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../entities/CanvasNode';
import type { CodeLine as CodeLineType } from './core/types';
import CodeLine from './ui/CodeLine';
import { defaultEditorTheme, jetbrainsEditorTheme, vscodeEditorTheme, EditorThemeProvider } from '../../app/theme';
import { currentThemeAtom } from '../../store/atoms';

interface CodeViewerProps {
  processedLines: CodeLineType[];
  node: CanvasNode;
  foldRanges: Array<{ start: number; end: number }>;
}

const CodeViewer = ({ processedLines, node, foldRanges }: CodeViewerProps) => {
  const currentThemeName = useAtomValue(currentThemeAtom);

  // Select theme based on atom value
  const theme = useMemo(() => {
    switch (currentThemeName) {
      case 'jetbrains':
        return jetbrainsEditorTheme;
      case 'vscode':
        return vscodeEditorTheme;
      default:
        return defaultEditorTheme;
    }
  }, [currentThemeName]);

  return (
    <EditorThemeProvider theme={theme}>
      <div className={`flex flex-col ${theme.colors.background} ${theme.spacing.containerY}`}>
        {processedLines.map((line) => {
          // Check for duplicate line numbers
          const duplicates = processedLines.filter(l => l.num === line.num);
          if (duplicates.length > 1) {
            console.warn(`[CodeViewer] Duplicate line number detected: ${line.num} in node ${node.id}`, duplicates);
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
    </EditorThemeProvider>
  );
};

export default CodeViewer;
