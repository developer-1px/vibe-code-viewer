/**
 * TypeScript AST 기반 코드 렌더링 (Functional Single-pass)
 * 순수 함수와 선언적 스타일로 구현
 */

import * as ts from 'typescript';
import { collectFoldMetadata } from '@/features/Code/CodeFold/lib/collectFoldMetadata';
import { getImportSource } from '../../../../entities/SourceFileNode/lib/getters';
import type { SourceFileNode } from '../../../../entities/SourceFileNode/model/types';
import { resolvePath } from '../../../../shared/tsParser/utils/pathResolver';
import type { CodeLine, SegmentKind } from '../types/codeLine';
import {
  processDeclarationNode,
  processExportDeclaration,
  processExportDefault,
  processIdentifier,
  processTemplateLiteral,
} from './astHooks';
import { addComments, getSegmentKind } from './lib/astAnalyzers';
import { extractDeadIdentifiers } from './lib/deadCodeHelpers';
import { enrichWithLanguageService } from './lib/languageServiceEnrichers';
// Refactored pure functions
import { addSegmentToLines, createInitialLines, finalizeAllLines } from './lib/segmentBuilders';
import type { RenderContext } from './lib/types';
import {
  createDependencyMap,
  extractASTMetadata,
  extractShortId,
  isTsxFile,
  shouldSkipIdentifier,
} from './segmentUtils';

// Development mode flag (Vite injects this at build time)
const __DEV__ = import.meta.env.DEV;

// ===== Main 렌더링 함수 =====

/**
 * TypeScript 코드를 파싱해서 라인별 segment로 변환 (Functional Single-pass)
 */
export function renderCodeLinesDirect(
  node: SourceFileNode,
  files: Record<string, string>,
  deadCodeResults?: {
    unusedImports: Array<{ filePath: string; symbolName: string }>;
    unusedExports: Array<{ filePath: string; symbolName: string }>;
    deadFunctions: Array<{ filePath: string; symbolName: string }>;
    unusedVariables: Array<{ filePath: string; symbolName: string }>;
  } | null
): CodeLine[] {
  const codeSnippet = node.codeSnippet;
  const startLineNum = node.startLine || 1;
  const nodeId = node.id;
  const dependencies = node.dependencies;
  const filePath = node.filePath;

  const isTsx = isTsxFile(filePath);
  const lines = codeSnippet.split('\n');

  // SourceFile 가져오기
  const sourceFile = (node as any).sourceFile as ts.SourceFile | undefined;

  if (!sourceFile) {
    // Fallback: 단순 텍스트 렌더링 (orphaned files without AST)
    if (__DEV__) {
      console.log(`[renderCodeLinesDirect] No sourceFile for ${node.id}, using fallback text rendering`);
    }
    return lines.map((lineText, idx) => ({
      num: startLineNum + idx,
      segments: [{ text: lineText, kinds: ['text'] }],
      hasInput: false,
    }));
  }

  const nodeShortId = extractShortId(nodeId);
  // Phase 3-A: Combined metadata extraction (2 traversals → 1)
  const { parameters, localIdentifiers } = extractASTMetadata(sourceFile);
  const dependencyMap = createDependencyMap(dependencies);

  // ✅ Dead identifiers 계산 (VSCode처럼 muted 처리할 대상)
  const deadIdentifiers = extractDeadIdentifiers(deadCodeResults, filePath);

  try {
    // 초기 상태
    let currentLines = createInitialLines(lines.length, startLineNum);
    const declarationMap = new Map<string, number>(); // name → line index

    // Phase 1-2: Reuse empty Set instead of creating new Set() for each identifier
    const emptyLocalVars = new Set<string>();

    // Phase 2-B: Create render context to reduce parameter passing
    const renderContext: RenderContext = {
      nodeShortId,
      nodeId,
      filePath,
      parameters,
      localVars: emptyLocalVars,
      localIdentifiers,
      dependencyMap,
      files,
      getImportSource,
      resolvePath,
    };

    // Helper: segment 추가 함수 (Phase 1-3: No assignment needed, mutates in-place)
    const addKind = (
      start: number,
      end: number,
      kind: SegmentKind,
      nodeId?: string,
      isDeclarationNameOrDefinedIn?: boolean | string,
      tsNode?: ts.Node
    ): void => {
      addSegmentToLines(
        currentLines,
        sourceFile,
        codeSnippet,
        {
          start,
          end,
          kinds: [kind],
          nodeId,
          definedIn: typeof isDeclarationNameOrDefinedIn === 'string' ? isDeclarationNameOrDefinedIn : undefined,
          isDeclarationName: isDeclarationNameOrDefinedIn === true,
          tsNode,
        },
        deadIdentifiers
      );
    };

    // AST 순회 함수 (재귀)
    const visit = (node: ts.Node): void => {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();

      // Comments 처리 (Phase 1-3: Mutates in-place, no assignment needed)
      addComments(currentLines, node, sourceFile, codeSnippet, deadIdentifiers);

      // Declaration 노드 처리
      processDeclarationNode(node, sourceFile, currentLines, localIdentifiers, declarationMap, addKind);

      // Export Declaration 처리 (export { foo, bar })
      processExportDeclaration(node, sourceFile, currentLines, filePath);

      // Export Default 처리 (export default Identifier)
      processExportDefault(node, sourceFile, currentLines, declarationMap);

      // Keyword, Punctuation, String 체크
      const basicKind = getSegmentKind(node);
      if (basicKind) {
        if (basicKind === 'string') {
          const processed = processTemplateLiteral(node, sourceFile, addKind);
          if (processed) return;
        }

        addKind(start, end, basicKind);

        if (basicKind === 'keyword' || basicKind === 'punctuation' || basicKind === 'string') {
          return;
        }
      }

      // Identifier 체크
      if (ts.isIdentifier(node)) {
        const parent = (node as any).parent;

        if (shouldSkipIdentifier(node, parent)) {
          ts.forEachChild(node, visit);
          return;
        }

        // Phase 2-B: Use context object (13 params → 4 params)
        processIdentifier(node, sourceFile, renderContext, addKind);
      }

      // 자식 노드 순회
      node.getChildren(sourceFile).forEach(visit);
    };

    // AST 순회 실행
    visit(sourceFile);

    // 라인 마무리 (정렬 및 빈 공간 채우기)
    currentLines = finalizeAllLines(currentLines, lines, sourceFile);

    // Fold 메타데이터 적용 (lines를 직접 수정)
    collectFoldMetadata(sourceFile, currentLines);

    // Language Service로 정의 위치 및 hover 정보 추가
    currentLines = enrichWithLanguageService(currentLines, codeSnippet, filePath || '', isTsx);

    return currentLines;
  } catch (error) {
    console.error('Error parsing code:', error);

    // Fallback: 단순 텍스트 렌더링
    return lines.map((lineText, idx) => ({
      num: startLineNum + idx,
      segments: [{ text: lineText, kinds: ['text'] }],
      hasInput: false,
    }));
  }
}
