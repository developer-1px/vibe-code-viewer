/**
 * CodeViewer - Code rendering widget
 * Handles code lines, slots, syntax highlighting, and fold management
 */

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { calculateFoldRanges } from '@/features/Code/CodeFold/lib/foldUtils';
import { foldedLinesAtom } from '@/features/Code/CodeFold/model/atoms';
import { currentThemeAtom } from '../../app/theme/atoms';
import { defaultEditorTheme } from '../../app/theme/default/editor';
import { EditorThemeProvider } from '../../app/theme/EditorThemeProvider';
import { jetbrainsEditorTheme } from '../../app/theme/jetbrains/editor';
import { vscodeEditorTheme } from '../../app/theme/vscode/editor';
import type { CanvasNode } from '../../entities/CanvasNode/model/types';
import type { SourceFileNode } from '../../entities/SourceFileNode/model/types';
import type { CodeLine } from './core/types';
import CodeLineView from './ui/CodeLineView.tsx';

interface CodeViewerProps {
  processedLines: CodeLine[];
  node: CanvasNode | SourceFileNode;
  highlightedLines?: Set<number>;
}

const CodeViewer = ({ processedLines, node, highlightedLines }: CodeViewerProps) => {
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
      <div
        className={`flex flex-col h-full ${theme.colors.background} ${theme.spacing.containerY} ${theme.typography.fontSize} ${theme.typography.fontFamily} ${theme.typography.lineHeight}`}
      >
        {processedLines.map((line) => {
          // Check for duplicate line numbers
          const duplicates = processedLines.filter((l) => l.num === line.num);
          if (duplicates.length > 1) {
            console.warn(`[CodeViewer] Duplicate line number detected: ${line.num} in node ${node.id}`, duplicates);
          }

          const isHighlighted = highlightedLines?.has(line.num) || false;

          return (
            <CodeLineView
              key={`${node.id}-line-${line.num}`}
              line={line}
              node={node}
              foldRanges={foldRanges}
              isHighlighted={isHighlighted}
              allLines={processedLines}
            />
          );
        })}
      </div>
    </EditorThemeProvider>
  );
};

export default CodeViewer;
