/**
 * TypeScript AST 기반 코드 렌더링 (Functional Single-pass)
 * 순수 함수와 선언적 스타일로 구현
 */

import * as ts from 'typescript'
import type {CanvasNode} from '../../../../entities/CanvasNode/model/types'
import {findDefinitionLocation, getQuickInfoAtPosition} from './tsLanguageService'
import type {CodeLine, CodeSegment, SegmentKind} from '../types/codeLine'
import {getImportSource} from '../../../../entities/SourceFileNode/lib/getters'
import {resolvePath} from '@/shared/tsParser/utils/pathResolver'
import {
  extractShortId,
  createDependencyMap,
  isTsxFile,
  extractLocalIdentifiers,
  shouldSkipIdentifier,
  extractParametersFromAST
} from './segmentUtils'
import {
  processDeclarationNode,
  processTemplateLiteral,
  processIdentifier,
  processExportDeclaration,
  processExportDefault
} from './astHooks'
import { collectFoldMetadata } from '../../../../features/CodeFold/lib/collectFoldMetadata'

// ===== 타입 정의 =====

interface SegmentToAdd {
  start: number;
  end: number;
  kinds: SegmentKind[];
  nodeId?: string;
  definedIn?: string;
  isDeclarationName?: boolean;
  tsNode?: ts.Node;
}

// ===== 순수 함수들 =====

/**
 * 초기 라인 상태 생성
 */
const createInitialLines = (lineCount: number, startLineNum: number): CodeLine[] => {
  return Array.from({ length: lineCount }, (_, idx) => ({
    num: startLineNum + idx,
    segments: [],
    hasInput: false
  }));
};

/**
 * 위치를 라인 번호와 오프셋으로 변환
 */
const getLinePosition = (
  position: number,
  sourceFile: ts.SourceFile
): { line: number; character: number } => {
  return sourceFile.getLineAndCharacterOfPosition(position);
};

/**
 * Segment를 라인에 추가 (불변 방식)
 */
const addSegmentToLine = (
  line: CodeLine,
  segment: CodeSegment
): CodeLine => {
  // Segment 중복 방지: 같은 위치에 같은 텍스트가 있으면 kinds만 병합
  const existing = line.segments.find(
    seg => seg.position === segment.position && seg.text === segment.text
  );

  if (existing) {
    // kinds 병합
    const mergedKinds = [...existing.kinds];
    segment.kinds.forEach(kind => {
      if (!mergedKinds.includes(kind)) {
        mergedKinds.push(kind);
      }
    });

    // 업데이트된 segment로 교체
    return {
      ...line,
      segments: line.segments.map(seg =>
        seg === existing
          ? {
              ...existing,
              kinds: mergedKinds,
              nodeId: segment.nodeId || existing.nodeId,
              definedIn: segment.definedIn || existing.definedIn,
              isDeclarationName: segment.isDeclarationName || existing.isDeclarationName,
              tsNode: segment.tsNode || existing.tsNode
            }
          : seg
      )
    };
  }

  // 새 segment 추가
  return {
    ...line,
    segments: [...line.segments, segment]
  };
};

/**
 * Segment를 여러 라인에 추가 (단일/멀티라인 처리)
 */
const addSegmentToLines = (
  lines: CodeLine[],
  sourceFile: ts.SourceFile,
  code: string,
  segmentToAdd: SegmentToAdd
): CodeLine[] => {
  const { start, end, kinds, nodeId, definedIn, isDeclarationName, tsNode } = segmentToAdd;

  const startPos = getLinePosition(start, sourceFile);
  const endPos = getLinePosition(end, sourceFile);

  // hasInput 체크
  const shouldMarkInput = !kinds.includes('local-variable') && !kinds.includes('parameter');

  if (startPos.line === endPos.line) {
    // 단일 라인
    return lines.map((line, idx) => {
      if (idx !== startPos.line) return line;

      const newLine = addSegmentToLine(line, {
        text: code.slice(start, end),
        kinds,
        nodeId,
        definedIn,
        isDeclarationName,
        position: start,
        tsNode
      });

      return shouldMarkInput ? { ...newLine, hasInput: true } : newLine;
    });
  }

  // 멀티라인
  return lines.map((line, lineNum) => {
    if (lineNum < startPos.line || lineNum > endPos.line) return line;

    const lineStart = sourceFile.getPositionOfLineAndCharacter(lineNum, 0);
    const nextLineStart = lineNum < lines.length - 1
      ? sourceFile.getPositionOfLineAndCharacter(lineNum + 1, 0)
      : code.length;

    const segStart = Math.max(start, lineStart);
    const segEnd = Math.min(end, nextLineStart - 1);

    if (segStart >= segEnd) return line;

    const newLine = addSegmentToLine(line, {
      text: code.slice(segStart, segEnd),
      kinds: [...kinds],
      nodeId,
      definedIn,
      isDeclarationName,
      position: segStart,
      tsNode
    });

    return (lineNum === startPos.line && shouldMarkInput)
      ? { ...newLine, hasInput: true }
      : newLine;
  });
};



/**
 * 라인의 segments를 정렬하고 빈 공간을 'text'로 채우기
 */
const fillLineGaps = (
  line: CodeLine,
  lineText: string,
  sourceFile: ts.SourceFile
): CodeLine => {
  // Segments를 position 기준으로 정렬
  const sortedSegments = [...line.segments].sort(
    (a, b) => (a.position || 0) - (b.position || 0)
  );

  // 빈 공간을 'text' segment로 채우기
  const filledSegments: CodeSegment[] = [];
  let cursor = 0;

  sortedSegments.forEach(seg => {
    const segPos = getLinePosition(seg.position || 0, sourceFile);
    const segOffset = segPos.character;

    if (segOffset > cursor) {
      // 앞의 빈 공간
      filledSegments.push({
        text: lineText.slice(cursor, segOffset),
        kinds: ['text']
      });
    }

    filledSegments.push(seg);
    cursor = segOffset + seg.text.length;
  });

  // 남은 텍스트
  if (cursor < lineText.length) {
    filledSegments.push({
      text: lineText.slice(cursor),
      kinds: ['text']
    });
  }

  // Segments가 없으면 전체 라인을 text로
  return {
    ...line,
    segments: filledSegments.length > 0
      ? filledSegments
      : [{ text: lineText, kinds: ['text'] }]
  };
};

/**
 * 모든 라인의 빈 공간 채우기
 */
const finalizeAllLines = (
  lines: CodeLine[],
  lineTexts: string[],
  sourceFile: ts.SourceFile
): CodeLine[] => {
  return lines.map((line, idx) =>
    fillLineGaps(line, lineTexts[idx], sourceFile)
  );
};

/**
 * AST에서 segment kind를 결정
 */
const getSegmentKind = (node: ts.Node): SegmentKind | null => {
  // Keywords
  if (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
    return 'keyword';
  }

  // Punctuation
  if (node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation) {
    return 'punctuation';
  }

  // Strings
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
};

/**
 * Comments 추가
 */
const addComments = (
  lines: CodeLine[],
  node: ts.Node,
  sourceFile: ts.SourceFile,
  code: string
): CodeLine[] => {
  let result = lines;

  // Leading comments
  const leadingCommentRanges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
  if (leadingCommentRanges) {
    leadingCommentRanges.forEach(range => {
      result = addSegmentToLines(result, sourceFile, code, {
        start: range.pos,
        end: range.end,
        kinds: ['comment']
      });
    });
  }

  // Trailing comments
  const trailingCommentRanges = ts.getTrailingCommentRanges(sourceFile.text, node.getEnd());
  if (trailingCommentRanges) {
    trailingCommentRanges.forEach(range => {
      result = addSegmentToLines(result, sourceFile, code, {
        start: range.pos,
        end: range.end,
        kinds: ['comment']
      });
    });
  }

  return result;
};

/**
 * Language Service로 정의 위치 및 hover 정보 추가
 */
const enrichWithLanguageService = (
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

// ===== Main 렌더링 함수 =====

/**
 * TypeScript 코드를 파싱해서 라인별 segment로 변환 (Functional Single-pass)
 */
export function renderCodeLinesDirect(node: CanvasNode, files: Record<string, string>): CodeLine[] {
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
    console.log(`[renderCodeLinesDirect] No sourceFile for ${node.id}, using fallback text rendering`);
    return lines.map((lineText, idx) => ({
      num: startLineNum + idx,
      segments: [{ text: lineText, kinds: ['text'] }],
      hasInput: false
    }));
  }

  const nodeShortId = extractShortId(nodeId);
  const parameters = extractParametersFromAST(sourceFile);
  const dependencyMap = createDependencyMap(dependencies);
  const localIdentifiers = extractLocalIdentifiers(sourceFile);

  try {
    // 초기 상태
    let currentLines = createInitialLines(lines.length, startLineNum);
    const declarationMap = new Map<string, number>(); // name → line index

    // Helper: segment 추가 함수
    const addKind = (
      start: number,
      end: number,
      kind: SegmentKind,
      nodeId?: string,
      isDeclarationNameOrDefinedIn?: boolean | string,
      tsNode?: ts.Node
    ): void => {
      currentLines = addSegmentToLines(currentLines, sourceFile, codeSnippet, {
        start,
        end,
        kinds: [kind],
        nodeId,
        definedIn: typeof isDeclarationNameOrDefinedIn === 'string' ? isDeclarationNameOrDefinedIn : undefined,
        isDeclarationName: isDeclarationNameOrDefinedIn === true,
        tsNode
      });
    };

    // AST 순회 함수 (재귀)
    const visit = (node: ts.Node): void => {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();

      // Comments 처리
      currentLines = addComments(currentLines, node, sourceFile, codeSnippet);

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

        processIdentifier(
          node,
          sourceFile,
          nodeShortId,
          nodeId,
          filePath,
          parameters,
          new Set(),
          localIdentifiers,
          dependencyMap,
          files,
          getImportSource,
          resolvePath,
          addKind
        );
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
      hasInput: false
    }));
  }
}
