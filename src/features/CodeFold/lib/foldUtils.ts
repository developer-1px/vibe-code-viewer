/**
 * Fold utility functions
 */

import type { CodeLine } from '../../../entities/CodeRenderer/model/types';

/**
 * Extract foldable import lines from processed lines
 */
export function extractImportFoldLines(lines: CodeLine[]): number[] {
  return lines
    .filter(line => line.foldInfo?.isFoldable && line.foldInfo.foldType === 'import-block')
    .map(line => line.num);
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
    const foldedLine = processedLines.find(l => l.num === foldedLineNum);
    if (foldedLine?.foldInfo?.isFoldable) {
      ranges.push({
        start: foldedLine.foldInfo.foldStart,
        end: foldedLine.foldInfo.foldEnd
      });
    }
  }

  return ranges;
}

/**
 * Check if a line is inside any fold range
 */
export function isLineInsideFold(
  lineNum: number,
  foldRanges: Array<{ start: number; end: number }>
): boolean {
  return foldRanges.some(range => lineNum > range.start && lineNum <= range.end);
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
