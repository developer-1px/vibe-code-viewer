/**
 * Import 추출기
 *
 * TypeScript AST에서 모든 import 문을 추출
 */

import * as ts from 'typescript';
import { ImportInfo } from '../types';

/**
 * 파일에서 모든 import 추출
 */
export function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      processImportDeclaration(node, imports);
    }
  });

  return imports;
}

/**
 * Import declaration 처리
 */
function processImportDeclaration(
  node: ts.ImportDeclaration,
  imports: ImportInfo[]
): void {
  const moduleSpecifier = node.moduleSpecifier;
  if (!ts.isStringLiteral(moduleSpecifier)) return;

  const source = moduleSpecifier.text;
  const isTypeOnly = node.importClause?.isTypeOnly ?? false;

  // Side-effect import: import './styles.css'
  if (!node.importClause) {
    imports.push({
      name: source,
      source,
      importType: 'side-effect',
      isTypeOnly: false,
    });
    return;
  }

  const importClause = node.importClause;

  // Default import: import Foo from './foo'
  if (importClause.name) {
    imports.push({
      name: importClause.name.text,
      source,
      importType: 'default',
      isTypeOnly,
    });
  }

  // Named bindings
  if (importClause.namedBindings) {
    if (ts.isNamespaceImport(importClause.namedBindings)) {
      // Namespace import: import * as Foo from './foo'
      imports.push({
        name: importClause.namedBindings.name.text,
        source,
        importType: 'namespace',
        isTypeOnly,
      });
    } else if (ts.isNamedImports(importClause.namedBindings)) {
      // Named imports: import { a, b as c } from './foo'
      importClause.namedBindings.elements.forEach((element) => {
        const name = element.name.text;
        imports.push({
          name,
          source,
          importType: 'named',
          isTypeOnly: isTypeOnly || element.isTypeOnly,
        });
      });
    }
  }
}

/**
 * Import map 생성 (name → ImportInfo)
 */
export function createImportMap(imports: ImportInfo[]): Map<string, ImportInfo> {
  const map = new Map<string, ImportInfo>();
  imports.forEach((imp) => {
    if (imp.importType !== 'side-effect') {
      map.set(imp.name, imp);
    }
  });
  return map;
}
