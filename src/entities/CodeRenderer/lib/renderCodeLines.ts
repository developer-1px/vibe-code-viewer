/**
 * TypeScript AST 기반 코드 렌더링 (간소화 버전)
 * AST를 top-down으로 순회하면서 바로 렌더링
 */

import * as ts from 'typescript'
import type {CanvasNode} from '../../CanvasNode'
import {findDefinitionLocation, getQuickInfoAtPosition} from './tsLanguageService'
import {collectFoldMetadata} from '../../../features/CodeFold/lib/collectFoldMetadata'
import type {CodeLine, CodeSegment, SegmentKind} from '../model/types'
import {getImportSource} from '../../SourceFileNode/lib/getters'
import {resolvePath} from '../../../services/tsParser/utils/pathResolver'
import {
  extractShortId,
  createDependencyMap,
  isTsxFile,
  extractLocalIdentifiers,
  shouldSkipIdentifier,
  getSegmentKey
} from './segmentUtils'
import {extractAllComments} from './commentExtractor'
import {groupSegmentsByLine, populateLineSegments, type SegmentData} from './lineSegmentBuilder'
import {
  processDeclarationNode,
  processTemplateLiteral,
  processIdentifier,
  type AddKindFunction
} from './astHooks'

// AST에서 segment kind를 결정하는 Hook
function getSegmentKind(node: ts.Node): SegmentKind | null {
  // Keywords
  if (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
    return 'keyword';
  }

  // Punctuation
  if (node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation) {
    return 'punctuation';
  }

  // Strings (일반 문자열 + template literal)
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    return 'string';
  }

  return null;
}

/**
 * TypeScript 코드를 파싱해서 라인별 segment로 변환
 */
export function renderCodeLines(node: CanvasNode, files: Record<string, string>): CodeLine[] {
  const codeSnippet = node.codeSnippet;
  const startLineNum = node.startLine || 1;
  const nodeId = node.id;
  const dependencies = node.dependencies;
  const localVariableNames = node.localVariableNames;
  const functionAnalysis = node.functionAnalysis;
  const filePath = node.filePath;

  const isTsx = isTsxFile(filePath);
  const processedCode = codeSnippet;
  const lines = processedCode.split('\n');

  // SourceFile 가져오기 (SourceFileNode에서)
  const sourceFile = (node as any).sourceFile as ts.SourceFile | undefined;

  if (!sourceFile) {
    // SourceFile이 없으면 빈 결과 반환
    return [];
  }

  // 파일 노드면 파일명만, 함수 노드면 함수명만 추출
  const nodeShortId = extractShortId(nodeId);

  // 참조 맵 생성
  const localVars = new Set(localVariableNames || []);
  const parameters = functionAnalysis?.parameters ? new Set(functionAnalysis.parameters) : new Set<string>();
  const dependencyMap = createDependencyMap(dependencies);

  // Local identifiers 추적 (파일 내에서 선언된 identifier)
  const localIdentifiers = extractLocalIdentifiers(sourceFile);

  try {

    // 결과 라인 배열
    const result: CodeLine[] = lines.map((_, idx) => ({
      num: startLineNum + idx,
      segments: [],
      hasInput: false
    }));

    // 위치별로 모든 kind를 수집 (같은 위치에 여러 kind가 있을 수 있음)
    const segmentMap = new Map<string, SegmentData>();

    // AST 순회하며 특별한 노드만 표시
    function visit(node: ts.Node) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const pos = sourceFile.getLineAndCharacterOfPosition(start);
      const lineIdx = pos.line;

      // Hook 0: Declaration 노드 처리
      processDeclarationNode(node, sourceFile, result, localIdentifiers, addKind);

      // Hook 1: Keyword, Punctuation, String 체크
      const basicKind = getSegmentKind(node);
      if (basicKind) {
        // Template literal의 특수 처리
        if (basicKind === 'string') {
          const processed = processTemplateLiteral(node, sourceFile, addKind);
          if (processed) return;
        }

        addKind(start, end, basicKind);

        // Keyword, Punctuation, String은 자식 순회 안 함 (리프 노드)
        if (basicKind === 'keyword' || basicKind === 'punctuation' || basicKind === 'string') {
          return;
        }
      }

      // Hook 2: Identifier 체크
      if (ts.isIdentifier(node)) {
        const parent = (node as any).parent;

        // 스킵해야 하는 identifier인지 확인
        if (shouldSkipIdentifier(node, parent)) {
          ts.forEachChild(node, visit);
          return;
        }

        // Identifier 처리
        processIdentifier(
          node,
          sourceFile,
          nodeShortId,
          nodeId,
          filePath,
          parameters,
          localVars,
          localIdentifiers,
          dependencyMap,
          files,
          getImportSource,
          resolvePath,
          addKind
        );
      }

      // 자식 노드 순회 - getChildren()으로 모든 토큰 포함
      node.getChildren(sourceFile).forEach(visit);
    }

    // 위치에 kind 추가 (여러 kind를 누적)
    function addKind(
      start: number,
      end: number,
      kind: SegmentKind,
      nodeId?: string,
      isDeclarationNameOrDefinedIn?: boolean | string
    ) {
      const key = getSegmentKey(start, end);
      const existing = segmentMap.get(key);

      if (existing) {
        // 이미 있으면 kind만 추가
        existing.kinds.add(kind);
        if (nodeId) existing.nodeId = nodeId;
        if (typeof isDeclarationNameOrDefinedIn === 'string') {
          existing.definedIn = isDeclarationNameOrDefinedIn;
        } else if (isDeclarationNameOrDefinedIn === true) {
          existing.isDeclarationName = true;
        }
      } else {
        // 새로 생성
        segmentMap.set(key, {
          start,
          end,
          kinds: new Set([kind]),
          nodeId,
          definedIn: typeof isDeclarationNameOrDefinedIn === 'string' ? isDeclarationNameOrDefinedIn : undefined,
          isDeclarationName: isDeclarationNameOrDefinedIn === true,
          position: start
        });
      }
    }

    // AST 순회
    visit(sourceFile);

    // Hook 3: Comments 추가 (AST에 없는 trivia)
    const fullText = sourceFile.getFullText();
    const comments = extractAllComments(fullText, isTsx);
    comments.forEach(comment => {
      addKind(comment.start, comment.end, 'comment');
    });

    // segmentMap을 라인별 segments로 변환
    const segmentsByLine = groupSegmentsByLine(segmentMap, sourceFile, lines, processedCode);

    // 각 라인을 실제 텍스트로 채우기
    populateLineSegments(result, lines, segmentsByLine, sourceFile, processedCode);

    // Fold 메타데이터 수집
    collectFoldMetadata(sourceFile, result);

    // Language Service로 모든 identifier에 대한 정의 위치 및 hover 정보 추가
    result.forEach(line => {
      line.segments.forEach(segment => {
        // identifier 계열 segment만 처리 (nodeId가 있는 것은 이미 처리됨)
        if (
          segment.position !== undefined &&
          (segment.kinds.includes('identifier') ||
           segment.kinds.includes('external-import') ||
           segment.kinds.includes('external-closure') ||
           segment.kinds.includes('external-function') ||
           segment.kinds.includes('local-variable') ||
           segment.kinds.includes('parameter'))
        ) {
          // Get definition location (for both nodeId and non-nodeId segments)
          const defLocation = findDefinitionLocation(processedCode, filePath || '', segment.position, isTsx);
          if (defLocation) {
            segment.definitionLocation = {
              filePath: defLocation.filePath,
              line: defLocation.line,
              character: defLocation.character,
            };
          }

          // Get hover info (only for non-nodeId segments to avoid duplication)
          if (!segment.nodeId) {
            const hoverInfo = getQuickInfoAtPosition(processedCode, segment.position, isTsx);
            if (hoverInfo) {
              segment.hoverInfo = hoverInfo;
            }
          }
        }
      });
    });

    return result;

  } catch (error) {
    console.error('Error parsing code:', error);

    // Fallback: 단순 텍스트 렌더링
    return lines.map((lineText, idx) => ({
      num: startLineNum + idx,
      segments: [{ text: lineText, kinds: ['text'] }],
      hasInput: false
    }));
  }
}
