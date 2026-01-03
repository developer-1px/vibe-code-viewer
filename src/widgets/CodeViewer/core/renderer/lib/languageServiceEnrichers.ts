/**
 * Language Service로 정의 위치 및 hover 정보 추가
 */

import type { CodeLine } from '../../types/codeLine';
import { findDefinitionLocation, getQuickInfoAtPosition } from '../tsLanguageService';

// Development mode flag
const __DEV__ = import.meta.env.DEV;

/**
 * Phase 3-B: Performance threshold for Language Service enrichment
 * Skip enrichment for very large files to improve initial render performance
 */
const MAX_LINES_FOR_ENRICHMENT = 500;  // ~500 lines threshold
const MAX_IDENTIFIERS_FOR_ENRICHMENT = 1000;  // ~1000 identifiers threshold

/**
 * Language Service로 정의 위치 및 hover 정보 추가
 * Phase 3-B: Conditional enrichment based on file size
 */
export const enrichWithLanguageService = (
  lines: CodeLine[],
  codeSnippet: string,
  filePath: string,
  isTsx: boolean
): CodeLine[] => {
  // Phase 3-B: Skip enrichment for large files to improve performance
  if (lines.length > MAX_LINES_FOR_ENRICHMENT) {
    if (__DEV__) {
      console.log(`[enrichWithLanguageService] Skipping enrichment for large file: ${filePath} (${lines.length} lines)`);
    }
    return lines;
  }

  // Count total identifiers to enrich
  let identifierCount = 0;
  for (const line of lines) {
    for (const segment of line.segments) {
      if (
        segment.position !== undefined &&
        (segment.kinds.includes('identifier') ||
         segment.kinds.includes('external-import') ||
         segment.kinds.includes('external-closure') ||
         segment.kinds.includes('external-function') ||
         segment.kinds.includes('local-variable') ||
         segment.kinds.includes('parameter'))
      ) {
        identifierCount++;
      }
    }
  }

  // Skip if too many identifiers
  if (identifierCount > MAX_IDENTIFIERS_FOR_ENRICHMENT) {
    if (__DEV__) {
      console.log(`[enrichWithLanguageService] Skipping enrichment for file with too many identifiers: ${filePath} (${identifierCount} identifiers)`);
    }
    return lines;
  }
  return lines.map(line => ({
    ...line,
    segments: line.segments.map(segment => {
      if (
        segment.position !== undefined &&
        (segment.kinds.includes('identifier') ||
         segment.kinds.includes('external-import') ||
         segment.kinds.includes('external-closure') ||
         segment.kinds.includes('external-function') ||
         segment.kinds.includes('local-variable') ||
         segment.kinds.includes('parameter'))
      ) {
        const defLocation = findDefinitionLocation(codeSnippet, filePath || '', segment.position, isTsx);
        const hoverInfo = !segment.nodeId
          ? getQuickInfoAtPosition(codeSnippet, filePath || '', segment.position, isTsx)
          : undefined;

        return {
          ...segment,
          definitionLocation: defLocation
            ? {
                filePath: defLocation.filePath,
                line: defLocation.line,
                character: defLocation.character,
              }
            : undefined,
          hoverInfo
        };
      }
      return segment;
    })
  }));
};
