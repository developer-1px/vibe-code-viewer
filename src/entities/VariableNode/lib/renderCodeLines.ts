/**
 * TypeScript AST 기반 코드 렌더링 (간소화 버전)
 * AST를 top-down으로 순회하면서 바로 렌더링
 */

import * as ts from 'typescript';
import type { CanvasNode } from '../../CanvasNode';
import type { FunctionAnalysis } from '../../../services/functionalParser/types';
import { findDefinitionLocation, getQuickInfoAtPosition } from './tsLanguageService';
import { collectFoldMetadata } from '../../../features/CodeFold/lib/collectFoldMetadata';
import type { FoldInfo, FoldPlaceholder } from '../../../features/CodeFold/lib/types';

export interface CodeSegment {
  text: string;
  kind: 'text' | 'keyword' | 'punctuation' | 'string' | 'comment' | 'identifier' | 'external-import' | 'external-closure' | 'external-function' | 'self' | 'local-variable' | 'parameter';
  nodeId?: string;
  definedIn?: string;
  offset?: number; // Position in line for accurate sorting
  isDeclarationName?: boolean; // 선언되는 변수/함수/타입 이름인지 여부
  position?: number; // 🆕 AST position for Language Service queries
  hoverInfo?: string; // 🆕 Quick info from Language Service
  definitionLocation?: { // 🆕 Definition location from Language Service
    filePath: string;
    line: number;
    character: number;
  };
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
  foldInfo?: FoldInfo;        // 🆕 Fold 관련 메타데이터
  isFolded?: boolean;          // 🆕 현재 접혀있는 상태인가? (UI에서 설정)
  foldedCount?: number;        // 🆕 접힌 라인 수 (UI에서 설정)
  isInsideFold?: boolean;      // 🆕 접힌 범위 내부 라인인가? (숨김 처리용, UI에서 설정)
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
  const processedCode = codeSnippet;
  const lines = processedCode.split('\n');
  const nodeShortId = nodeId.split('::').pop() || '';
  const isModule = nodeId.endsWith('::FILE_ROOT');

  // 🐛 디버깅: Module 노드의 codeSnippet 확인
  if (isModule) {
    console.log(`🔍 [renderCodeLines] Module node: ${nodeId}`);
    console.log(`🔍 [renderCodeLines] codeSnippet (first 300 chars):`, codeSnippet.substring(0, 300));
    console.log(`🔍 [renderCodeLines] Line 10:`, lines[9]); // 0-based index
  }

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

      // Hook 0: Declaration 노드 체크 (AST 기반)
      // VariableStatement, FunctionDeclaration, InterfaceDeclaration 등
      const isDeclaration =
        ts.isVariableStatement(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isModuleDeclaration(node);

      if (isDeclaration && lineIdx >= 0 && lineIdx < result.length) {
        result[lineIdx].hasDeclarationKeyword = true; // ⭐ Output Port 표시용

        // 선언 이름 추출 및 glow 표시
        let declarationName: ts.Identifier | undefined;

        if (ts.isVariableStatement(node)) {
          // const/let/var name = ...
          const declaration = node.declarationList.declarations[0];
          if (declaration && ts.isIdentifier(declaration.name)) {
            declarationName = declaration.name;
          }
        } else if (ts.isFunctionDeclaration(node) && node.name) {
          declarationName = node.name;
        } else if (ts.isInterfaceDeclaration(node)) {
          declarationName = node.name;
        } else if (ts.isTypeAliasDeclaration(node)) {
          declarationName = node.name;
        } else if (ts.isClassDeclaration(node) && node.name) {
          declarationName = node.name;
        } else if (ts.isEnumDeclaration(node)) {
          declarationName = node.name;
        } else if (ts.isModuleDeclaration(node)) {
          declarationName = node.name as ts.Identifier;
        }

        // 선언 이름에 glow 표시
        if (declarationName) {
          const nameStart = declarationName.getStart(sourceFile);
          const nameEnd = declarationName.getEnd();
          const nameLineIdx = sourceFile.getLineAndCharacterOfPosition(nameStart).line;

          // 접혀있는 코드(모듈)에서는 선언 이름을 클릭하면 해당 정의로 이동할 수 있도록 nodeId 설정
          const declarationNameText = declarationName.text;
          const targetNodeId = isModule ? `${filePath}::${declarationNameText}` : undefined;

          markPosition(nameLineIdx, nameStart, nameEnd, 'self', targetNodeId, true); // isDeclarationName = true
        }
      }

      // Declaration 키워드 수동 추출 (syntax highlighting용)
      if (ts.isInterfaceDeclaration(node)) {
        const interfacePos = processedCode.indexOf('interface', start);
        if (interfacePos !== -1 && interfacePos < end) {
          const keywordEnd = interfacePos + 'interface'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(interfacePos).line;
          markPosition(keywordLineIdx, interfacePos, keywordEnd, 'keyword');
        }
      }

      if (ts.isTypeAliasDeclaration(node)) {
        const typePos = processedCode.indexOf('type', start);
        if (typePos !== -1 && typePos < end) {
          const keywordEnd = typePos + 'type'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(typePos).line;
          markPosition(keywordLineIdx, typePos, keywordEnd, 'keyword');
        }
      }

      if (ts.isClassDeclaration(node)) {
        const classPos = processedCode.indexOf('class', start);
        if (classPos !== -1 && classPos < end) {
          const keywordEnd = classPos + 'class'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(classPos).line;
          markPosition(keywordLineIdx, classPos, keywordEnd, 'keyword');
        }
      }

      if (ts.isEnumDeclaration(node)) {
        const enumPos = processedCode.indexOf('enum', start);
        if (enumPos !== -1 && enumPos < end) {
          const keywordEnd = enumPos + 'enum'.length;
          const keywordLineIdx = sourceFile.getLineAndCharacterOfPosition(enumPos).line;
          markPosition(keywordLineIdx, enumPos, keywordEnd, 'keyword');
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
      isDeclarationNameOrDefinedIn?: boolean | string // true면 isDeclarationName, string이면 definedIn
    ) {
      const isDeclarationName = isDeclarationNameOrDefinedIn === true;
      const definedIn = typeof isDeclarationNameOrDefinedIn === 'string' ? isDeclarationNameOrDefinedIn : undefined;

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
          line.segments.push({ text, kind, nodeId, definedIn, offset, isDeclarationName, position: start });
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
          line.segments.push({ text, kind, nodeId, definedIn, offset, isDeclarationName, position: segStart });
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

    // 🆕 Fold 메타데이터 수집
    collectFoldMetadata(sourceFile, result);

    // 디버깅: fold 정보 확인
    const foldableLines = result.filter(line => line.foldInfo?.isFoldable);
    if (foldableLines.length > 0) {
      console.log(`📁 [renderCodeLines] Found ${foldableLines.length} foldable lines:`, foldableLines.map(l => `Line ${l.num}`));
    }

    // 🆕 Language Service로 모든 identifier에 대한 정의 위치 및 hover 정보 추가
    result.forEach(line => {
      line.segments.forEach(segment => {
        // identifier 계열 segment만 처리 (nodeId가 있는 것은 이미 처리됨)
        if (
          segment.position !== undefined &&
          (segment.kind === 'identifier' ||
           segment.kind === 'external-import' ||
           segment.kind === 'external-closure' ||
           segment.kind === 'external-function' ||
           segment.kind === 'local-variable' ||
           segment.kind === 'parameter') &&
          !segment.nodeId // nodeId가 없는 경우만 (있으면 이미 Go to Definition 있음)
        ) {
          // Get definition location
          const defLocation = findDefinitionLocation(processedCode, filePath || '', segment.position, isTsx);
          if (defLocation) {
            segment.definitionLocation = {
              filePath: defLocation.filePath,
              line: defLocation.line,
              character: defLocation.character,
            };
          }

          // Get hover info
          const hoverInfo = getQuickInfoAtPosition(processedCode, segment.position, isTsx);
          if (hoverInfo) {
            segment.hoverInfo = hoverInfo;
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
      segments: [{ text: lineText, kind: 'text' }],
      hasInput: false
    }));
  }
}
