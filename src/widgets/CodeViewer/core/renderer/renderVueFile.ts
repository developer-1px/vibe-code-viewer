/**
 * Vue SFC 파일 렌더링
 * @vue/compiler-sfc의 AST를 직접 사용
 */

import * as ts from 'typescript';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import type { CodeLine, CodeSegment } from '../types/codeLine';
import { parse, compileTemplate } from '@vue/compiler-sfc';
import { renderCodeLinesDirect } from './renderCodeLinesDirect';

/**
 * AST 노드 순회하여 토큰 추출
 */
interface Token {
  start: number;
  end: number;
  text: string;
  kind: string;
}

function extractTokensFromAST(node: any, source: string, tokens: Token[] = []): Token[] {
  if (!node || !node.loc) return tokens;

  // Node type에 따라 토큰 추출
  switch (node.type) {
    case 1: // ELEMENT
      // 태그 이름 추출 (opening tag)
      if (node.tag) {
        const isPascalCase = /^[A-Z]/.test(node.tag);

        // Opening tag의 '<' 다음에 태그 이름이 있음
        const tagPattern = `<${node.tag}`;
        const tagIdx = source.indexOf(tagPattern, node.loc.start.offset);

        if (tagIdx !== -1) {
          const tagStart = tagIdx + 1; // '<' 다음부터
          tokens.push({
            start: tagStart,
            end: tagStart + node.tag.length,
            text: node.tag,
            kind: isPascalCase ? 'component' : 'element'
          });
        }

        // Closing tag도 추출 (self-closing이 아니면)
        if (!node.isSelfClosing) {
          const closingPattern = `</${node.tag}>`;
          const closingIdx = source.indexOf(closingPattern, node.loc.start.offset);

          if (closingIdx !== -1) {
            const closingTagStart = closingIdx + 2; // '</' 다음부터
            tokens.push({
              start: closingTagStart,
              end: closingTagStart + node.tag.length,
              text: node.tag,
              kind: isPascalCase ? 'component' : 'element'
            });
          }
        }
      }

      // Props (attributes)
      if (node.props) {
        node.props.forEach((prop: any) => {
          if (prop.type === 6) { // ATTRIBUTE
            // Attribute name
            if (prop.name) {
              const attrNameStart = prop.loc.start.offset;
              tokens.push({
                start: attrNameStart,
                end: attrNameStart + prop.name.length,
                text: prop.name,
                kind: 'attribute'
              });
            }

            // Attribute value (content만, 따옴표 제외)
            if (prop.value && prop.value.content) {
              const valueContent = prop.value.content;
              // value.loc.start.offset은 따옴표 시작 위치, +1 하면 내용 시작
              const valueStart = prop.value.loc.start.offset + 1;

              tokens.push({
                start: valueStart,
                end: valueStart + valueContent.length,
                text: valueContent,
                kind: 'string'
              });
            }
          }
        });
      }

      // Children
      if (node.children) {
        node.children.forEach((child: any) => extractTokensFromAST(child, source, tokens));
      }
      break;

    case 5: // INTERPOLATION {{ }}
      if (node.content && node.content.loc) {
        // {{ }} 내부의 expression (SIMPLE_EXPRESSION)
        const exprText = node.content.loc.source.trim();
        const exprOffset = node.content.loc.start.offset;

        tokens.push({
          start: exprOffset,
          end: exprOffset + exprText.length,
          text: exprText,
          kind: 'interpolation'
        });
      }
      break;

    case 0: // ROOT
      if (node.children) {
        node.children.forEach((child: any) => extractTokensFromAST(child, source, tokens));
      }
      break;
  }

  return tokens;
}

/**
 * 토큰을 라인별 segments로 변환
 */
function tokensToLines(templateContent: string, tokens: Token[], startLine: number): CodeLine[] {
  const lines = templateContent.split('\n');
  const result: CodeLine[] = [];

  let lineOffset = 0; // 현재까지의 누적 offset

  lines.forEach((lineText, lineIdx) => {
    const lineNum = startLine + lineIdx;
    const lineStart = lineOffset;
    const lineEnd = lineOffset + lineText.length;

    // 첫 번째와 마지막 빈 라인은 스킵 (Vue SFC descriptor가 앞뒤 빈 줄을 포함하므로)
    const isFirstEmptyLine = lineIdx === 0 && lineText === '';
    const isLastEmptyLine = lineIdx === lines.length - 1 && lineText === '';

    if (isFirstEmptyLine || isLastEmptyLine) {
      lineOffset += lineText.length + 1;
      return; // skip
    }

    // 이 라인에 해당하는 토큰들 찾기
    const lineTokens = tokens.filter(t => t.start >= lineStart && t.start < lineEnd);

    if (lineTokens.length === 0) {
      // 토큰이 없으면 plain text
      result.push({
        num: lineNum,
        segments: [{ text: lineText, kinds: ['text'] }],
        hasInput: false
      });
    } else {
      // 토큰이 있으면 segment로 분할
      const segments: CodeSegment[] = [];
      let pos = lineStart;

      // 라인 내 토큰들을 offset 순서로 정렬
      lineTokens.sort((a, b) => a.start - b.start);

      lineTokens.forEach(token => {
        // 토큰 이전의 텍스트 (plain text)
        if (token.start > pos) {
          const beforeText = templateContent.substring(pos, token.start);
          segments.push({ text: beforeText, kinds: ['text'] });
        }

        // 토큰 자체
        const tokenText = templateContent.substring(token.start, token.end);
        const kinds = getKindsFromTokenType(token.kind);
        segments.push({ text: tokenText, kinds });

        pos = token.end;
      });

      // 마지막 토큰 이후의 텍스트
      if (pos < lineEnd) {
        const afterText = templateContent.substring(pos, lineEnd);
        segments.push({ text: afterText, kinds: ['text'] });
      }

      result.push({
        num: lineNum,
        segments,
        hasInput: false
      });
    }

    // 다음 라인을 위해 offset 업데이트 (+1은 \n)
    lineOffset += lineText.length + 1;
  });

  return result;
}

/**
 * 토큰 타입을 SegmentKind로 변환
 */
function getKindsFromTokenType(tokenKind: string): CodeSegment['kinds'] {
  switch (tokenKind) {
    case 'string':
      return ['string'];
    case 'component':
      return ['identifier'];
    case 'external-component':
      return ['identifier', 'external-import']; // Import된 컴포넌트
    case 'element':
      return ['keyword'];
    case 'attribute':
      return ['identifier'];
    case 'interpolation':
      return ['identifier'];
    default:
      return ['text'];
  }
}

/**
 * Template AST로 렌더링
 */
function renderTemplateWithAST(
  templateContent: string,
  startLine: number,
  importedComponents: Set<string>
): CodeLine[] {
  try {
    const { ast } = compileTemplate({
      source: templateContent,
      filename: 'template.vue',
      id: 'template'
    });

    console.log('🎨 Template AST:', ast);

    // AST에서 토큰 추출
    const tokens = extractTokensFromAST(ast, templateContent);
    console.log('🎨 Extracted tokens:', tokens);

    // 컴포넌트 토큰에 external-import 마킹
    tokens.forEach(token => {
      if (token.kind === 'component' && importedComponents.has(token.text)) {
        token.kind = 'external-component';
      }
    });

    // 토큰을 라인별 segments로 변환
    return tokensToLines(templateContent, tokens, startLine);

  } catch (error) {
    console.error('❌ Template AST error:', error);
    const lines = templateContent.split('\n');
    return lines.map((text, idx) => ({
      num: startLine + idx,
      segments: [{ text, kinds: ['text'] }] as CodeSegment[],
      hasInput: false
    }));
  }
}

/**
 * 원본 소스에서 태그가 있는 라인 번호 찾기
 */
function findTagLine(source: string, tagPattern: string, startFromLine: number = 1): number {
  const lines = source.split('\n');
  const startIndex = Math.max(0, startFromLine - 1); // Ensure non-negative
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i] && lines[i].includes(tagPattern)) { // Add existence check
      return i + 1; // 1-based line number
    }
  }
  return startFromLine;
}

/**
 * Script에서 import된 컴포넌트 추출
 */
function extractImportedComponents(scriptContent: string): Set<string> {
  const importedComponents = new Set<string>();

  // TypeScript AST로 import 문 파싱
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    scriptContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      // Default import (import Foo from './Foo.vue')
      if (node.importClause.name) {
        const componentName = node.importClause.name.text;
        if (/^[A-Z]/.test(componentName)) { // PascalCase = Component
          importedComponents.add(componentName);
        }
      }

      // Named imports (import { Bar } from './Bar.vue')
      if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          const componentName = element.name.text;
          if (/^[A-Z]/.test(componentName)) {
            importedComponents.add(componentName);
          }
        });
      }
    }
  });

  return importedComponents;
}

/**
 * Vue SFC 전체 렌더링
 * - Script: TypeScript AST로 렌더링
 * - Template: Vue template AST로 렌더링
 */
export function renderVueFile(node: CanvasNode, files: Record<string, string>): CodeLine[] {
  const vueContent = node.codeSnippet;
  const filePath = node.filePath;
  const sourceLines = vueContent.split('\n');

  try {
    const { descriptor } = parse(vueContent, { filename: filePath });

    const allLines: CodeLine[] = [];

    // Script에서 import된 컴포넌트 추출
    const script = descriptor.scriptSetup || descriptor.script;
    const importedComponents = script ? extractImportedComponents(script.content) : new Set<string>();
    console.log('🎨 Imported components:', Array.from(importedComponents));

    // 원본 파일 순서대로 섹션 렌더링하기 위한 준비
    interface Section {
      type: 'template' | 'script' | 'style';
      startLine: number;
      render: () => void;
    }

    const sections: Section[] = [];

    // Template 섹션 준비
    const renderTemplate = () => {
      if (!descriptor.template) return;

      const templateOpenLine = findTagLine(vueContent, '<template>');
      allLines.push({
        num: templateOpenLine,
        segments: [{ text: sourceLines[templateOpenLine - 1], kinds: ['text'] }],
        hasInput: false
      });

      const templateLines = renderTemplateWithAST(
        descriptor.template.content,
        descriptor.template.loc.start.line,
        importedComponents
      );
      allLines.push(...templateLines);

      const templateCloseLine = findTagLine(vueContent, '</template>', descriptor.template.loc.end.line);
      allLines.push({
        num: templateCloseLine,
        segments: [{ text: sourceLines[templateCloseLine - 1], kinds: ['text'] }],
        hasInput: false
      });
    };

    // Script 섹션 준비
    const renderScript = () => {
      if (!script) return;

      const scriptOpenLine = findTagLine(vueContent, '<script', script.loc.start.line - 5);

      allLines.push({
        num: scriptOpenLine,
        segments: [{ text: sourceLines[scriptOpenLine - 1], kinds: ['text'] }],
        hasInput: false
      });

      // script.content도 앞뒤 빈 줄을 포함할 수 있으므로 trim
      const scriptContent = script.content.replace(/^\n/, '').replace(/\n$/, '');

      const scriptSource = ts.createSourceFile(
        filePath + '.ts',
        scriptContent,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );

      const tempNode: CanvasNode = {
        ...node,
        codeSnippet: scriptContent,
        startLine: script.loc.start.line,
        sourceFile: scriptSource
      };

      const scriptLines = renderCodeLinesDirect(tempNode, files);
      allLines.push(...scriptLines);

      const scriptCloseLine = findTagLine(vueContent, '</script>', script.loc.end.line);
      allLines.push({
        num: scriptCloseLine,
        segments: [{ text: sourceLines[scriptCloseLine - 1], kinds: ['text'] }],
        hasInput: false
      });
    };

    // 섹션 목록 생성 (원본 파일 순서대로)
    if (descriptor.template) {
      sections.push({
        type: 'template',
        startLine: descriptor.template.loc.start.line,
        render: renderTemplate
      });
    }

    if (script) {
      sections.push({
        type: 'script',
        startLine: script.loc.start.line,
        render: renderScript
      });
    }

    // 시작 라인 기준으로 정렬
    sections.sort((a, b) => a.startLine - b.startLine);

    // 원본 순서대로 렌더링
    for (let i = 0; i < sections.length; i++) {
      sections[i].render();

      // 섹션 사이의 빈 라인 추가
      if (i < sections.length - 1) {
        const currentSectionEnd = sections[i].type === 'template'
          ? descriptor.template!.loc.end.line
          : script!.loc.end.line;
        const nextSectionStart = sections[i + 1].startLine;

        // 사이에 있는 빈 라인들 추가
        for (let lineNum = currentSectionEnd + 1; lineNum < nextSectionStart; lineNum++) {
          if (sourceLines[lineNum - 1] !== undefined) {
            allLines.push({
              num: lineNum,
              segments: [{ text: sourceLines[lineNum - 1], kinds: ['text'] }],
              hasInput: false
            });
          }
        }
      }
    }

    return allLines;

  } catch (error) {
    console.error('❌ Error rendering Vue file:', error);
    return [];
  }
}
