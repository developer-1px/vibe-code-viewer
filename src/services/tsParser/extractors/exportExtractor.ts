/**
 * Export 추출기
 *
 * TypeScript AST에서 모든 export 문을 추출
 */

import * as ts from 'typescript';
import { ExportInfo } from '../types';

/**
 * 파일에서 모든 export 추출
 */
export function extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    // export default function foo() {}
    if (ts.isExportAssignment(node)) {
      if (!node.isExportEquals) {
        // export default ...
        const name = getExportName(node.expression) || 'default';
        exports.push({
          name,
          exportType: 'default',
          isReExport: false,
        });
      }
      return;
    }

    // export { ... } from '...'
    // export function foo() {}
    // export const bar = ...
    if (ts.isExportDeclaration(node)) {
      processExportDeclaration(node, exports);
      return;
    }

    // Check for export modifier on declarations
    if (hasExportModifier(node)) {
      processExportedDeclaration(node, exports);
    }
  });

  return exports;
}

/**
 * Export declaration 처리
 */
function processExportDeclaration(
  node: ts.ExportDeclaration,
  exports: ExportInfo[]
): void {
  const moduleSpecifier = node.moduleSpecifier;
  const source = moduleSpecifier && ts.isStringLiteral(moduleSpecifier)
    ? moduleSpecifier.text
    : undefined;

  if (node.exportClause) {
    if (ts.isNamedExports(node.exportClause)) {
      // export { a, b as c } from './foo'
      node.exportClause.elements.forEach((element) => {
        const name = element.name.text;
        exports.push({
          name,
          exportType: 'named',
          isReExport: !!source,
          source,
        });
      });
    }
  } else if (source) {
    // export * from './foo'
    exports.push({
      name: '*',
      exportType: 'named',
      isReExport: true,
      source,
    });
  }
}

/**
 * Export된 선언 처리
 */
function processExportedDeclaration(
  node: ts.Node,
  exports: ExportInfo[]
): void {
  if (ts.isFunctionDeclaration(node) && node.name) {
    exports.push({
      name: node.name.text,
      exportType: 'named',
      isReExport: false,
    });
  } else if (ts.isVariableStatement(node)) {
    node.declarationList.declarations.forEach((decl) => {
      if (ts.isIdentifier(decl.name)) {
        exports.push({
          name: decl.name.text,
          exportType: 'named',
          isReExport: false,
        });
      }
    });
  } else if (ts.isClassDeclaration(node) && node.name) {
    exports.push({
      name: node.name.text,
      exportType: 'named',
      isReExport: false,
    });
  }
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
 * Export 이름 추출
 */
function getExportName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
    return 'default';
  }
  return null;
}
