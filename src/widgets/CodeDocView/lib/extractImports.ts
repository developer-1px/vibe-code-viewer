/**
 * Extract import declarations from SourceFileNode
 * Import 선언 추출 (View 기반)
 */

import { getImports } from '../../../entities/SourceFileNode/lib/metadata';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';

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
 * 🔥 View 기반: Import View 사용 (AST 순회 없음!)
 */
export function extractImports(node: SourceFileNode): ImportSymbol[] {
  const imports: ImportSymbol[] = [];

  // 🔥 Import View 조회
  const importView = getImports(node);

  importView.forEach((imp) => {
    // TODO: Worker Import View에 isTypeOnly 필드 추가 필요
    const isTypeOnly = false; // Fallback
    const kind = inferSymbolKind(imp.name, isTypeOnly);

    imports.push({
      name: imp.name,
      kind,
      fromPath: imp.from,
      isTypeOnly,
    });
  });

  return imports;
}
