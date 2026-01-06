/**
 * Fold utility functions
 */

import type { CodeLine } from '../../../../widgets/CodeViewer/core/types/codeLine.ts';

/**
 * Get foldable import lines from processed lines
 */
export function getImportFoldLines(lines: CodeLine[]): number[] {
  return lines
    .filter((line) => line.foldInfo?.isFoldable && line.foldInfo.foldType === 'import-block')
    .map((line) => line.num);
}

/**
 * Calculate fold ranges from folded lines
 */
export function calculateFoldRanges(
  foldedLines: Set<number>,
  processedLines: CodeLine[]
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];

  for (const foldedLineNum of foldedLines) {
    const foldedLine = processedLines.find((l) => l.num === foldedLineNum);
    if (foldedLine?.foldInfo?.isFoldable) {
      ranges.push({
        start: foldedLine.foldInfo.foldStart,
        end: foldedLine.foldInfo.foldEnd,
      });
    }
  }

  return ranges;
}

/**
 * Check if a line is inside any fold range
 */
export function isLineInsideFold(lineNum: number, foldRanges: Array<{ start: number; end: number }>): boolean {
  return foldRanges.some((range) => lineNum > range.start && lineNum <= range.end);
}

/**
 * Check if a line is currently folded
 * @param line - The code line to check
 * @param foldedLines - Set of folded line numbers for the current node
 * @returns true if the line is foldable and currently folded
 */
export function isLineFolded(line: CodeLine, foldedLines: Set<number>): boolean {
  return line.foldInfo?.isFoldable === true && foldedLines.has(line.num);
}

/**
 * Calculate the number of folded lines
 * @param line - The code line with fold info
 * @returns Number of folded lines, or undefined if not foldable
 */
export function getFoldedCount(line: CodeLine): number | undefined {
  if (!line.foldInfo) return undefined;
  return line.foldInfo.foldEnd - line.foldInfo.foldStart;
}

/**
 * Get all foldable line numbers up to maxDepth
 * @param lines - All code lines
 * @param maxDepth - Maximum depth to fold (1: import only, 2: import + top-level blocks, etc.)
 * @returns Array of line numbers to fold
 */
export function getFoldableLinesByMaxDepth(lines: CodeLine[], maxDepth: number): number[] {
  return lines
    .filter((line) => line.foldInfo?.isFoldable && line.foldInfo.depth !== undefined && line.foldInfo.depth <= maxDepth)
    .map((line) => line.num);
}

/**
 * Get all foldable line numbers excluding specific depth
 * @param lines - All code lines
 * @param excludeDepth - Depth to exclude from folding (will be unfolded)
 * @returns Array of line numbers to fold
 */
export function getFoldableLinesExcludingDepth(lines: CodeLine[], excludeDepth: number): number[] {
  return lines
    .filter(
      (line) => line.foldInfo?.isFoldable && line.foldInfo.depth !== undefined && line.foldInfo.depth !== excludeDepth
    )
    .map((line) => line.num);
}
