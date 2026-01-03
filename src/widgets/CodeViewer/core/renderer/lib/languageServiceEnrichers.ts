/**
 * Language Service로 정의 위치 및 hover 정보 추가
 */

import type { CodeLine } from '../../types/codeLine';
import { findDefinitionLocation, getQuickInfoAtPosition } from '../tsLanguageService';

/**
 * Language Service로 정의 위치 및 hover 정보 추가
 */
export const enrichWithLanguageService = (
  lines: CodeLine[],
  codeSnippet: string,
  filePath: string,
  isTsx: boolean
): CodeLine[] => {
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
