/**
 * CodeDoc Parser
 * 소스 파일을 주석과 코드 섹션으로 파싱
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../../SourceFileNode/model/types';
import type { CodeDocSection, CommentStyle } from '../model/types';

/**
 * TypeScript 함수 시그니처를 간결한 형식으로 변환
 * export function extractOutlineStructure(node: SourceFileNode): OutlineNode[]
 * → extractOutlineStructure(node: SourceFileNode) → OutlineNode[]
 */
function formatFunctionSignature(node: ts.FunctionDeclaration | ts.VariableStatement, sourceFile: ts.SourceFile): string {
  // Function Declaration
  if (ts.isFunctionDeclaration(node)) {
    const name = node.name?.getText(sourceFile) || 'anonymous';
    const params = node.parameters.map(p => p.getText(sourceFile)).join(', ');
    const returnType = node.type ? node.type.getText(sourceFile) : 'void';
    return `${name}(${params}) → ${returnType}`;
  }

  // Arrow Function (const foo = () => {})
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const name = declaration.name.getText(sourceFile);

      if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
        const func = declaration.initializer as ts.ArrowFunction | ts.FunctionExpression;
        const params = func.parameters.map(p => p.getText(sourceFile)).join(', ');
        const returnType = func.type ? func.type.getText(sourceFile) : 'unknown';
        return `${name}(${params}) → ${returnType}`;
      }

      // Constant/Variable
      const type = declaration.type ? declaration.type.getText(sourceFile) : 'unknown';
      return `${name}: ${type}`;
    }
  }

  return node.getText(sourceFile);
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
      headingText: separatorMatch[1].trim()
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
      .map(line => {
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
      .map(line => line.trim().replace(/^\/\/\/\s?/, ''))
      .join('\n')
      .trim();
  }

  if (style === 'block') {
    // /* ... */ 형식 정제
    return lines
      .map(line => {
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
  return lines
    .map(line => line.trim().replace(/^\/\/\s?/, ''))
    .join('\n');
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
function isExportLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('export ');
}

/**
 * 코드 블록이 JSX를 포함하는지 판별
 */
function containsJSX(code: string): boolean {
  // JSX 태그 패턴: <div, <span, <Component 등
  // return ( 뒤에 JSX가 오는 패턴
  const jsxTagPattern = /<[A-Z][a-zA-Z0-9]*|<[a-z]+[\s>\/]/;
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
 * AST에서 export 선언 추출
 */
function extractExportSignatures(node: SourceFileNode): CodeDocSection[] {
  const exportSections: CodeDocSection[] = [];
  const sourceFile = node.sourceFile;

  ts.forEachChild(sourceFile, (child) => {
    // Export로 시작하는 선언문만 처리
    const modifiers = ts.canHaveModifiers(child) ? ts.getModifiers(child) : undefined;
    const hasExportModifier = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    if (!hasExportModifier) return;

    // 함수 또는 변수 선언
    if (ts.isFunctionDeclaration(child) || ts.isVariableStatement(child)) {
      const signature = formatFunctionSignature(child, sourceFile);
      const startLine = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
      const endLine = sourceFile.getLineAndCharacterOfPosition(child.getEnd()).line + 1;

      exportSections.push({
        type: 'export',
        content: signature,
        startLine,
        endLine
      });
    }
  });

  return exportSections;
}

/**
 * 코드에서 JSX 블록 추출 (return ( ~ ) 부분)
 * @returns { jsxContent, codeWithoutJsx, jsxStartLine, jsxEndLine }
 */
function extractJSXBlock(code: string, startLine: number): {
  jsxContent: string | null;
  codeWithoutJsx: string;
  jsxStartLine: number;
  jsxEndLine: number;
} | null {
  const lines = code.split('\n');
  const returnIndex = lines.findIndex(line => /return\s*\(/.test(line));

  if (returnIndex === -1) {
    return null;
  }

  // return ( 이후 괄호 매칭으로 JSX 블록 끝 찾기
  let openParens = 0;
  let jsxStartLineIdx = returnIndex;
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
  const codeWithoutJsx = [
    ...lines.slice(0, returnIndex),
    ...lines.slice(jsxEndLineIdx + 1)
  ].join('\n');

  return {
    jsxContent,
    codeWithoutJsx,
    jsxStartLine: startLine + returnIndex,
    jsxEndLine: startLine + jsxEndLineIdx
  };
}

/**
 * 소스 파일을 CodeDoc 섹션으로 파싱
 */
export function parseCodeDoc(node: SourceFileNode): CodeDocSection[] {
  const sourceText = node.codeSnippet;
  const lines = sourceText.split('\n');
  const sections: CodeDocSection[] = [];

  let currentSection: CodeDocSection | null = null;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const isComment = isCommentLine(line);

    if (isComment) {
      // 코드 섹션이 진행 중이었다면 종료
      if (currentSection?.type === 'code' && currentLines.length > 0) {
        const codeContent = currentLines.join('\n').trimEnd();
        currentSection.content = codeContent;
        currentSection.endLine = lineNum - 1;

        // JSX 블록 분리
        if (containsJSX(codeContent)) {
          const jsxBlock = extractJSXBlock(codeContent, currentSection.startLine);
          if (jsxBlock) {
            // JSX 제외한 코드 블록
            if (jsxBlock.codeWithoutJsx.trim().length > 0) {
              sections.push({
                ...currentSection,
                content: jsxBlock.codeWithoutJsx.trimEnd(),
                type: containsControlFlow(jsxBlock.codeWithoutJsx) ? 'control' : 'code'
              });
            }
            // JSX 블록
            sections.push({
              type: 'jsx',
              content: jsxBlock.jsxContent!,
              startLine: jsxBlock.jsxStartLine,
              endLine: jsxBlock.jsxEndLine
            });
          } else {
            // JSX 추출 실패 시 전체를 jsx로
            currentSection.type = 'jsx';
            sections.push(currentSection);
          }
        } else if (containsControlFlow(codeContent)) {
          // 제어문 블록
          currentSection.type = 'control';
          sections.push(currentSection);
        } else {
          // 일반 코드 블록
          sections.push(currentSection);
        }

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
          commentStyle: 'line'
        };
        currentLines = [line];
      } else {
        // 기존 주석 섹션 계속
        currentLines.push(line);
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

      // 일반 코드 섹션 처리
      if (!currentSection || currentSection.type !== 'code') {
        // 빈 라인이 아닌 경우에만 새 코드 섹션 시작
        if (line.trim().length > 0) {
          currentSection = {
            type: 'code',
            content: '',
            startLine: lineNum,
            endLine: lineNum
          };
          currentLines = [line];
        }
      } else {
        // 기존 코드 섹션이 진행 중이면 빈 라인도 포함
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

      // JSX 블록 분리
      if (containsJSX(codeContent)) {
        const jsxBlock = extractJSXBlock(codeContent, currentSection.startLine);
        if (jsxBlock) {
          // JSX 제외한 코드 블록
          if (jsxBlock.codeWithoutJsx.trim().length > 0) {
            sections.push({
              ...currentSection,
              content: jsxBlock.codeWithoutJsx.trimEnd(),
              type: containsControlFlow(jsxBlock.codeWithoutJsx) ? 'control' : 'code'
            });
          }
          // JSX 블록
          sections.push({
            type: 'jsx',
            content: jsxBlock.jsxContent!,
            startLine: jsxBlock.jsxStartLine,
            endLine: jsxBlock.jsxEndLine
          });
        } else {
          // JSX 추출 실패 시 전체를 jsx로
          currentSection.type = 'jsx';
          sections.push(currentSection);
        }
      } else if (containsControlFlow(codeContent)) {
        // 제어문 블록
        currentSection.type = 'control';
        sections.push(currentSection);
      } else {
        // 일반 코드 블록
        sections.push(currentSection);
      }
    }
  }

  // Export 시그니처 추출 (AST 기반)
  const exportSections = extractExportSignatures(node);
  sections.push(...exportSections);

  // 라인 번호 순으로 정렬 (같은 라인이면 export가 먼저)
  sections.sort((a, b) => {
    if (a.startLine === b.startLine) {
      if (a.type === 'export') return -1;
      if (b.type === 'export') return 1;
    }
    return a.startLine - b.startLine;
  });

  return sections;
}
