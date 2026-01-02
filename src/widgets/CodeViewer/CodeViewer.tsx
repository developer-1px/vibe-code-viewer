/**
 * CodeViewer - Code rendering widget
 * Handles code lines, slots, syntax highlighting, and fold management
 */

import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../entities/CanvasNode/model/types';
import type { CodeLine } from './core/types';
import CodeLineView from './ui/CodeLineView.tsx';
import { defaultEditorTheme } from '../../app/theme/default/editor';
import { jetbrainsEditorTheme } from '../../app/theme/jetbrains/editor';
import { vscodeEditorTheme } from '../../app/theme/vscode/editor';
import { EditorThemeProvider } from '../../app/theme/EditorThemeProvider';
import { currentThemeAtom, foldedLinesAtom } from '../../store/atoms';
import { calculateFoldRanges } from '../../features/CodeFold/lib/foldUtils';

interface CodeViewerProps {
  processedLines: CodeLine[];
  node: CanvasNode;
}

const CodeViewer = ({ processedLines, node }: CodeViewerProps) => {
  const currentThemeName = useAtomValue(currentThemeAtom);
  const foldedLinesMap = useAtomValue(foldedLinesAtom);

  // Calculate fold ranges from folded lines
  const foldRanges = useMemo(() => {
    const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();
    return calculateFoldRanges(foldedLines, processedLines);
  }, [foldedLinesMap, node.id, processedLines]);

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
      <div className={`flex flex-col h-full ${theme.colors.background} ${theme.spacing.containerY}`}>
        {processedLines.map((line) => {
          // Check for duplicate line numbers
          const duplicates = processedLines.filter(l => l.num === line.num);
          if (duplicates.length > 1) {
            console.warn(`[CodeViewer] Duplicate line number detected: ${line.num} in node ${node.id}`, duplicates);
          }

          return (
            <CodeLineView
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
