/**
 * TypeScript AST 기반 코드 렌더링
 * 중간 데이터 구조 없이 AST를 직접 순회하며 렌더링 정보 생성
 */

import * as ts from 'typescript';
import type { FunctionAnalysis } from '../../../services/functionalParser/types';

export interface CodeSegment {
  text: string;
  kind: 'text' | 'keyword' | 'punctuation' | 'string' | 'comment' | 'identifier' | 'external-import' | 'external-closure' | 'self' | 'local-variable' | 'function-call';
  nodeId?: string; // dependency 연결용
  definedIn?: string; // external reference 또는 function call의 정의 위치 (filePath::name)
}

export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  hasInput: boolean;
  hasTopLevelReturn?: boolean; // 최상위 레벨 return 문 여부
}

/**
 * 함수 본문을 접어서 한 줄로 변환 (코드 폴딩)
 */
function foldFunctionBodies(code: string, isTsx = false): string {
  try {
    const sourceFile = ts.createSourceFile(
      isTsx ? 'temp.tsx' : 'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // 함수들의 본문 위치를 수집
    const foldRanges: Array<{ start: number; end: number; declarationEnd: number }> = [];

    function visit(node: ts.Node) {
      // Function declarations and arrow functions
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        if (node.body && ts.isBlock(node.body)) {
          const bodyStart = node.body.getStart(sourceFile);
          const bodyEnd = node.body.getEnd();
          const openBrace = code.indexOf('{', bodyStart);
          const closeBrace = code.lastIndexOf('}', bodyEnd);

          if (openBrace !== -1 && closeBrace !== -1) {
            // 함수 선언부 끝 = { 직전
            foldRanges.push({
              start: openBrace,
              end: closeBrace + 1,
              declarationEnd: openBrace
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // 뒤에서부터 치환 (인덱스 변경 방지)
    foldRanges.sort((a, b) => b.start - a.start);

    let result = code;
    foldRanges.forEach(range => {
      const before = result.slice(0, range.start);
      const after = result.slice(range.end);
      result = before + '{ ... }' + after;
    });

    return result;
  } catch (error) {
    return code;
  }
}

/**
 * TypeScript 코드를 파싱해서 라인별 segment로 변환
 */
export function renderCodeLines(
  codeSnippet: string,
  startLineNum: number,
  nodeId: string,
  dependencies: string[],
  localVariableNames?: string[],
  functionAnalysis?: FunctionAnalysis,
  filePath?: string
): CodeLine[] {
  // TSX 파일 여부 판단
  const isTsx = filePath?.endsWith('.tsx') || filePath?.endsWith('.jsx') || false;

  // Module 노드의 경우 함수 본문 접기
  const isModule = nodeId.endsWith('::FILE_ROOT');
  const processedCode = isModule ? foldFunctionBodies(codeSnippet, isTsx) : codeSnippet;
  const lines = processedCode.split('\n');
  const nodeShortId = nodeId.split('::').pop() || '';
  const localVarSet = new Set(localVariableNames || []);

  // 디버깅: 함수 노드의 코드 스니펫 확인
  if (!isModule && nodeShortId !== 'FILE_ROOT') {
    console.log(`📝 Node: ${nodeShortId}, Dependencies:`, dependencies);
  }

  try {
    const sourceFile = ts.createSourceFile(
      isTsx ? 'temp.tsx' : 'temp.ts',
      processedCode,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // 전체 소스 텍스트 (JSX 주석 추출에 필요)
    const fullText = sourceFile.getFullText();

    // 1. AST에서 모든 토큰 추출 (위치 기반)
    const tokens: Array<{
      start: number;
      end: number;
      text: string;
      kind: ts.SyntaxKind;
      isIdentifier?: boolean;
      isDependency?: boolean;
      isSelf?: boolean;
      isExternalImport?: boolean;
      isExternalClosure?: boolean;
      isLocalVariable?: boolean;
      isFunctionCall?: boolean;
      nodeId?: string;
      definedIn?: string;
    }> = [];

    // External references 맵 생성 (functionAnalysis가 있을 경우)
    const externalRefMap = new Map<string, { type: 'import' | 'closure'; positions: number[]; definedIn?: string }>();
    if (functionAnalysis) {
      functionAnalysis.externalDeps.forEach(dep => {
        dep.usages.forEach(usage => {
          const adjustedStart = usage.start - functionAnalysis.codeStartOffset;
          if (!externalRefMap.has(dep.name)) {
            externalRefMap.set(dep.name, {
              type: dep.type,
              positions: [],
              definedIn: (dep as any).definedIn // TypeScript parser의 definedIn 정보
            });
          }
          externalRefMap.get(dep.name)!.positions.push(adjustedStart);
        });
      });
    }

    // 최상위 레벨 return 문 위치 찾기 (중첩 함수 제외)
    const topLevelReturnPositions = new Set<number>();
    function findTopLevelReturns(node: ts.Node, depth: number = 0) {
      if (ts.isReturnStatement(node) && depth === 0) {
        // 최상위 레벨 return 문
        const returnKeywordPos = node.getStart(sourceFile);
        topLevelReturnPositions.add(returnKeywordPos);
      }

      // 중첩 함수를 만나면 depth 증가
      const isNestedFunction =
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node);

      node.forEachChild(child => {
        findTopLevelReturns(child, isNestedFunction ? depth + 1 : depth);
      });
    }

    // Module 노드가 아닐 때만 최상위 return 찾기
    if (!isModule && functionAnalysis) {
      findTopLevelReturns(sourceFile);
    }

    // JSX 주석 범위 저장 (중괄호 포함)
    const jsxCommentRanges: Array<{ start: number; end: number }> = [];
    if (isTsx) {
      const jsxCommentMatches = fullText.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g);
      for (const match of jsxCommentMatches) {
        if (match.index !== undefined) {
          jsxCommentRanges.push({
            start: match.index,
            end: match.index + match[0].length
          });
        }
      }
    }

    // 특정 위치가 JSX 주석 범위 안에 있는지 확인
    function isInsideJsxComment(pos: number): boolean {
      return jsxCommentRanges.some(range => pos >= range.start && pos < range.end);
    }

    // AST 순회하며 토큰 수집 (getChildren 사용하여 모든 리프 토큰 추출)
    function visit(node: ts.Node) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const text = node.getText(sourceFile);

      // JSX 주석 안의 토큰은 스킵
      if (isInsideJsxComment(start)) {
        return;
      }

      // Keywords
      if (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
        tokens.push({ start, end, text, kind: node.kind });
        return;
      }

      // Punctuation
      if (node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation) {
        tokens.push({ start, end, text, kind: node.kind });
        return;
      }

      // Strings
      if (ts.isStringLiteral(node) || ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        tokens.push({ start, end, text, kind: ts.SyntaxKind.StringLiteral });
        // Template expressions have children, so continue
        if (ts.isTemplateExpression(node)) {
          node.getChildren(sourceFile).forEach(child => visit(child));
        }
        return;
      }

      // Identifiers
      if (ts.isIdentifier(node)) {
        const name = node.text;

        // Check if it's local variable
        const isLocalVar = localVarSet.has(name);

        // Check if it's self reference
        const isSelf = name === nodeShortId;

        // Check if it's external reference (from functionAnalysis)
        let isExternal = false;
        let externalType: 'import' | 'closure' | undefined;
        let externalDefinedIn: string | undefined;
        if (externalRefMap.has(name)) {
          const ref = externalRefMap.get(name)!;
          if (ref.positions.includes(start)) {
            isExternal = true;
            externalType = ref.type;
            externalDefinedIn = ref.definedIn;
          }
        }

        // Check if it's in dependencies
        const matchedDep = dependencies.find(dep => dep.endsWith(`::${name}`));

        // 디버깅: dependency 매칭 확인
        if (matchedDep && !isModule) {
          console.log(`🔗 Matched dependency: ${name} → ${matchedDep}`);
        }

        if (isSelf || matchedDep || isExternal || isLocalVar) {
          // Skip property access (obj.prop)
          const parent = (node as any).parent;
          if (parent && (ts.isPropertyAccessExpression(parent) || ts.isPropertyAccessChain(parent))) {
            if (parent.name === node) {
              return;
            }
          }

          // Skip property keys
          if (parent && ts.isPropertyAssignment(parent) && parent.name === node) {
            return;
          }

          tokens.push({
            start,
            end,
            text: name,
            kind: ts.SyntaxKind.Identifier,
            isIdentifier: true,
            isSelf,
            isDependency: !!matchedDep,
            isExternalImport: isExternal && externalType === 'import',
            isExternalClosure: isExternal && externalType === 'closure',
            isLocalVariable: isLocalVar,
            nodeId: isSelf ? nodeId : matchedDep,
            definedIn: externalDefinedIn
          });
        }
        return;
      }

      // 복합 노드는 children 순회
      node.getChildren(sourceFile).forEach(child => visit(child));
    }

    visit(sourceFile);

    // Comments 추출 (중복 방지를 위해 Set 사용)
    const processedComments = new Set<number>();

    // 1. Leading/Trailing comments 추출
    ts.forEachChild(sourceFile, function visitForComments(node) {
      const nodeFullStart = node.getFullStart();
      const nodeStart = node.getStart(sourceFile);

      if (nodeFullStart < nodeStart) {
        const leadingText = fullText.substring(nodeFullStart, nodeStart);
        const commentMatches = leadingText.matchAll(/\/\/.*|\/\*[\s\S]*?\*\//g);
        for (const match of commentMatches) {
          if (match.index !== undefined) {
            const start = nodeFullStart + match.index;
            const end = start + match[0].length;

            // JSX 주석 범위 안에 있으면 스킵 (중복 방지)
            if (isInsideJsxComment(start)) {
              continue;
            }

            // 중복 체크
            if (!processedComments.has(start)) {
              tokens.push({
                start,
                end,
                text: match[0],
                kind: ts.SyntaxKind.SingleLineCommentTrivia
              });
              processedComments.add(start);
            }
          }
        }
      }

      ts.forEachChild(node, visitForComments);
    });

    // 2. JSX 주석 추출: {/* ... */}
    if (isTsx) {
      const jsxCommentMatches = fullText.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g);
      for (const match of jsxCommentMatches) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = start + match[0].length;

          // 중복 체크
          if (!processedComments.has(start)) {
            tokens.push({
              start,
              end,
              text: match[0],
              kind: ts.SyntaxKind.MultiLineCommentTrivia
            });
            processedComments.add(start);
          }
        }
      }
    }

    // 2. 토큰을 라인별로 그룹화
    tokens.sort((a, b) => a.start - b.start);

    // 디버깅: 중복 토큰 체크
    const tokenStarts = new Map<number, number>();
    tokens.forEach(token => {
      const count = tokenStarts.get(token.start) || 0;
      tokenStarts.set(token.start, count + 1);
    });

    // 중복된 토큰 필터링
    const uniqueTokens: typeof tokens = [];
    const seenPositions = new Set<string>();
    tokens.forEach(token => {
      const key = `${token.start}-${token.end}`;
      if (!seenPositions.has(key)) {
        uniqueTokens.push(token);
        seenPositions.add(key);
      }
    });

    const result: CodeLine[] = [];
    let currentOffset = 0;

    lines.forEach((lineText, lineIdx) => {
      const lineStart = currentOffset;
      const lineEnd = currentOffset + lineText.length;
      const lineNum = startLineNum + lineIdx;
      currentOffset = lineEnd + 1; // +1 for \n

      // 현재 라인과 겹치는 토큰 필터링 (멀티라인 토큰 포함)
      const lineTokens = uniqueTokens.filter(t => {
        // 토큰이 현재 라인과 겹치는지 확인
        return t.start < lineEnd && t.end > lineStart;
      });
      const segments: CodeSegment[] = [];
      let cursor = lineStart;
      let hasInput = false;

      // 최상위 return 문이 이 라인에 있는지 확인
      let hasTopLevelReturn = false;
      lineTokens.forEach(token => {
        if (token.kind === ts.SyntaxKind.ReturnKeyword && topLevelReturnPositions.has(token.start)) {
          hasTopLevelReturn = true;
        }
      });

      lineTokens.forEach(token => {
        // 토큰의 현재 라인 내 시작/끝 위치
        const tokenStartInLine = Math.max(token.start, lineStart);
        const tokenEndInLine = Math.min(token.end, lineEnd);

        // Text before token (within current line)
        if (tokenStartInLine > cursor) {
          const text = processedCode.slice(cursor, tokenStartInLine);
          if (text) {
            segments.push({ text, kind: 'text' });
          }
        }

        // Determine segment kind
        let kind: CodeSegment['kind'] = 'text';
        if (token.isSelf) {
          kind = 'self';
          hasInput = true;
        } else if (token.isLocalVariable) {
          kind = 'local-variable';
        } else if (token.isExternalImport) {
          kind = 'external-import';
          hasInput = true;
        } else if (token.isExternalClosure) {
          kind = 'external-closure';
          hasInput = true;
        } else if (token.isDependency) {
          kind = 'identifier';
          hasInput = true;
        } else if (token.kind >= ts.SyntaxKind.FirstKeyword && token.kind <= ts.SyntaxKind.LastKeyword) {
          kind = 'keyword';
        } else if (token.kind >= ts.SyntaxKind.FirstPunctuation && token.kind <= ts.SyntaxKind.LastPunctuation) {
          kind = 'punctuation';
        } else if (token.kind === ts.SyntaxKind.StringLiteral) {
          kind = 'string';
        } else if (token.kind === ts.SyntaxKind.SingleLineCommentTrivia || token.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
          kind = 'comment';
        } else if (token.isIdentifier) {
          kind = 'identifier';
        }

        // 현재 라인 내에서만 토큰 텍스트 추출 (멀티라인 토큰 처리)
        const tokenTextInLine = processedCode.slice(tokenStartInLine, tokenEndInLine);

        if (tokenTextInLine) {
          segments.push({
            text: tokenTextInLine,
            kind,
            nodeId: token.nodeId,
            definedIn: token.definedIn
          });
        }

        cursor = tokenEndInLine;
      });

      // Trailing text
      if (cursor < lineEnd) {
        const text = processedCode.slice(cursor, lineEnd);
        if (text) {
          segments.push({ text, kind: 'text' });
        }
      }

      // Empty line
      if (segments.length === 0) {
        segments.push({ text: lineText, kind: 'text' });
      }

      result.push({
        num: lineNum,
        segments,
        hasInput,
        hasTopLevelReturn
      });
    });

    return result;

  } catch (error) {
    console.error('Error parsing code:', error);
    // Fallback: plain text
    return lines.map((lineText, idx) => ({
      num: startLineNum + idx,
      segments: [{ text: lineText, kind: 'text' as const }],
      hasInput: false
    }));
  }
}
