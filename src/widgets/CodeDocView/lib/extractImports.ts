/**
 * Extract import declarations from SourceFileNode
 * Import 선언 추출 (TypeScript AST 기반)
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../../SourceFileNode/model/types';

export type SymbolKind =
  | 'function'
  | 'type'
  | 'const'
  | 'component'
  | 'hook'
  | 'class'
  | 'interface'
  | 'enum'
  | 'unknown';

export interface ImportSymbol {
  name: string; // Symbol name (e.g., "useState", "Button")
  kind: SymbolKind; // Symbol kind
  fromPath: string; // Source file path (e.g., "react", "./Button")
  isTypeOnly: boolean; // import type { ... }
}

/**
 * Infer symbol kind from name patterns
 */
function inferSymbolKind(name: string, isTypeOnly: boolean): SymbolKind {
  // Type-only imports are likely types or interfaces
  if (isTypeOnly) {
    // PascalCase with "Props", "Type", "Options" suffix → type
    if (/^[A-Z][a-z]+[A-Z]/.test(name) && /(Props|Type|Options|Config|Data)$/.test(name)) {
      return 'type';
    }
    // PascalCase → interface or type
    if (/^[A-Z]/.test(name)) {
      return 'interface';
    }
    return 'type';
  }

  // PascalCase starting with uppercase → Component or Class
  if (/^[A-Z]/.test(name)) {
    // Known React components or custom components
    if (
      name.endsWith('Provider') ||
      name.endsWith('Context') ||
      name.endsWith('Button') ||
      name.endsWith('Modal') ||
      name.endsWith('View') ||
      name.endsWith('Card')
    ) {
      return 'component';
    }
    // Class-like names
    return 'class';
  }

  // camelCase starting with "use" → hook
  if (/^use[A-Z]/.test(name)) {
    return 'hook';
  }

  // UPPER_CASE → const
  if (/^[A-Z_]+$/.test(name)) {
    return 'const';
  }

  // camelCase → likely function
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
    return 'function';
  }

  return 'unknown';
}

/**
 * Extract all import symbols from a SourceFileNode
 */
export function extractImports(node: SourceFileNode): ImportSymbol[] {
  const imports: ImportSymbol[] = [];
  const sourceFile = node.sourceFile;

  ts.forEachChild(sourceFile, (child) => {
    // Only process ImportDeclaration nodes
    if (!ts.isImportDeclaration(child)) return;

    const importClause = child.importClause;
    if (!importClause) return;

    const moduleSpecifier = child.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const fromPath = moduleSpecifier.text;
    const isTypeOnly = importClause.isTypeOnly || false;

    // Named imports: import { foo, bar } from '...'
    if (importClause.namedBindings) {
      if (ts.isNamedImports(importClause.namedBindings)) {
        importClause.namedBindings.elements.forEach((element) => {
          const name = element.name.getText(sourceFile);
          const kind = inferSymbolKind(name, isTypeOnly || element.isTypeOnly);
          imports.push({
            name,
            kind,
            fromPath,
            isTypeOnly: isTypeOnly || element.isTypeOnly,
          });
        });
      }

      // Namespace import: import * as React from 'react'
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        const name = importClause.namedBindings.name.getText(sourceFile);
        imports.push({
          name,
          kind: 'const',
          fromPath,
          isTypeOnly,
        });
      }
    }

    // Default import: import React from 'react'
    if (importClause.name) {
      const name = importClause.name.getText(sourceFile);
      const kind = inferSymbolKind(name, isTypeOnly);
      imports.push({
        name,
        kind,
        fromPath,
        isTypeOnly,
      });
    }
  });

  return imports;
}
