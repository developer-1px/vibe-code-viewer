/**
 * SourceFileNode getter 순수 함수들
 * ts.SourceFile에서 필요한 정보를 추출
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../model/types';

/**
 * 노드의 dependencies를 가져옴 (import 기반)
 */
export function getDependencies(
  node: SourceFileNode,
  files: Record<string, string>,
  resolvePath: (from: string, to: string, files: Record<string, string>) => string | null
): string[] {
  const dependencies: string[] = [];

  node.sourceFile.statements.forEach((statement) => {
    if (ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)) {

      // Type-only import는 스킵
      if (statement.importClause?.isTypeOnly) return;

      const source = statement.moduleSpecifier.text;
      const resolvedPath = resolvePath(node.filePath, source, files);

      if (resolvedPath && !dependencies.includes(resolvedPath)) {
        dependencies.push(resolvedPath);
      }
    }
  });

  return dependencies;
}

/**
 * 특정 identifier가 어디서 import 되었는지 찾음
 */
export function getImportSource(
  node: SourceFileNode,
  identifierName: string,
  files: Record<string, string>,
  resolvePath: (from: string, to: string, files: Record<string, string>) => string | null
): string | null {
  for (const statement of node.sourceFile.statements) {
    if (ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)) {

      const clause = statement.importClause;
      if (!clause) continue;

      const source = statement.moduleSpecifier.text;
      const resolvedPath = resolvePath(node.filePath, source, files);

      // Default import
      if (clause.name && clause.name.text === identifierName) {
        return resolvedPath || `npm:${source}`;
      }

      // Named imports
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        const found = clause.namedBindings.elements.find(
          el => el.name.text === identifierName
        );
        if (found) {
          return resolvedPath || `npm:${source}`;
        }
      }

      // Namespace import
      if (clause.namedBindings &&
          ts.isNamespaceImport(clause.namedBindings) &&
          clause.namedBindings.name.text === identifierName) {
        return resolvedPath || `npm:${source}`;
      }
    }
  }

  return null;
}

/**
 * 파일 내에서 선언된 local identifiers를 가져옴
 */
export function getLocalIdentifiers(node: SourceFileNode): Set<string> {
  const locals = new Set<string>();

  function visit(n: ts.Node) {
    // Variable declarations
    if (ts.isVariableStatement(n)) {
      n.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          locals.add(decl.name.text);
        }
      });
    }

    // Function declarations
    if (ts.isFunctionDeclaration(n) && n.name) {
      locals.add(n.name.text);
    }

    // Type declarations
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) {
      locals.add(n.name.text);
    }

    // Class declarations
    if (ts.isClassDeclaration(n) && n.name) {
      locals.add(n.name.text);
    }

    ts.forEachChild(n, visit);
  }

  visit(node.sourceFile);
  return locals;
}
