/**
 * TypeScript AST 기반 코드 렌더링 (간소화 버전)
 * AST를 top-down으로 순회하면서 바로 렌더링
 */

import * as ts from 'typescript';
import type { CanvasNode } from '../../CanvasNode';
import type { FunctionAnalysis } from '../../../services/functionalParser/types';

export interface CodeSegment {
  text: string;
  kind: 'text' | 'keyword' | 'punctuation' | 'string' | 'comment' | 'identifier' | 'external-import' | 'external-closure' | 'external-function' | 'self' | 'local-variable' | 'parameter';
  nodeId?: string;
  definedIn?: string;
  offset?: number; // Position in line for accurate sorting
}

// AST에서 segment kind를 결정하는 Hook
function getSegmentKind(node: ts.Node): CodeSegment['kind'] | null {
  // Keywords
  if (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
    return 'keyword';
  }

  // Punctuation
  if (node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation) {
    return 'punctuation';
  }

  // Strings
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return 'string';
  }

  return null;
}

export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  hasInput: boolean;
  hasTopLevelReturn?: boolean;
  hasDeclarationKeyword?: boolean; // interface, type, class, enum 등의 선언 키워드가 있는 라인
}

/**
 * Module 노드의 함수 본문 접기
 */
function foldFunctionBodies(code: string, isTsx: boolean): string {
  try {
    const sourceFile = ts.createSourceFile(
      isTsx ? 'temp.tsx' : 'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // 함수들의 본문 위치 수집
    const folds: Array<{ start: number; end: number }> = [];

    function visit(node: ts.Node) {
      // Function declarations and arrow functions
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        if (node.body && ts.isBlock(node.body)) {
          const openBrace = code.indexOf('{', node.body.getStart(sourceFile));
          const closeBrace = code.lastIndexOf('}', node.body.getEnd());

          if (openBrace !== -1 && closeBrace !== -1 && closeBrace > openBrace) {
            folds.push({ start: openBrace + 1, end: closeBrace });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // 뒤에서부터 교체 (인덱스 변경 방지)
    folds.sort((a, b) => b.start - a.start);
    let result = code;

    folds.forEach(({ start, end }) => {
      result = result.slice(0, start) + ' ... ' + result.slice(end);
    });

    return result;
  } catch {
    return code;
  }
}

/**
 * TypeScript 코드를 파싱해서 라인별 segment로 변환
 */
export function renderCodeLines(node: CanvasNode): CodeLine[] {
  const codeSnippet = node.codeSnippet;
  const startLineNum = node.startLine || 1;
  const nodeId = node.id;
  const dependencies = node.dependencies;
  const localVariableNames = node.localVariableNames;
  const functionAnalysis = node.functionAnalysis;
  const filePath = node.filePath;

  const isTsx = filePath?.endsWith('.tsx') || filePath?.endsWith('.jsx') || false;
  const isModule = nodeId.endsWith('::FILE_ROOT');

  // Module이면 함수 본문 접기
  const processedCode = isModule ? foldFunctionBodies(codeSnippet, isTsx) : codeSnippet;
  const lines = processedCode.split('\n');
  const nodeShortId = nodeId.split('::').pop() || '';

  // 참조 맵 생성
  const localVars = new Set(localVariableNames || []);
  const parameters = functionAnalysis?.parameters ? new Set(functionAnalysis.parameters) : new Set<string>();
  const dependencyMap = new Map<string, string>();
  dependencies.forEach(dep => {
    const name = dep.split('::').pop();
    if (name) dependencyMap.set(name, dep);
  });

  // External references 맵
  const externalRefs = new Map<string, { type: 'import' | 'closure'; definedIn?: string; isFunction?: boolean }>();
  if (functionAnalysis) {
    functionAnalysis.externalDeps.forEach((dep: any) => {
      externalRefs.set(dep.name, {
        type: dep.type,
        definedIn: dep.definedIn,
        isFunction: dep.isFunction
      });
    });
  }

  try {
    const sourceFile = ts.createSourceFile(
      isTsx ? 'temp.tsx' : 'temp.ts',
      processedCode,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // 결과 라인 배열
    const result: CodeLine[] = lines.map((_, idx) => ({
      num: startLineNum + idx,
      segments: [],
      hasInput: false
    }));

    // 우선순위 정의 (높을수록 우선)
    const PRIORITY: Record<CodeSegment['kind'], number> = {
      'keyword': 100,           // 최우선
      'punctuation': 90,
      'string': 80,
      'comment': 70,
      'self': 60,
      'external-import': 50,
      'external-function': 45,
      'external-closure': 40,
      'identifier': 30,
      'parameter': 20,
      'local-variable': 10,
      'text': 0,                // 최하위
    };

    // 이미 표시된 범위 추적 (우선순위 기반 덮어쓰기)
    const markedRanges: Array<{ start: number; end: number; kind: CodeSegment['kind'] }> = [];

    // 범위 겹침 시 우선순위 체크
    const canMark = (start: number, end: number, kind: CodeSegment['kind']): boolean => {
      const overlapping = markedRanges.filter(range => {
        return (start >= range.start && start < range.end) ||
               (end > range.start && end <= range.end) ||
               (start <= range.start && end >= range.end);
      });

      // 겹치는 범위가 없으면 OK
      if (overlapping.length === 0) return true;

      // 겹치는 범위가 있으면 우선순위 비교
      // 모든 겹치는 범위보다 우선순위가 높아야 함
      return overlapping.every(range => PRIORITY[kind] > PRIORITY[range.kind]);
    };

    // AST 순회하며 특별한 노드만 표시
    function visit(node: ts.Node) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const pos = sourceFile.getLineAndCharacterOfPosition(start);
      const lineIdx = pos.line;

      // Hook 0: Declaration 키워드 수동 추출 (interface, type, class, enum 등)
      // 이 키워드들은 별도의 AST 노드가 아니므로 수동으로 찾아야 함
      if (ts.isInterfaceDeclaration(node)) {
        const interfacePos = processedCode.indexOf('interface', start);
        if (interfacePos !== -1 && interfacePos < end) {
          const keywordEnd = interfacePos + 'interface'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(interfacePos).line;
          markPosition(keywordLineIdx, interfacePos, keywordEnd, 'keyword');
          result[keywordLineIdx].hasDeclarationKeyword = true; // ⭐ Output Port 표시용
        }
      }

      if (ts.isTypeAliasDeclaration(node)) {
        const typePos = processedCode.indexOf('type', start);
        if (typePos !== -1 && typePos < end) {
          const keywordEnd = typePos + 'type'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(typePos).line;
          markPosition(keywordLineIdx, typePos, keywordEnd, 'keyword');
          result[keywordLineIdx].hasDeclarationKeyword = true; // ⭐ Output Port 표시용
        }
      }

      if (ts.isClassDeclaration(node)) {
        const classPos = processedCode.indexOf('class', start);
        if (classPos !== -1 && classPos < end) {
          const keywordEnd = classPos + 'class'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(classPos).line;
          markPosition(keywordLineIdx, classPos, keywordEnd, 'keyword');
          result[keywordLineIdx].hasDeclarationKeyword = true; // ⭐ Output Port 표시용
        }
      }

      if (ts.isEnumDeclaration(node)) {
        const enumPos = processedCode.indexOf('enum', start);
        if (enumPos !== -1 && enumPos < end) {
          const keywordEnd = enumPos + 'enum'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(enumPos).line;
          markPosition(keywordLineIdx, enumPos, keywordEnd, 'keyword');
          result[keywordLineIdx].hasDeclarationKeyword = true; // ⭐ Output Port 표시용
        }
      }

      // Hook 1: Keyword, Punctuation, String 체크
      const basicKind = getSegmentKind(node);
      if (basicKind) {
        markPosition(lineIdx, start, end, basicKind);
        // Keyword, Punctuation, String은 자식 순회 안 함 (리프 노드)
        if (basicKind === 'keyword' || basicKind === 'punctuation' || basicKind === 'string') {
          return;
        }
      }

      // Hook 2: Identifier 체크
      if (ts.isIdentifier(node)) {
        const name = node.text;
        const parent = (node as any).parent;

        // JSX 태그 이름 체크 (Property access는 제외)
        const isJsxTag = parent && (
          ts.isJsxOpeningElement(parent) ||
          ts.isJsxSelfClosingElement(parent) ||
          ts.isJsxClosingElement(parent)
        ) && parent.tagName === node;

        // Property access 제외 (obj.prop에서 prop는 스킵)
        const isPropertyAccess = parent && (
          ts.isPropertyAccessExpression(parent) ||
          ts.isPropertyAccessChain(parent)
        ) && parent.name === node;

        // Property key 제외
        const isPropertyKey = parent && ts.isPropertyAssignment(parent) && parent.name === node;

        // 스킵 조건
        if (!isJsxTag && (isPropertyAccess || isPropertyKey)) {
          // 자식 순회 계속
          ts.forEachChild(node, visit);
          return;
        }

        // Self reference
        if (name === nodeShortId) {
          markPosition(lineIdx, start, end, 'self', nodeId);
          return;
        }

        // Parameter
        if (parameters.has(name)) {
          markPosition(lineIdx, start, end, 'parameter');
          return;
        }

        // Local variable
        if (localVars.has(name)) {
          markPosition(lineIdx, start, end, 'local-variable');
          return;
        }

        // Dependency (먼저 체크 - slot 생성 우선)
        if (dependencyMap.has(name)) {
          markPosition(lineIdx, start, end, 'identifier', dependencyMap.get(name));
          return;
        }

        // External reference (dependency에 없는 것만)
        if (externalRefs.has(name)) {
          const ref = externalRefs.get(name)!;

          // file-level 변수가 함수면 다른 kind 사용
          let kind: CodeSegment['kind'];
          if (ref.type === 'import') {
            kind = 'external-import';
          } else if (ref.isFunction) {
            kind = 'external-function'; // 새로운 kind
          } else {
            kind = 'external-closure';
          }

          console.log(`🔍 [renderCodeLines] ${name}: ref.type=${ref.type}, ref.isFunction=${ref.isFunction}, kind=${kind}`);

          markPosition(lineIdx, start, end, kind, undefined, ref.definedIn);
          return;
        }
      }

      // 자식 노드 순회
      ts.forEachChild(node, visit);
    }

    // 위치 표시 헬퍼 (멀티라인 자동 처리)
    function markPosition(
      lineIdx: number,
      start: number,
      end: number,
      kind: CodeSegment['kind'],
      nodeId?: string,
      definedIn?: string
    ) {
      // 우선순위 체크
      if (!canMark(start, end, kind)) return;

      const startPos = sourceFile.getLineAndCharacterOfPosition(start);
      const endPos = sourceFile.getLineAndCharacterOfPosition(end);

      // 같은 줄이면 기존 로직
      if (startPos.line === endPos.line) {
        if (lineIdx >= 0 && lineIdx < result.length) {
          const line = result[lineIdx];
          const text = processedCode.slice(start, end);
          const offset = startPos.character; // Character position in line
          line.segments.push({ text, kind, nodeId, definedIn, offset });
          if (kind !== 'local-variable' && kind !== 'parameter') {
            line.hasInput = true;
          }
          markedRanges.push({ start, end, kind });
        }
        return;
      }

      // 멀티라인이면 각 줄별로 분할
      for (let currentLine = startPos.line; currentLine <= endPos.line; currentLine++) {
        if (currentLine < 0 || currentLine >= result.length) continue;

        const lineStart = sourceFile.getPositionOfLineAndCharacter(currentLine, 0);
        const lineEnd = currentLine < lines.length - 1
          ? sourceFile.getPositionOfLineAndCharacter(currentLine + 1, 0) - 1
          : processedCode.length;

        const segStart = Math.max(start, lineStart);
        const segEnd = Math.min(end, lineEnd);

        if (segStart < segEnd) {
          const line = result[currentLine];
          const text = processedCode.slice(segStart, segEnd);
          const segPos = sourceFile.getLineAndCharacterOfPosition(segStart);
          const offset = segPos.character; // Character position in line
          line.segments.push({ text, kind, nodeId, definedIn, offset });
          if (kind !== 'local-variable' && kind !== 'parameter') {
            line.hasInput = true;
          }
        }
      }

      markedRanges.push({ start, end, kind });
    }

    // AST 순회
    visit(sourceFile);

    // Hook 3: Comments 추가 (AST에 없는 trivia)
    const fullText = sourceFile.getFullText();

    // JSX comments 먼저 처리 (일반 주석과 겹침 방지)
    if (isTsx) {
      const jsxComments = fullText.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*}/g);
      for (const match of jsxComments) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = start + match[0].length;
          const pos = sourceFile.getLineAndCharacterOfPosition(start);
          markPosition(pos.line, start, end, 'comment');
        }
      }
    }

    // Multi-line comments (일반 /* */)
    const multiLineComments = fullText.matchAll(/\/\*[\s\S]*?\*\//g);
    for (const match of multiLineComments) {
      if (match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        const pos = sourceFile.getLineAndCharacterOfPosition(start);
        markPosition(pos.line, start, end, 'comment');
      }
    }

    // Single-line comments
    const singleLineComments = fullText.matchAll(/\/\/.*/g);
    for (const match of singleLineComments) {
      if (match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        const pos = sourceFile.getLineAndCharacterOfPosition(start);
        markPosition(pos.line, start, end, 'comment');
      }
    }

    // 각 라인을 실제 텍스트로 채우기
    result.forEach((line, idx) => {
      const lineText = lines[idx];

      if (line.segments.length === 0) {
        // 특별한 토큰이 없으면 그냥 텍스트로
        line.segments = [{ text: lineText, kind: 'text' }];
      } else {
        // offset 기준으로 정렬 (정확한 위치 순서)
        line.segments.sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));

        // 토큰 사이의 텍스트 채우기
        const newSegments: CodeSegment[] = [];
        let cursor = 0;

        line.segments.forEach(seg => {
          const segOffset = seg.offset ?? cursor;

          if (segOffset > cursor) {
            // 토큰 앞의 텍스트
            newSegments.push({
              text: lineText.slice(cursor, segOffset),
              kind: 'text'
            });
          }

          // offset 제거하고 추가 (렌더링에는 필요 없음)
          const { offset, ...segmentWithoutOffset } = seg;
          newSegments.push(segmentWithoutOffset);
          cursor = segOffset + seg.text.length;
        });

        // 남은 텍스트
        if (cursor < lineText.length) {
          newSegments.push({
            text: lineText.slice(cursor),
            kind: 'text'
          });
        }

        line.segments = newSegments;
      }
    });

    return result;

  } catch (error) {
    console.error('Error parsing code:', error);

    // Fallback: 단순 텍스트 렌더링
    return lines.map((lineText, idx) => ({
      num: startLineNum + idx,
      segments: [{ text: lineText, kind: 'text' }],
      hasInput: false
    }));
  }
}
