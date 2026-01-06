/**
 * FileNode getter 순수 함수들
 * SourceFile에서 필요한 정보를 추출하는 함수들
 */

import * as ts from 'typescript';
import type { FileNode } from './types';
import { resolvePath } from './utils/pathResolver';

/**
 * 파일의 모든 import dependencies를 가져옴
 */
export function getDependencies(node: FileNode, files: Record<string, string>): string[] {
  const dependencies: string[] = [];

  node.sourceFile.statements.forEach((statement) => {
    if (
      ts.isImportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
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
 * 특정 identifier의 import 정보를 가져옴
 */
export function getImportSource(node: FileNode, identifierName: string, files: Record<string, string>): string | null {
  for (const statement of node.sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
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
        const found = clause.namedBindings.elements.find((el) => el.name.text === identifierName);
        if (found) {
          return resolvedPath || `npm:${source}`;
        }
      }

      // Namespace import
      if (
        clause.namedBindings &&
        ts.isNamespaceImport(clause.namedBindings) &&
        clause.namedBindings.name.text === identifierName
      ) {
        return resolvedPath || `npm:${source}`;
      }
    }
  }

  return null;
}
