/**
 * Type Extractor Service
 *
 * 모든 파일에서 interface와 type 정의를 추출하여 엔티티 관계도를 생성
 */

import * as ts from 'typescript';
import type { TypeEntity, TypeGraphData } from '../../entities/TypeEntity/model/types';
import {
  getTypeDependencies,
  getExtendsFrom,
  getTypeCodeSnippet,
  getTypeStartLine
} from '../../entities/TypeEntity/lib/getters';
import { extractVueScript, isVueFile } from '../tsParser/utils/vueExtractor';

/**
 * 프로젝트에서 모든 타입 정의를 추출
 */
export function extractTypes(
  files: Record<string, string>,
  entryFile: string
): TypeGraphData {
  console.log('🏛️ Extracting types from project...');
  console.log(`🎯 Entry: ${entryFile}`);

  const types: TypeEntity[] = [];
  const processedFiles = new Set<string>();

  // 모든 파일을 순회하며 타입 추출
  function processFile(filePath: string): void {
    if (processedFiles.has(filePath)) return;

    const content = files[filePath];
    if (!content) return;

    // .d.ts 파일은 포함 (타입 정의 파일이므로)
    processedFiles.add(filePath);

    try {
      const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX :
                        filePath.endsWith('.jsx') ? ts.ScriptKind.JSX :
                        filePath.endsWith('.vue') ? ts.ScriptKind.TS :
                        ts.ScriptKind.TS;

      let parseContent = content;

      // Vue 파일이면 script 부분만 추출
      if (isVueFile(filePath)) {
        parseContent = extractVueScript(content, filePath) || '';
        if (!parseContent) return; // script가 없으면 스킵
      }

      const sourceFile = ts.createSourceFile(
        filePath,
        parseContent,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );

      // TypeScript AST 순회하며 interface/type 선언 찾기
      sourceFile.statements.forEach((statement) => {
        // Interface 선언
        if (ts.isInterfaceDeclaration(statement) && statement.name) {
          const typeName = statement.name.text;
          const id = `${filePath}::${typeName}`;
          const codeSnippet = getTypeCodeSnippet(statement, sourceFile);
          const startLine = getTypeStartLine(statement, sourceFile);

          const typeEntity: TypeEntity = {
            id,
            label: typeName,
            filePath,
            typeKind: 'interface',
            codeSnippet,
            startLine,
            sourceFile,
            declaration: statement,
          };

          // Dependencies 계산 및 캐싱
          typeEntity.dependencies = getTypeDependencies(typeEntity);
          typeEntity.extendsFrom = getExtendsFrom(typeEntity);

          types.push(typeEntity);
        }

        // Type alias 선언
        if (ts.isTypeAliasDeclaration(statement) && statement.name) {
          const typeName = statement.name.text;
          const id = `${filePath}::${typeName}`;
          const codeSnippet = getTypeCodeSnippet(statement, sourceFile);
          const startLine = getTypeStartLine(statement, sourceFile);

          const typeEntity: TypeEntity = {
            id,
            label: typeName,
            filePath,
            typeKind: 'type',
            codeSnippet,
            startLine,
            sourceFile,
            declaration: statement,
          };

          // Dependencies 계산 및 캐싱
          typeEntity.dependencies = getTypeDependencies(typeEntity);
          typeEntity.extendsFrom = []; // type alias는 extends 없음

          types.push(typeEntity);
        }
      });

    } catch (error) {
      console.error(`❌ Error extracting types from ${filePath}:`, error);
    }
  }

  // Entry file부터 시작하여 모든 파일 처리
  const allFiles = Object.keys(files);
  allFiles.forEach(filePath => processFile(filePath));

  console.log(`✅ Extracted ${types.length} types`);

  return { types };
}
