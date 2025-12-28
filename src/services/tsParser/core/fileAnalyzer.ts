/**
 * 파일 분석기
 *
 * TypeScript 파일을 분석하여 함수, 변수, import/export 정보를 추출
 */

import * as ts from 'typescript';
import { TSFileAnalysis, FileContext } from '../types';
import { extractImports, createImportMap } from '../extractors/importExtractor';
import { extractExports } from '../extractors/exportExtractor';
import { extractFileVariables, createFileVariableMap } from '../extractors/variableExtractor';
import { extractFunctions, createFunctionMap } from '../extractors/functionExtractor';
import { analyzeFunctionFull } from './functionAnalyzer';

/**
 * 파일 전체 분석
 */
export function analyzeFile(
  filePath: string,
  content: string
): TSFileAnalysis {
  // 1. TypeScript AST 생성
  // ScriptKind를 파일 확장자에 따라 결정
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.jsx')
    ? ts.ScriptKind.JSX
    : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true, // setParentNodes
    scriptKind
  );

  // 2. Import 추출
  const imports = extractImports(sourceFile);

  // 3. Export 추출
  const exports = extractExports(sourceFile);

  // 4. 파일 레벨 변수 추출
  const fileVariables = extractFileVariables(sourceFile, filePath);

  // 5. 함수 추출
  const functions = extractFunctions(sourceFile, filePath);

  // 6. FileContext 생성
  const fileContext: FileContext = {
    filePath,
    imports: createImportMap(imports),
    fileVariables: createFileVariableMap(fileVariables),
    allFunctions: createFunctionMap(functions),
  };

  // 7. 각 함수 상세 분석 (로컬 변수, 외부 참조, 함수 호출)
  functions.forEach((func) => {
    try {
      analyzeFunctionFull(func, fileContext, sourceFile);
    } catch (error) {
      console.error(`❌ Error analyzing function ${func.name}:`, error);
    }
  });

  return {
    filePath,
    imports,
    exports,
    fileVariables,
    functions,
    sourceFile,
  };
}
