/**
 * TypeScript 파서 메인 엔트리
 *
 * Babel 완전 제거, TypeScript 컴파일러 기반 파서
 * 목표: 외부 참조 중심 함수 호출 그래프
 */

import * as ts from 'typescript';
import { getDependencies } from '../../entities/SourceFileNode/lib/getters';
import type { GraphData, SourceFileNode } from '../../entities/SourceFileNode/model/types';
import { createLanguageService } from './utils/languageService';
import { resolvePath } from './utils/pathResolver';
import { extractVueScript, isVueFile } from './utils/vueExtractor';

/**
 * Extract function and variable declarations from a source file
 *
 * ✅ 개선: snippet 재파싱 제거
 * - 전체 파일 sourceFile 공유
 * - codeSnippet은 display용으로만 사용
 */
function extractDeclarations(
  sourceFile: ts.SourceFile,
  filePath: string,
  nodes: SourceFileNode[],
  content: string
): void {
  function visit(node: ts.Node): void {
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const snippet = content.substring(start, end);
      const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);

      // ✅ snippet 재파싱 제거 - 전체 sourceFile 공유
      nodes.push({
        id: `${filePath}::${name}`,
        label: name,
        filePath,
        type: 'function',
        codeSnippet: snippet, // display용
        startLine: lineAndChar.line + 1,
        sourceFile, // ← 전체 파일 sourceFile 공유
        dependencies: [],
      });
    }

    // Variable declarations (const, let, var)
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const start = node.getStart(sourceFile);
          const end = node.getEnd();
          const snippet = content.substring(start, end);
          const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);

          // Determine type based on initializer
          let type = 'variable';
          if (decl.initializer) {
            if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
              type = 'function';
            }
          }

          // ✅ snippet 재파싱 제거 - 전체 sourceFile 공유
          nodes.push({
            id: `${filePath}::${name}`,
            label: name,
            filePath,
            type,
            codeSnippet: snippet, // display용
            startLine: lineAndChar.line + 1,
            sourceFile, // ← 전체 파일 sourceFile 공유
            dependencies: [],
          });
        }
      });
    }

    // Arrow functions assigned to variables are handled above
    // Class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const name = node.name.text;
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const snippet = content.substring(start, end);
      const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);

      // ✅ snippet 재파싱 제거 - 전체 sourceFile 공유
      nodes.push({
        id: `${filePath}::${name}`,
        label: name,
        filePath,
        type: 'function', // Treat classes as functions for now
        codeSnippet: snippet, // display용
        startLine: lineAndChar.line + 1,
        sourceFile, // ← 전체 파일 sourceFile 공유
        dependencies: [],
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

/**
 * 프로젝트 파싱 메인 함수 - 모든 파일을 단순히 파싱
 */
export function parseProject(
  files: Record<string, string>,
  _entryFile?: string // Deprecated, kept for backwards compatibility
): GraphData {
  const nodes: SourceFileNode[] = [];

  // ✅ Language Service 생성 (identifier 정의 위치 파악용)
  const languageService = createLanguageService(files);
  const program = languageService.getProgram();

  if (!program) {
    console.error('❌ Language Service program not available');
    return { nodes: [] };
  }

  // ✅ 모든 파일을 단순히 순회하며 파싱
  Object.keys(files).forEach((filePath) => {
    const content = files[filePath];
    if (!content) return;

    // .d.ts 제외
    if (filePath.endsWith('.d.ts')) return;

    // ✅ 파일을 하나의 노드로 생성
    const fileName = filePath.split('/').pop() || filePath;
    const fileNameWithoutExt = fileName.replace(/\.(tsx?|jsx?|vue)$/, '');

    try {
      const scriptKind = filePath.endsWith('.tsx')
        ? ts.ScriptKind.TSX
        : filePath.endsWith('.jsx')
          ? ts.ScriptKind.JSX
          : filePath.endsWith('.vue')
            ? ts.ScriptKind.TS
            : ts.ScriptKind.TS;

      let parseContent = content;

      // Vue 파일이면 script 부분만 추출
      if (isVueFile(filePath)) {
        parseContent = extractVueScript(content, filePath) || '';
      }

      const sourceFile = ts.createSourceFile(filePath, parseContent, ts.ScriptTarget.Latest, true, scriptKind);

      // SourceFileNode 생성 (sourceFile 포함)
      const dependencies = getDependencies({ sourceFile, filePath, id: filePath } as any, files, resolvePath);

      const node: SourceFileNode = {
        id: filePath,
        label: fileNameWithoutExt,
        filePath,
        type: 'file',
        codeSnippet: content,
        startLine: 1,
        sourceFile,
        dependencies,
      };

      nodes.push(node);

      // ✅ Extract functions and variables from this file
      extractDeclarations(sourceFile, filePath, nodes, parseContent);
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error);
    }
  });

  console.log(`[parseProject] Parsed ${nodes.length} nodes from ${Object.keys(files).length} files`);
  return { nodes };
}
