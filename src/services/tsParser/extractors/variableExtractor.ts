/**
 * 파일 레벨 변수 추출기
 *
 * 파일의 최상위 레벨에 선언된 변수들을 추출
 */

import * as ts from 'typescript';
import { FileVariable } from '../types';

/**
 * 파일 레벨 변수 추출
 */
export function extractFileVariables(
  sourceFile: ts.SourceFile,
  filePath: string
): FileVariable[] {
  const variables: FileVariable[] = [];

  ts.forEachChild(sourceFile, (node) => {
    // 변수 선언문
    if (ts.isVariableStatement(node)) {
      const isExported = hasExportModifier(node);

      // 전체 선언문 추출 (export const MULTIPLIER = 2; 형태)
      const fullStatement = node.getText(sourceFile);
      const statementLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      node.declarationList.declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const isConst = node.declarationList.flags & ts.NodeFlags.Const ? true : false;

          variables.push({
            name,
            id: `${filePath}::${name}`,
            line: statementLine,
            isConst,
            isExported,
            codeSnippet: fullStatement, // parent node의 전체 텍스트 사용
          });
        }
      });
    }
  });

  return variables;
}

/**
 * Export modifier 확인
 */
function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true
  );
}

/**
 * 파일 변수 Map 생성 (name → FileVariable)
 */
export function createFileVariableMap(
  variables: FileVariable[]
): Map<string, FileVariable> {
  const map = new Map<string, FileVariable>();
  variables.forEach((v) => map.set(v.name, v));
  return map;
}
