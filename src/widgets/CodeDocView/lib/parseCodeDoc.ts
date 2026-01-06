/**
 * CodeDoc Parser
 * 소스 파일을 주석과 코드 섹션으로 파싱
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import { extractExportSignatures } from './extractExportSignatures';
import { extractFileHeader } from './extractFileHeader';
import type { CodeDocSection, CommentStyle, ImportSymbol, ParsedCodeDoc, SymbolKind } from './types';

/**
 * Infer symbol kind from name patterns
 */
function inferSymbolKind(name: string, isTypeOnly: boolean): SymbolKind {
  // Type-only imports are likely types or interfaces
  if (isTypeOnly) {
    // PascalCase with "Props", "Type", "Options" suffix → type
    if (/^[A-Z][a-z]+[A-Z]/.test(name) && /(Props|Type|Options|Config|Data)$/.test(name)) {
      return 'type';
    }
    // PascalCase → interface or type
    if (/^[A-Z]/.test(name)) {
      return 'interface';
    }
    return 'type';
  }

  // PascalCase starting with uppercase → Component or Class
  if (/^[A-Z]/.test(name)) {
    // Known React components or custom components
    if (
      name.endsWith('Provider') ||
      name.endsWith('Context') ||
      name.endsWith('Button') ||
      name.endsWith('Modal') ||
      name.endsWith('View') ||
      name.endsWith('Card')
    ) {
      return 'component';
    }
    // Class-like names
    return 'class';
  }

  // camelCase starting with "use" → hook
  if (/^use[A-Z]/.test(name)) {
    return 'hook';
  }

  // UPPER_CASE → const
  if (/^[A-Z_]+$/.test(name)) {
    return 'const';
  }

  // camelCase → likely function
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
    return 'function';
  }

  return 'unknown';
}

/**
 * Extract all import symbols from a SourceFileNode
 */
function extractImportsFromAST(node: SourceFileNode): ImportSymbol[] {
  const imports: ImportSymbol[] = [];
  const sourceFile = node.sourceFile;

  ts.forEachChild(sourceFile, (child) => {
    // Only process ImportDeclaration nodes
    if (!ts.isImportDeclaration(child)) return;

    const importClause = child.importClause;
    if (!importClause) return;

    const moduleSpecifier = child.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const fromPath = moduleSpecifier.text;
    const isTypeOnly = importClause.isTypeOnly || false;

    // Named imports: import { foo, bar } from '...'
    if (importClause.namedBindings) {
      if (ts.isNamedImports(importClause.namedBindings)) {
        importClause.namedBindings.elements.forEach((element) => {
          const name = element.name.getText(sourceFile);
          const kind = inferSymbolKind(name, isTypeOnly || element.isTypeOnly);
          imports.push({
            name,
            kind,
            fromPath,
            isTypeOnly: isTypeOnly || element.isTypeOnly,
          });
        });
      }

      // Namespace import: import * as React from 'react'
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        const name = importClause.namedBindings.name.getText(sourceFile);
        imports.push({
          name,
          kind: 'const',
          fromPath,
          isTypeOnly,
        });
      }
    }

    // Default import: import React from 'react'
    if (importClause.name) {
      const name = importClause.name.getText(sourceFile);
      const kind = inferSymbolKind(name, isTypeOnly);
      imports.push({
        name,
        kind,
        fromPath,
        isTypeOnly,
      });
    }
  });

  return imports;
}

/**
 * 주석 스타일 분석
 */
function analyzeCommentStyle(commentText: string): {
  style: CommentStyle;
  headingText?: string;
} {
  const trimmed = commentText.trim();

  // Separator 스타일: // ==== Title ====
  const separatorMatch = trimmed.match(/^\/\/\s*={3,}\s*(.+?)\s*={3,}/);
  if (separatorMatch) {
    return {
      style: 'separator',
      headingText: separatorMatch[1].trim(),
    };
  }

  // JSDoc 스타일: /** ... */
  if (trimmed.startsWith('/**')) {
    return { style: 'jsdoc' };
  }

  // XML Doc 스타일: /// ...
  if (trimmed.startsWith('///')) {
    return { style: 'xml' };
  }

  // 블록 주석: /* ... */
  if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
    return { style: 'block' };
  }

  // 일반 한줄 주석: //
  return { style: 'line' };
}

/**
 * 주석 텍스트 정제 (주석 기호 제거)
 */
function cleanCommentText(commentText: string, style: CommentStyle): string {
  const lines = commentText.split('\n');

  if (style === 'jsdoc') {
    // /** ... */ 형식 정제
    return lines
      .map((line) => {
        let cleaned = line.trim();
        // 시작/끝 기호 제거
        cleaned = cleaned.replace(/^\/\*\*\s*/, '').replace(/\*\/$/, '');
        // 각 라인의 * 제거
        cleaned = cleaned.replace(/^\*\s?/, '');
        return cleaned;
      })
      .join('\n')
      .trim();
  }

  if (style === 'xml') {
    // /// ... 형식 정제
    return lines
      .map((line) => line.trim().replace(/^\/\/\/\s?/, ''))
      .join('\n')
      .trim();
  }

  if (style === 'block') {
    // /* ... */ 형식 정제
    return lines
      .map((line) => {
        let cleaned = line.trim();
        cleaned = cleaned.replace(/^\/\*\s*/, '').replace(/\*\/$/, '');
        cleaned = cleaned.replace(/^\*\s?/, '');
        return cleaned;
      })
      .join('\n');
  }

  if (style === 'separator') {
    // // ==== Title ==== 형식은 headingText만 사용하므로 빈 문자열 반환
    return '';
  }

  // 일반 한줄 주석: // ...
  return lines.map((line) => line.trim().replace(/^\/\/\s?/, '')).join('\n');
}

/**
 * 주석이 속한 블록의 depth 계산
 * 들여쓰기 수준으로 depth 판단 (2칸 = 1 depth)
 */
function calculateDepth(lineText: string): number {
  const leadingSpaces = lineText.match(/^(\s*)/)?.[1].length || 0;
  return Math.floor(leadingSpaces / 2);
}

/**
 * 라인이 주석인지 판별
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/');
}

/**
 * 라인이 export 선언인지 판별
 */
function _isExportLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('export ');
}

/**
 * 테스트 이름 추출 (test.describe(...), test(...), it(...))
 */
function extractTestName(line: string): string {
  // test.describe('name', ...) or describe('name', ...)
  const describeMatch = line.match(/(?:test\.)?describe\s*\(\s*['"`](.+?)['"`]/);
  if (describeMatch) return describeMatch[1];

  // test('name', ...) or it('name', ...)
  const testMatch = line.match(/(?:test|it)\s*\(\s*['"`](.+?)['"`]/);
  if (testMatch) return testMatch[1];

  // test.beforeEach(...) or test.afterEach(...)
  const hookMatch = line.match(/test\.(beforeEach|afterEach)/);
  if (hookMatch) return hookMatch[1];

  // beforeEach(...) or afterEach(...)
  const bareHookMatch = line.match(/^(beforeEach|afterEach)/);
  if (bareHookMatch) return bareHookMatch[1];

  return '';
}

/**
 * 테스트 메타데이터 추출 (page.goto, getByTestId, expect)
 */
function extractTestMetadata(code: string): {
  url?: string;
  selectors?: string[];
  expectations?: string[];
} {
  const metadata: {
    url?: string;
    selectors?: string[];
    expectations?: string[];
  } = {};

  // Extract URL from page.goto('...')
  const gotoMatch = code.match(/page\.goto\s*\(\s*['"`](.+?)['"`]/);
  if (gotoMatch) {
    metadata.url = gotoMatch[1];
  }

  // Extract selectors from getByTestId('...')
  const selectorMatches = code.matchAll(/getByTestId\s*\(\s*['"`](.+?)['"`]/g);
  const selectors = Array.from(selectorMatches).map((match) => match[1]);
  if (selectors.length > 0) {
    metadata.selectors = selectors;
  }

  // Extract expectations from expect(...).toXXX
  const expectationMatches = code.matchAll(/expect\(.+?\)\.(\w+)/g);
  const expectations = Array.from(expectationMatches).map((match) => match[1]);
  if (expectations.length > 0) {
    metadata.expectations = [...new Set(expectations)]; // Remove duplicates
  }

  return metadata;
}

/**
 * 코드 블록이 JSX를 포함하는지 판별
 */
function containsJSX(code: string): boolean {
  // JSX 태그 패턴: <div, <span, <Component 등
  // return ( 뒤에 JSX가 오는 패턴
  const jsxTagPattern = /<[A-Z][a-zA-Z0-9]*|<[a-z]+[\s>/]/;
  const returnJSXPattern = /return\s*\(/;
  return jsxTagPattern.test(code) || returnJSXPattern.test(code);
}

/**
 * 코드 블록이 제어문을 포함하는지 판별
 */
function containsControlFlow(code: string): boolean {
  // 제어문 키워드: if, switch, case, return, for, while, try, catch
  const controlKeywords = /\b(if|switch|case|return|for|while|try|catch|throw)\b/;
  return controlKeywords.test(code);
}

/**
 * 코드 블록이 테스트인지 판별하고 타입 반환
 */
function detectTestType(code: string): 'test-suite' | 'test-case' | 'test-hook' | null {
  const trimmed = code.trim();

  // test.describe(...) or describe(...)
  if (/(?:test\.)?describe\s*\(/.test(trimmed)) {
    return 'test-suite';
  }

  // test.beforeEach(...) or test.afterEach(...) or beforeEach(...) or afterEach(...)
  if (/(?:test\.)?(beforeEach|afterEach)\s*\(/.test(trimmed)) {
    return 'test-hook';
  }

  // test(...) or it(...)
  if (/(?:test|it)\s*\(/.test(trimmed)) {
    return 'test-case';
  }

  return null;
}

/**
 * 코드에서 JSX 블록 추출 (return ( ~ ) 부분)
 * @returns { jsxContent, codeWithoutJsx, jsxStartLine, jsxEndLine }
 */
function extractJSXBlock(
  code: string,
  startLine: number
): {
  jsxContent: string | null;
  codeWithoutJsx: string;
  jsxStartLine: number;
  jsxEndLine: number;
} | null {
  const lines = code.split('\n');
  const returnIndex = lines.findIndex((line) => /return\s*\(/.test(line));

  if (returnIndex === -1) {
    return null;
  }

  // return ( 이후 괄호 매칭으로 JSX 블록 끝 찾기
  let openParens = 0;
  const _jsxStartLineIdx = returnIndex;
  let jsxEndLineIdx = returnIndex;
  let started = false;

  for (let i = returnIndex; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '(') {
        openParens++;
        if (!started) started = true;
      }
      if (char === ')') openParens--;
      if (started && openParens === 0) {
        jsxEndLineIdx = i;
        break;
      }
    }
    if (started && openParens === 0) break;
  }

  if (!started || jsxEndLineIdx === returnIndex) {
    return null;
  }

  // JSX 블록 추출
  const jsxLines = lines.slice(returnIndex, jsxEndLineIdx + 1);
  const jsxContent = jsxLines.join('\n');

  // JSX 제외한 나머지 코드
  const codeWithoutJsx = [...lines.slice(0, returnIndex), ...lines.slice(jsxEndLineIdx + 1)].join('\n');

  return {
    jsxContent,
    codeWithoutJsx,
    jsxStartLine: startLine + returnIndex,
    jsxEndLine: startLine + jsxEndLineIdx,
  };
}

/**
 * Interface 선언을 각각 분리
 * 하나의 코드 섹션에 여러 interface가 있으면 각각 독립 섹션으로 분리
 */
function splitInterfaceDeclarations(sections: CodeDocSection[], sourceFile: ts.SourceFile): CodeDocSection[] {
  // 1. 모든 interface 선언 위치 추출 (export 포함)
  const interfaceDeclarations: Array<{
    node: ts.InterfaceDeclaration;
    startLine: number;
    endLine: number;
    isExport: boolean;
  }> = [];

  ts.forEachChild(sourceFile, (child) => {
    if (ts.isInterfaceDeclaration(child)) {
      const modifiers = ts.canHaveModifiers(child) ? ts.getModifiers(child) : undefined;
      const isExport = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false;

      const startLine = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
      const endLine = sourceFile.getLineAndCharacterOfPosition(child.getEnd()).line + 1;
      interfaceDeclarations.push({ node: child, startLine, endLine, isExport });
    }
  });

  // Interface 선언이 없으면 그대로 반환
  if (interfaceDeclarations.length === 0) {
    return sections;
  }

  // 2. 각 섹션 처리
  const result: CodeDocSection[] = [];

  sections.forEach((section) => {
    // Comment, export, jsx, control은 그대로 유지
    if (section.type !== 'code') {
      result.push(section);
      return;
    }

    // 이 섹션 범위 내의 interface 선언 찾기
    const interfacesInSection = interfaceDeclarations.filter(
      (iface) => iface.startLine >= section.startLine && iface.endLine <= section.endLine
    );

    // Interface가 없으면 그대로 유지
    if (interfacesInSection.length === 0) {
      result.push(section);
      return;
    }

    // Interface가 1개 이상이면 각각 분리
    // export interface는 signature로 표시되므로 코드 블록에서 제외하지 않음 (본문도 표시)
    interfacesInSection.forEach((iface) => {
      result.push({
        type: 'code',
        content: iface.node.getText(sourceFile),
        startLine: iface.startLine,
        endLine: iface.endLine,
      });
    });
  });

  return result;
}

/**
 * 소스 파일을 CodeDoc 섹션으로 파싱
 * 한 번의 AST 순회로 sections + imports 모두 추출
 */
export function parseCodeDoc(node: SourceFileNode): ParsedCodeDoc {
  const sourceText = node.codeSnippet;
  const lines = sourceText.split('\n');
  const sections: CodeDocSection[] = [];

  // Import 심볼 추출 (AST 순회)
  const imports = extractImportsFromAST(node);

  // 파일 상단 주석 추출
  const fileHeader = extractFileHeader(lines);
  if (fileHeader) {
    sections.push(fileHeader);
  }

  let currentSection: CodeDocSection | null = null;
  let currentLines: string[] = [];

  // 코드 블록 종료 헬퍼 함수
  const finalizeCodeSection = (codeContent: string, section: CodeDocSection) => {
    // 1. 테스트 감지 (최우선)
    const testType = detectTestType(codeContent);
    if (testType) {
      const testName = extractTestName(codeContent.split('\n')[0]);
      const testMetadata = extractTestMetadata(codeContent);
      sections.push({
        ...section,
        type: testType,
        testName,
        testMetadata,
      });
      return;
    }

    // 2. JSX 블록 분리
    if (containsJSX(codeContent)) {
      const jsxBlock = extractJSXBlock(codeContent, section.startLine);
      if (jsxBlock) {
        // JSX 제외한 코드 블록
        if (jsxBlock.codeWithoutJsx.trim().length > 0) {
          sections.push({
            ...section,
            content: jsxBlock.codeWithoutJsx.trimEnd(),
            type: containsControlFlow(jsxBlock.codeWithoutJsx) ? 'control' : 'code',
          });
        }
        // JSX 블록
        sections.push({
          type: 'jsx',
          content: jsxBlock.jsxContent!,
          startLine: jsxBlock.jsxStartLine,
          endLine: jsxBlock.jsxEndLine,
        });
      } else {
        // JSX 추출 실패 시 전체를 jsx로
        section.type = 'jsx';
        sections.push(section);
      }
      return;
    }

    // 3. 제어문 블록
    if (containsControlFlow(codeContent)) {
      section.type = 'control';
      sections.push(section);
      return;
    }

    // 4. 일반 코드 블록
    sections.push(section);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const isComment = isCommentLine(line);
    const isBlankLine = line.trim().length === 0;

    if (isComment) {
      // 코드 섹션이 진행 중이었다면 종료
      if (currentSection?.type === 'code' && currentLines.length > 0) {
        const codeContent = currentLines.join('\n').trimEnd();
        currentSection.content = codeContent;
        currentSection.endLine = lineNum - 1;

        finalizeCodeSection(codeContent, currentSection);

        currentLines = [];
        currentSection = null;
      }

      // 주석 섹션 시작 또는 계속
      if (!currentSection || currentSection.type !== 'comment') {
        // 새 주석 섹션 시작
        currentSection = {
          type: 'comment',
          content: '',
          startLine: lineNum,
          endLine: lineNum,
          depth: calculateDepth(line),
          commentStyle: 'line',
        };
        currentLines = [line];
      } else {
        // 기존 주석 섹션 계속
        currentLines.push(line);
        currentSection.endLine = lineNum;
      }
    } else if (isBlankLine) {
      // ✅ 빈 줄: 다음 non-blank 라인이 주석인지 체크 후 결정
      let nextNonBlankIdx = i + 1;
      while (nextNonBlankIdx < lines.length && lines[nextNonBlankIdx].trim().length === 0) {
        nextNonBlankIdx++;
      }
      const nextNonBlankLine = nextNonBlankIdx < lines.length ? lines[nextNonBlankIdx] : '';
      const nextIsComment = nextNonBlankLine.length > 0 && isCommentLine(nextNonBlankLine);

      if (currentSection?.type === 'code' && currentLines.length > 0) {
        if (nextIsComment) {
          // 다음 non-blank가 주석이면 현재 코드 블록 종료 (새 그룹 시작)
          const codeContent = currentLines.join('\n').trimEnd();
          currentSection.content = codeContent;
          currentSection.endLine = lineNum - 1;

          finalizeCodeSection(codeContent, currentSection);

          currentLines = [];
          currentSection = null;
        } else {
          // 다음 non-blank가 코드면 빈 줄 포함하고 계속 누적 (같은 그룹 유지)
          currentLines.push(line);
          currentSection.endLine = lineNum;
        }
      }

      // ✅ 주석 섹션은 빈 줄에서 종료하지 않음 (빈 줄도 포함)
      if (currentSection?.type === 'comment') {
        currentLines.push(line); // 빈 줄도 주석 내용에 포함
        currentSection.endLine = lineNum;
      }
    } else {
      // 주석 섹션이 진행 중이었다면 종료
      if (currentSection?.type === 'comment' && currentLines.length > 0) {
        const commentText = currentLines.join('\n');
        const { style, headingText } = analyzeCommentStyle(commentText);
        currentSection.commentStyle = style;
        currentSection.content = cleanCommentText(commentText, style);
        if (headingText) {
          currentSection.headingText = headingText;
        }
        sections.push(currentSection);
        currentLines = [];
        currentSection = null;
      }

      // ✅ 일반 코드: 빈 라인이 아니면 기존 코드 블록에 추가 (그룹화)
      if (!currentSection || currentSection.type !== 'code') {
        // 새 코드 섹션 시작
        currentSection = {
          type: 'code',
          content: '',
          startLine: lineNum,
          endLine: lineNum,
        };
        currentLines = [line];
      } else {
        // 기존 코드 섹션 계속 (연속된 선언문은 하나의 블록)
        currentLines.push(line);
        currentSection.endLine = lineNum;
      }
    }
  }

  // 마지막 섹션 처리
  if (currentSection && currentLines.length > 0) {
    if (currentSection.type === 'comment') {
      const commentText = currentLines.join('\n');
      const { style, headingText } = analyzeCommentStyle(commentText);
      currentSection.commentStyle = style;
      currentSection.content = cleanCommentText(commentText, style);
      if (headingText) {
        currentSection.headingText = headingText;
      }
      sections.push(currentSection);
    } else if (currentSection.type === 'code') {
      const codeContent = currentLines.join('\n').trimEnd();
      currentSection.content = codeContent;

      finalizeCodeSection(codeContent, currentSection);
    }
  }

  // Interface 선언 분리 (여러 interface가 한 섹션에 있으면 각각 분리)
  const sectionsWithSplitInterfaces = splitInterfaceDeclarations(sections, node.sourceFile);

  // 모든 섹션에 바로 앞 주석 연결 (빈 줄 없이 연속인 경우)
  sectionsWithSplitInterfaces.forEach((section) => {
    // Comment는 제외 (자기 자신과 연결 방지)
    if (section.type === 'comment') return;

    // 바로 앞 섹션 찾기
    const prevSection = sectionsWithSplitInterfaces.find(
      (s) => s.type === 'comment' && s.endLine === section.startLine - 1 // 빈 줄 없이 바로 앞
    );

    if (prevSection) {
      // 관련 주석 연결
      section.relatedComment = prevSection;
    }
  });

  // Export 시그니처 추출 (AST 기반)
  const exportSections = extractExportSignatures(node);

  // Export signature에도 바로 앞 주석 연결
  exportSections.forEach((exportSection) => {
    const prevSection = sectionsWithSplitInterfaces.find(
      (s) => s.type === 'comment' && s.endLine === exportSection.startLine - 1
    );

    if (prevSection) {
      exportSection.relatedComment = prevSection;
    }
  });

  sectionsWithSplitInterfaces.push(...exportSections);

  // 라인 번호 순으로 정렬 (같은 라인이면 코드 본문이 먼저, signature가 나중)
  sectionsWithSplitInterfaces.sort((a, b) => {
    if (a.startLine === b.startLine) {
      // 같은 라인: code/jsx/control이 먼저, export signature가 나중
      if (a.type === 'export') return 1;
      if (b.type === 'export') return -1;
    }
    return a.startLine - b.startLine;
  });

  // sections + imports 함께 반환 (한 번의 파싱 결과)
  return {
    sections: sectionsWithSplitInterfaces,
    imports,
  };
}
