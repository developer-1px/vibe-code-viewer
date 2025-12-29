/**
 * TypeScript 파서 메인 엔트리
 *
 * Babel 완전 제거, TypeScript 컴파일러 기반 파서
 * 목표: 외부 참조 중심 함수 호출 그래프
 */

import * as ts from 'typescript';
import { GraphData } from '../../entities/VariableNode';
import { resolvePath } from './utils/pathResolver';
import { extractVueScript, isVueFile } from './utils/vueExtractor';
import { createLanguageService } from './utils/languageService';

/**
 * 프로젝트 파싱 메인 함수
 */
export function parseProject(
  files: Record<string, string>,
  entryFile: string
): GraphData {
  console.log('📦 File-based parsing with identifier tracking...');
  console.log(`🎯 Entry: ${entryFile}`);

  const nodes: any[] = [];
  const processedFiles = new Set<string>();

  // ✅ Language Service 생성 (identifier 정의 위치 파악용)
  const languageService = createLanguageService(files);
  const program = languageService.getProgram();

  if (!program) {
    console.error('❌ Language Service program not available');
    return { nodes: [] };
  }

  // ✅ 간단한 파일 처리: 각 파일 = 1개 노드
  function processFile(filePath: string): void {
    if (processedFiles.has(filePath)) return;

    const content = files[filePath];
    if (!content) return;

    // .d.ts 제외
    if (filePath.endsWith('.d.ts')) return;

    processedFiles.add(filePath);

    // ✅ 파일을 하나의 노드로 생성
    const fileName = filePath.split('/').pop() || filePath;
    const fileNameWithoutExt = fileName.replace(/\.(tsx?|jsx?|vue)$/, '');

    const node: any = {
      id: filePath,
      label: fileNameWithoutExt,
      filePath,
      type: 'template',
      codeSnippet: content,
      startLine: 1,
      dependencies: [],
      // ✅ 새로운 필드: identifier별 정의 파일 맵
      identifierSources: new Map<string, string>() // identifier name -> source file path
    };

    nodes.push(node);

    // ✅ TypeScript로 import 및 identifier 추출
    try {
      const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX :
                        filePath.endsWith('.jsx') ? ts.ScriptKind.JSX :
                        filePath.endsWith('.vue') ? ts.ScriptKind.TS :
                        ts.ScriptKind.TS;

      let parseContent = content;

      // Vue 파일이면 script 부분만 추출
      if (isVueFile(filePath)) {
        parseContent = extractVueScript(content, filePath) || '';
      }

      const sourceFile = ts.createSourceFile(
        filePath,
        parseContent,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );

      // Import 추출 및 재귀 처리
      sourceFile.statements.forEach((statement) => {
        if (ts.isImportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          const source = statement.moduleSpecifier.text;
          const resolvedPath = resolvePath(filePath, source, files);
          const clause = statement.importClause;

          // Type-only import는 스킵
          if (statement.importClause?.isTypeOnly) {
            return;
          }

          if (resolvedPath) {
            // Local file import
            // Dependency 추가
            if (!node.dependencies.includes(resolvedPath)) {
              node.dependencies.push(resolvedPath);
            }

            // Import된 identifier 추출 (local file)
            if (clause) {
              // Default import
              if (clause.name) {
                node.identifierSources.set(clause.name.text, resolvedPath);
              }
              // Named imports
              if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
                clause.namedBindings.elements.forEach(element => {
                  node.identifierSources.set(element.name.text, resolvedPath);
                });
              }
              // Namespace import
              if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
                node.identifierSources.set(clause.namedBindings.name.text, resolvedPath);
              }
            }

            // 재귀 처리
            processFile(resolvedPath);
          } else {
            // npm module import (resolvedPath가 없음)
            // npm module의 경우 source를 "npm:" prefix로 저장
            if (clause) {
              const npmModuleName = `npm:${source}`;

              // Default import
              if (clause.name) {
                node.identifierSources.set(clause.name.text, npmModuleName);
              }
              // Named imports
              if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
                clause.namedBindings.elements.forEach(element => {
                  node.identifierSources.set(element.name.text, npmModuleName);
                });
              }
              // Namespace import
              if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
                node.identifierSources.set(clause.namedBindings.name.text, npmModuleName);
              }
            }
          }
        }
      });

      // ✅ import된 identifier만 추적 (충분함)

    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error);
    }
  }

  // Entry file부터 시작
  processFile(entryFile);

  // ✅ identifierSources Map을 일반 객체로 변환 (JSON 직렬화 가능)
  nodes.forEach(node => {
    if (node.identifierSources) {
      node.identifierSources = Object.fromEntries(node.identifierSources);
    }
  });

  console.log(`✅ Created ${nodes.length} file nodes with identifier tracking`);
  return { nodes };
}

// Re-export utilities
export { resolvePath } from './utils/pathResolver';
export { extractVueScript, extractVueTemplate, isVueFile } from './utils/vueExtractor';
export { createLanguageService } from './utils/languageService';
