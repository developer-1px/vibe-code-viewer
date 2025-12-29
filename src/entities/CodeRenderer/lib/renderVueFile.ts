/**
 * Vue SFC 파일 렌더링
 * <script>, <template>, <style> 섹션을 각각 다르게 처리
 */

import * as ts from 'typescript';
import type { CanvasNode } from '../../CanvasNode';
import type { CodeLine } from '../model/types';
import { parse } from '@vue/compiler-sfc';
import { renderCodeLines } from './renderCodeLines';

/**
 * Vue 파일의 섹션 정보
 */
interface VueSection {
  type: 'script' | 'template' | 'style';
  content: string;
  startLine: number;
  endLine: number;
  lang?: string;
}

/**
 * Vue SFC를 파싱하여 섹션별로 분리
 * loc.start.line과 loc.end.line을 사용하여 정확한 라인 번호 추출
 */
function parseVueSections(vueContent: string, filePath: string): VueSection[] {
  const sections: VueSection[] = [];

  try {
    const { descriptor } = parse(vueContent, { filename: filePath });

    // Template 섹션 (파일 순서대로 정렬하기 위해 먼저 처리)
    if (descriptor.template) {
      const template = descriptor.template;

      sections.push({
        type: 'template',
        content: template.content,
        startLine: template.loc.start.line, // content 시작 라인
        endLine: template.loc.end.line,     // content 끝 라인
        lang: template.lang || 'html'
      });
    }

    // Script 섹션 (script setup 또는 script)
    const script = descriptor.scriptSetup || descriptor.script;
    if (script) {
      sections.push({
        type: 'script',
        content: script.content,
        startLine: script.loc.start.line,
        endLine: script.loc.end.line,
        lang: script.lang || 'js'
      });
    }

    // Style 섹션 (여러 개 가능)
    descriptor.styles.forEach(style => {
      sections.push({
        type: 'style',
        content: style.content,
        startLine: style.loc.start.line,
        endLine: style.loc.end.line,
        lang: style.lang || 'css'
      });
    });

    // 파일 순서대로 정렬
    sections.sort((a, b) => a.startLine - b.startLine);

  } catch (error) {
    console.error(`❌ Error parsing Vue file ${filePath}:`, error);
  }

  return sections;
}

/**
 * Script 섹션 렌더링 (TypeScript AST 사용)
 */
function renderScriptSection(
  section: VueSection,
  node: CanvasNode,
  files: Record<string, string>
): CodeLine[] {
  // Script 내용으로 임시 SourceFile 생성
  const scriptSource = ts.createSourceFile(
    node.filePath + '.ts',
    section.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  // CanvasNode를 Script 내용으로 임시 수정하여 renderCodeLines 호출
  const tempNode: CanvasNode = {
    ...node,
    codeSnippet: section.content,
    startLine: section.startLine,
    sourceFile: scriptSource
  };

  return renderCodeLines(tempNode, files);
}

/**
 * Template 섹션 렌더링 (plain text로 출력)
 */
function renderTemplateSection(section: VueSection): CodeLine[] {
  const lines = section.content.split('\n');

  return lines.map((lineText, idx) => ({
    num: section.startLine + idx,
    segments: [{
      text: lineText,
      kinds: ['text']
    }],
    hasInput: false
  }));
}

/**
 * Style 섹션 렌더링 (plain text로 출력)
 */
function renderStyleSection(section: VueSection): CodeLine[] {
  const lines = section.content.split('\n');

  return lines.map((lineText, idx) => ({
    num: section.startLine + idx,
    segments: [{
      text: lineText,
      kinds: ['text']
    }],
    hasInput: false
  }));
}

/**
 * 섹션 태그 라인 렌더링 (예: <script setup lang="ts">, </script>)
 */
function renderSectionTags(vueContent: string, section: VueSection): CodeLine[] {
  const lines = vueContent.split('\n');
  const result: CodeLine[] = [];

  // Opening tag line
  const openingLine = lines[section.startLine - 2]; // -2 because startLine is 1-indexed and points to content
  if (openingLine) {
    result.push({
      num: section.startLine - 1,
      segments: [{
        text: openingLine,
        kinds: ['text']
      }],
      hasInput: false
    });
  }

  return result;
}

/**
 * Vue 파일 전체 렌더링
 * 간단한 방식: 전체를 plain text로 렌더링하되, script 부분만 TypeScript로 재렌더링
 */
export function renderVueFile(node: CanvasNode, files: Record<string, string>): CodeLine[] {
  const vueContent = node.codeSnippet;
  const filePath = node.filePath;
  const vueLines = vueContent.split('\n');

  // 먼저 전체를 plain text로 렌더링
  const allLines: CodeLine[] = vueLines.map((lineText, idx) => ({
    num: idx + 1,
    segments: [{ text: lineText, kinds: ['text'] }],
    hasInput: false
  }));

  // Vue 섹션 파싱
  const sections = parseVueSections(vueContent, filePath);

  // Script 섹션만 찾아서 TypeScript로 재렌더링
  const scriptSection = sections.find(s => s.type === 'script');

  if (scriptSection) {
    const scriptLines = renderScriptSection(scriptSection, node, files);

    // Script 섹션의 라인들만 교체
    scriptLines.forEach(line => {
      const lineIdx = line.num - 1;
      if (lineIdx >= 0 && lineIdx < allLines.length) {
        allLines[lineIdx] = line;
      }
    });
  }

  return allLines;
}
