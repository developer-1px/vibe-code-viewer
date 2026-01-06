/**
 * Language Service로 정의 위치 및 hover 정보 추가
 */

import * as ts from 'typescript';
import { createLanguageService, getParameterHintsForCall } from '../../../../../shared/tsParser/utils/languageService';
import type { CodeLine } from '../../types/codeLine';
import { findDefinitionLocation, getQuickInfoAtPosition } from '../tsLanguageService';

// Development mode flag
const __DEV__ = import.meta.env.DEV;

/**
 * Check if type string represents a function
 * Examples:
 * - "() => void"
 * - "(a: number) => string"
 * - "function foo(): void"
 * - "(method) log(message?: any, ...optionalParams: any[]): void"
 */
function isFunctionType(typeString: string): boolean {
  // Check for arrow function signature: (...) => ...
  if (typeString.includes('=>')) {
    return true;
  }

  // Check for function keyword: function foo()
  if (typeString.includes('function ')) {
    return true;
  }

  // Check for method signature: (method) foo(...)
  if (typeString.startsWith('(method)')) {
    return true;
  }

  // Check for constructor: new (...) => ...
  if (typeString.includes('new (')) {
    return true;
  }

  return false;
}

/**
 * Phase 3-B: Performance threshold for Language Service enrichment
 * Skip enrichment for very large files to improve initial render performance
 */
const MAX_LINES_FOR_ENRICHMENT = 500; // ~500 lines threshold
const MAX_IDENTIFIERS_FOR_ENRICHMENT = 1000; // ~1000 identifiers threshold

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
      console.log(
        `[enrichWithLanguageService] Skipping enrichment for large file: ${filePath} (${lines.length} lines)`
      );
    }
    return lines;
  }

  // Count total identifiers to enrich
  let identifierCount = 0;
  for (const line of lines) {
    for (const segment of line.segments) {
      if (
        segment.position !== undefined &&
        (segment.kinds?.includes('identifier') ||
          segment.kinds?.includes('external-import') ||
          segment.kinds?.includes('external-closure') ||
          segment.kinds?.includes('external-function') ||
          segment.kinds?.includes('local-variable') ||
          segment.kinds?.includes('parameter'))
      ) {
        identifierCount++;
      }
    }
  }

  // Skip if too many identifiers
  if (identifierCount > MAX_IDENTIFIERS_FOR_ENRICHMENT) {
    if (__DEV__) {
      console.log(
        `[enrichWithLanguageService] Skipping enrichment for file with too many identifiers: ${filePath} (${identifierCount} identifiers)`
      );
    }
    return lines;
  }
  return lines.map((line) => ({
    ...line,
    segments: line.segments.map((segment) => {
      if (
        segment.position !== undefined &&
        (segment.kinds?.includes('identifier') ||
          segment.kinds?.includes('external-import') ||
          segment.kinds?.includes('external-closure') ||
          segment.kinds?.includes('external-function') ||
          segment.kinds?.includes('local-variable') ||
          segment.kinds?.includes('parameter'))
      ) {
        const defLocation = findDefinitionLocation(codeSnippet, filePath || '', segment.position, isTsx);
        const hoverInfo = !segment.nodeId
          ? getQuickInfoAtPosition(codeSnippet, filePath || '', segment.position, isTsx)
          : undefined;

        // ✅ Check if this identifier is a function based on type information
        const isFunction = hoverInfo ? isFunctionType(hoverInfo) : false;

        // Add 'function' kind if it's a function
        const updatedKinds = isFunction && segment.kinds ? [...segment.kinds, 'function'] : segment.kinds;

        return {
          ...segment,
          kinds: updatedKinds,
          definitionLocation: defLocation
            ? {
                filePath: defLocation.filePath,
                line: defLocation.line,
                character: defLocation.character,
              }
            : undefined,
          hoverInfo,
        };
      }
      return segment;
    }),
  }));
};

/**
 * IntelliJ-style Inlay Hints 추가 (간단한 테스트 버전)
 * 모든 CallExpression의 argument에 "test:" 힌트 표시
 *
 * @param lines - 코드 라인 배열
 * @param codeSnippet - 전체 코드
 * @param filePath - 파일 경로
 * @param files - 전체 파일 맵
 * @returns 업데이트된 코드 라인 배열
 */
export const addInlayHints = (
  lines: CodeLine[],
  codeSnippet: string,
  filePath: string,
  files: Record<string, string>
): CodeLine[] => {
  try {
    // Language Service 생성
    const languageService = createLanguageService(files, filePath);
    const fileName = filePath;

    // sourceFile 가져오기
    const program = languageService.getProgram();
    if (!program) {
      console.warn('[addInlayHints] No program available');
      return lines;
    }

    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
      console.warn('[addInlayHints] No sourceFile available');
      return lines;
    }

    // CallExpression의 모든 argument 위치 수집
    const allHints = new Map<number, string>(); // argPosition → paramName

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        // Language Service로 signature help 가져오기
        const expr = node.expression;
        const exprPos = expr.getEnd();

        try {
          const signatureHelp = languageService.getSignatureHelpItems(fileName, exprPos, {});

          if (signatureHelp && signatureHelp.items.length > 0) {
            const signature = signatureHelp.items[0];
            const parameters = signature.parameters;

            // 각 argument에 대응하는 parameter 이름 매핑
            node.arguments.forEach((arg, idx) => {
              if (idx < parameters.length) {
                const paramName = parameters[idx].name;
                const argStart = arg.getStart(sourceFile);
                allHints.set(argStart, paramName);
              }
            });
          }
        } catch (error) {
          // Signature help 실패해도 계속 진행
          console.debug('[addInlayHints] Signature help failed for:', node.expression.getText(sourceFile));
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (allHints.size === 0) {
      return lines;
    }

    // 각 라인의 segment에 inlayHint 추가
    const updatedLines = lines.map((line) => ({
      ...line,
      segments: line.segments.map((segment) => {
        if (segment.position !== undefined && allHints.has(segment.position)) {
          const paramName = allHints.get(segment.position)!;
          return {
            ...segment,
            inlayHint: {
              text: `${paramName}:`,
              position: 'before' as const,
            },
          };
        }
        return segment;
      }),
    }));

    return updatedLines;
  } catch (error) {
    console.error('[addInlayHints] Error adding inlay hints:', error);
    return lines;
  }
};
