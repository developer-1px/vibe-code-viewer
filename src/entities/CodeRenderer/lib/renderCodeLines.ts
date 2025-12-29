/**
 * TypeScript AST 기반 코드 렌더링 (간소화 버전)
 * AST를 top-down으로 순회하면서 바로 렌더링
 */

import * as ts from 'typescript'
import type {CanvasNode} from '../../CanvasNode'
import {findDefinitionLocation, getQuickInfoAtPosition} from './tsLanguageService'
import {collectFoldMetadata} from '../../../features/CodeFold/lib/collectFoldMetadata'
import type {CodeLine, CodeSegment, SegmentKind} from '../model/types'

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

  // 파일 노드면 파일명만, 함수 노드면 함수명만 추출
  const nodeShortId = nodeId.includes('::')
    ? nodeId.split('::').pop() || ''
    : nodeId.split('/').pop()?.replace(/\.(tsx?|jsx?|vue)$/, '') || '';

  // 참조 맵 생성
  const localVars = new Set(localVariableNames || []);
  const parameters = functionAnalysis?.parameters ? new Set(functionAnalysis.parameters) : new Set<string>();
  const dependencyMap = new Map<string, string>();
  dependencies.forEach(dep => {
    const name = dep.split('::').pop();
    if (name) dependencyMap.set(name, dep);
  });

  // External references 맵 (함수 분석 + identifierSources 통합)
  const externalRefs = new Map<string, { type: 'import' | 'closure'; definedIn?: string; isFunction?: boolean }>();

  // functionAnalysis가 있으면 externalDeps 추가 (함수 노드)
  functionAnalysis?.externalDeps.forEach((dep: any) => {
    externalRefs.set(dep.name, {
      type: dep.type,
      definedIn: dep.definedIn,
      isFunction: dep.isFunction
    });
  });

  // ✅ identifierSources가 있으면 추가 (파일 노드)
  if ((node as any).identifierSources) {
    const identifierSources = (node as any).identifierSources as Record<string, string>;
    Object.entries(identifierSources).forEach(([name, sourceFile]) => {
      if (!externalRefs.has(name)) {
        // npm module인지 local file인지 구분
        const isNpmModule = sourceFile.startsWith('npm:');
        externalRefs.set(name, {
          type: 'import',
          definedIn: sourceFile,
          isFunction: false,
          isNpmModule // npm module 여부 추가
        });
      }
    });
  }

  // Local identifiers 추적 (파일 내에서 선언된 identifier)
  const localIdentifiers = new Set<string>();

  try {
    const sourceFile = ts.createSourceFile(
      isTsx ? 'temp.tsx' : 'temp.ts',
      processedCode,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // ✅ TypeScript 내장 기능 활용 (파일 노드인 경우만)
    // functionAnalysis가 없으면 파일 노드 → import된 것들을 external로 등록
    if (!functionAnalysis) {
      // sourceFile.identifiers에서 dependencies와 매칭되는 것들만 추출
      if (sourceFile.identifiers) {
        sourceFile.identifiers.forEach((_, identifierName) => {
          const matchingDep = dependencies.find(dep => dep.split('::').pop() === identifierName);
          // dependencies에 있고, 같은 파일이 아닌 것만 external import
          if (matchingDep) {
            const depFilePath = matchingDep.split('::')[0];
            if (depFilePath !== filePath && !externalRefs.has(identifierName)) {
              externalRefs.set(identifierName, {
                type: 'import',
                definedIn: matchingDep,
                isFunction: false
              });
            }
          }
        });
      }
    }

    // 결과 라인 배열
    const result: CodeLine[] = lines.map((_, idx) => ({
      num: startLineNum + idx,
      segments: [],
      hasInput: false
    }));

    // 위치별로 모든 kind를 수집 (같은 위치에 여러 kind가 있을 수 있음)
    const segmentMap = new Map<string, { // key: "start-end"
      start: number;
      end: number;
      kinds: Set<SegmentKind>;
      nodeId?: string;
      definedIn?: string;
      isDeclarationName?: boolean;
      position?: number;
    }>();

    function getSegmentKey(start: number, end: number): string {
      return `${start}-${end}`;
    }

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

        // 선언 이름에 glow 표시 및 local identifier로 등록
        if (declarationName) {
          const nameStart = declarationName.getStart(sourceFile);
          const nameEnd = declarationName.getEnd();
          const nameLineIdx = sourceFile.getLineAndCharacterOfPosition(nameStart).line;

          addKind(nameStart, nameEnd, 'self', undefined, true); // isDeclarationName = true

          // Local identifier로 등록
          localIdentifiers.add(declarationName.text);
        }
      }

      // Hook 1: Keyword, Punctuation, String 체크
      const basicKind = getSegmentKind(node);
      if (basicKind) {
        // Template literal의 특수 처리: ${ 와 } 분리
        if (basicKind === 'string' && (ts.isTemplateHead(node) || ts.isTemplateMiddle(node))) {
          // TemplateHead: `text${ → `text` (string) + ${ (punctuation)
          // TemplateMiddle: }text${ → } (punctuation) + text (string) + ${ (punctuation)
          const text = node.getText(sourceFile);

          if (ts.isTemplateMiddle(node)) {
            // } 부분은 punctuation
            addKind(start, start + 1, 'punctuation');
            // 중간 텍스트는 string
            if (text.length > 3) { // } + text + ${
              addKind(start + 1, end - 2, 'string');
            }
            // ${ 부분은 punctuation
            addKind(end - 2, end, 'punctuation');
          } else {
            // TemplateHead: text${
            // 텍스트 부분은 string (backtick 포함)
            addKind(start, end - 2, 'string');
            // ${ 부분은 punctuation
            addKind(end - 2, end, 'punctuation');
          }
          return;
        } else if (basicKind === 'string' && ts.isTemplateTail(node)) {
          // TemplateTail: }text` → } (punctuation) + text` (string)
          const text = node.getText(sourceFile);
          // } 부분은 punctuation
          addKind(start, start + 1, 'punctuation');
          // 나머지 텍스트와 backtick은 string
          if (text.length > 1) {
            addKind(start + 1, end, 'string');
          }
          return;
        } else {
          addKind(start, end, basicKind);
        }

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
          addKind(start, end, 'self', nodeId);
          addKind(start, end, 'identifier');
        }

        // Parameter
        if (parameters.has(name)) {
          addKind(start, end, 'parameter');
          addKind(start, end, 'identifier');
        }

        // Local variable
        if (localVars.has(name)) {
          addKind(start, end, 'local-variable');
          addKind(start, end, 'identifier');
        }

        // External reference + Dependency 통합 처리
        if (externalRefs.has(name)) {
          const ref = externalRefs.get(name)!;

          // npm module, local file, closure 구분
          let kind: SegmentKind;
          if (ref.type === 'import') {
            // npm module과 local file 구분
            kind = (ref as any).isNpmModule ? 'identifier' : 'external-import';
          } else if (ref.isFunction) {
            kind = 'external-function';
          } else {
            kind = 'external-closure';
          }

          // external kind 추가
          addKind(start, end, kind, undefined, ref.definedIn);
          // identifier kind도 추가 (dependency slot용)
          addKind(start, end, 'identifier', dependencyMap.get(name));
        } else if (dependencyMap.has(name)) {
          // externalRefs에 없지만 dependencyMap에는 있는 경우
          addKind(start, end, 'identifier', dependencyMap.get(name));
        } else if (localIdentifiers.has(name)) {
          // Local identifier (파일 내에서 선언된 것)
          addKind(start, end, 'identifier');
        }
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

    // JSX comments 먼저 처리 (일반 주석과 겹침 방지)
    if (isTsx) {
      const jsxComments = fullText.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*}/g);
      for (const match of jsxComments) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = start + match[0].length;
          addKind(start, end, 'comment');
        }
      }
    }

    // Multi-line comments (일반 /* */)
    const multiLineComments = fullText.matchAll(/\/\*[\s\S]*?\*\//g);
    for (const match of multiLineComments) {
      if (match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        addKind(start, end, 'comment');
      }
    }

    // Single-line comments
    const singleLineComments = fullText.matchAll(/\/\/.*/g);
    for (const match of singleLineComments) {
      if (match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        addKind(start, end, 'comment');
      }
    }

    // segmentMap을 라인별 segments로 변환
    const segmentsByLine = new Map<number, Array<{
      start: number;
      end: number;
      kinds: Set<SegmentKind>;
      nodeId?: string;
      definedIn?: string;
      isDeclarationName?: boolean;
      position?: number;
    }>>();

    // 각 segment를 라인별로 분류
    segmentMap.forEach((seg) => {
      const startPos = sourceFile.getLineAndCharacterOfPosition(seg.start);
      const endPos = sourceFile.getLineAndCharacterOfPosition(seg.end);

      // 같은 줄이면 직접 추가
      if (startPos.line === endPos.line) {
        const lineSegs = segmentsByLine.get(startPos.line) || [];
        lineSegs.push(seg);
        segmentsByLine.set(startPos.line, lineSegs);
      } else {
        // 멀티라인이면 각 줄별로 분할
        for (let currentLine = startPos.line; currentLine <= endPos.line; currentLine++) {
          const lineStart = sourceFile.getPositionOfLineAndCharacter(currentLine, 0);
          const lineEnd = currentLine < lines.length - 1
            ? sourceFile.getPositionOfLineAndCharacter(currentLine + 1, 0) - 1
            : processedCode.length;

          const segStart = Math.max(seg.start, lineStart);
          const segEnd = Math.min(seg.end, lineEnd);

          if (segStart < segEnd) {
            const lineSegs = segmentsByLine.get(currentLine) || [];
            lineSegs.push({
              ...seg,
              kinds: new Set(seg.kinds), // Set 복사
              start: segStart,
              end: segEnd
            });
            segmentsByLine.set(currentLine, lineSegs);
          }
        }
      }
    });

    // 각 라인을 실제 텍스트로 채우기
    result.forEach((line, idx) => {
      const lineText = lines[idx];
      const lineSegs = segmentsByLine.get(idx) || [];

      if (lineSegs.length === 0) {
        // 특별한 토큰이 없으면 그냥 텍스트로
        line.segments = [{ text: lineText, kinds: ['text'] }];
        return;
      }

      // start 위치 기준으로 정렬
      lineSegs.sort((a, b) => a.start - b.start);

      // 토큰 사이의 텍스트 채우기
      const newSegments: CodeSegment[] = [];
      let cursor = 0;

      lineSegs.forEach(seg => {
        const segPos = sourceFile.getLineAndCharacterOfPosition(seg.start);
        const segOffset = segPos.character;

        if (segOffset > cursor) {
          // 토큰 앞의 텍스트
          newSegments.push({
            text: lineText.slice(cursor, segOffset),
            kinds: ['text']
          });
        }

        // segment 추가
        const text = processedCode.slice(seg.start, seg.end);
        newSegments.push({
          text,
          kinds: Array.from(seg.kinds),
          nodeId: seg.nodeId,
          definedIn: seg.definedIn,
          isDeclarationName: seg.isDeclarationName,
          position: seg.position
        });
        cursor = segOffset + text.length;

        // hasInput 체크
        const kindsArray = Array.from(seg.kinds);
        if (!kindsArray.includes('local-variable') && !kindsArray.includes('parameter')) {
          line.hasInput = true;
        }
      });

      // 남은 텍스트
      if (cursor < lineText.length) {
        newSegments.push({
          text: lineText.slice(cursor),
          kinds: ['text']
        });
      }

      line.segments = newSegments;
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
          (segment.kinds.includes('identifier') ||
           segment.kinds.includes('external-import') ||
           segment.kinds.includes('external-closure') ||
           segment.kinds.includes('external-function') ||
           segment.kinds.includes('local-variable') ||
           segment.kinds.includes('parameter')) &&
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
      segments: [{ text: lineText, kinds: ['text'] }],
      hasInput: false
    }));
  }
}
