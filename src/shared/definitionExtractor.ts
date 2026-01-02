/**
 * Definition Extractor
 * Extracts definitions (exports, types, interfaces, functions, classes) from TypeScript AST
 * Used for: API documentation, export list, public interface analysis
 */

import ts from 'typescript';
import type { SourceFileNode } from '../entities/SourceFileNode/model/types';
import { createLanguageService } from './tsParser/utils/languageService';

// Re-export OutlinePanel types (from LIMN component)
export type SymbolKind =
  | 'import'
  | 'type'
  | 'interface'
  | 'enum'
  | 'const'
  | 'let'
  | 'function'
  | 'class'
  | 'method'
  | 'property';

export interface SymbolModifier {
  export?: boolean;
  async?: boolean;
  static?: boolean;
  readonly?: boolean;
  private?: boolean;
  public?: boolean;
}

export interface SymbolParam {
  name: string;
  type: string;
  defaultValue?: string;
  optional?: boolean;
}

export interface DefinitionSymbol {
  kind: SymbolKind;
  name: string;
  line: number;
  modifiers?: SymbolModifier;
  type?: string;
  params?: SymbolParam[];
  jsDoc?: string;
  children?: DefinitionSymbol[];
  value?: string;
  from?: string;
}

/**
 * Get line number from AST node
 */
function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return line + 1; // Convert to 1-based
}

/**
 * Extract modifiers from AST node
 */
function extractModifiers(node: ts.Node): SymbolModifier {
  const modifiers: SymbolModifier = {};

  if (ts.canHaveModifiers(node)) {
    const nodeModifiers = ts.getModifiers(node);
    if (nodeModifiers) {
      nodeModifiers.forEach((modifier) => {
        switch (modifier.kind) {
          case ts.SyntaxKind.ExportKeyword:
            modifiers.export = true;
            break;
          case ts.SyntaxKind.AsyncKeyword:
            modifiers.async = true;
            break;
          case ts.SyntaxKind.StaticKeyword:
            modifiers.static = true;
            break;
          case ts.SyntaxKind.ReadonlyKeyword:
            modifiers.readonly = true;
            break;
          case ts.SyntaxKind.PrivateKeyword:
            modifiers.private = true;
            break;
          case ts.SyntaxKind.PublicKeyword:
            modifiers.public = true;
            break;
        }
      });
    }
  }

  return modifiers;
}

/**
 * Extract parameters from function/method
 */
function extractParameters(node: ts.FunctionLikeDeclaration): SymbolParam[] {
  return node.parameters.map((param) => {
    const name = param.name.getText();
    const type = param.type ? param.type.getText() : 'any';
    const optional = !!param.questionToken;
    const defaultValue = param.initializer ? param.initializer.getText() : undefined;

    return { name, type, optional, defaultValue };
  });
}

/**
 * Extract type annotation from node (with type inference)
 */
function extractType(
  node: ts.Node,
  typeChecker?: ts.TypeChecker
): string | undefined {
  // 1. Explicit type annotation (명시적 타입)
  if (ts.isVariableDeclaration(node) && node.type) {
    return node.type.getText();
  }
  if (ts.isFunctionDeclaration(node) && node.type) {
    return node.type.getText();
  }
  if (ts.isMethodDeclaration(node) && node.type) {
    return node.type.getText();
  }
  if (ts.isPropertyDeclaration(node) && node.type) {
    return node.type.getText();
  }
  if (ts.isTypeAliasDeclaration(node) && node.type) {
    return node.type.getText();
  }

  // 2. Inferred type (타입 추론)
  if (typeChecker) {
    try {
      const type = typeChecker.getTypeAtLocation(node);
      if (type) {
        const typeString = typeChecker.typeToString(type, node, ts.TypeFormatFlags.NoTruncation);
        // 너무 긴 타입은 생략
        if (typeString.length > 100) {
          return typeString.substring(0, 97) + '...';
        }
        return typeString;
      }
    } catch (e) {
      // Type checking 실패 시 무시
      console.warn('[extractType] Type inference failed:', e);
    }
  }

  return undefined;
}

/**
 * Extract JSDoc comment
 */
function extractJsDoc(node: ts.Node): string | undefined {
  const jsDocTags = (node as any).jsDoc;
  if (jsDocTags && jsDocTags.length > 0) {
    const comment = jsDocTags[0].comment;
    if (typeof comment === 'string') {
      return comment;
    }
  }
  return undefined;
}

/**
 * Group definitions by physical code blocks (separated by empty lines)
 */
export function groupDefinitionsByPhysicalBlock(
  symbols: DefinitionSymbol[],
  sourceFile: ts.SourceFile
): DefinitionSymbol[] {
  if (symbols.length === 0) return [];

  const fileContent = sourceFile.getFullText();
  const lines = fileContent.split('\n');

  // Find empty line positions (1-based)
  const emptyLines = new Set<number>();
  lines.forEach((line, idx) => {
    if (line.trim() === '') {
      emptyLines.add(idx + 1); // Convert to 1-based
    }
  });

  // Helper: Check if there's an empty line between two line numbers
  const hasEmptyLineBetween = (line1: number, line2: number): boolean => {
    const start = Math.min(line1, line2);
    const end = Math.max(line1, line2);
    for (let i = start; i < end; i++) {
      if (emptyLines.has(i)) return true;
    }
    return false;
  };

  // Group symbols into blocks based on empty lines
  const blocks: DefinitionSymbol[][] = [];
  let currentBlock: DefinitionSymbol[] = [];

  const sortedSymbols = [...symbols].sort((a, b) => a.line - b.line);

  sortedSymbols.forEach((symbol, idx) => {
    if (idx === 0) {
      currentBlock.push(symbol);
      return;
    }

    const prevSymbol = sortedSymbols[idx - 1];

    // If there's an empty line between prev and current, start new block
    if (hasEmptyLineBetween(prevSymbol.line, symbol.line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = [symbol];
    } else {
      currentBlock.push(symbol);
    }
  });

  // Add last block
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  // Convert blocks to DefinitionSymbol groups
  const result: DefinitionSymbol[] = blocks.map((block, idx) => {
    // Determine block type (majority kind in block)
    const kindCounts: Record<string, number> = {};
    block.forEach(sym => {
      kindCounts[sym.kind] = (kindCounts[sym.kind] || 0) + 1;
    });
    const dominantKind = Object.entries(kindCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as SymbolKind;

    // Create descriptive name
    const kindLabels: Record<SymbolKind, string> = {
      import: 'Imports',
      type: 'Types',
      interface: 'Interfaces',
      enum: 'Enums',
      const: 'Constants',
      let: 'Variables',
      function: 'Functions',
      class: 'Classes',
      method: 'Methods',
      property: 'Properties',
    };

    const blockName = block.length === 1
      ? block[0].name
      : `${kindLabels[dominantKind]} Block ${idx + 1} (${block.length})`;

    return {
      kind: dominantKind,
      name: blockName,
      line: block[0].line,
      children: block,
    };
  });

  return result;
}

/**
 * Group definitions by their kind (type-based grouping)
 */
export function groupDefinitionsByKind(symbols: DefinitionSymbol[]): DefinitionSymbol[] {
  const groups: Record<SymbolKind, DefinitionSymbol[]> = {
    import: [],
    type: [],
    interface: [],
    enum: [],
    const: [],
    let: [],
    function: [],
    class: [],
    method: [],
    property: [],
  };

  // Group symbols by kind
  symbols.forEach((symbol) => {
    groups[symbol.kind].push(symbol);
  });

  const result: DefinitionSymbol[] = [];

  // Helper to create block group
  const createBlock = (kind: SymbolKind, label: string): DefinitionSymbol | null => {
    const items = groups[kind];
    if (items.length === 0) return null;

    return {
      kind,
      name: `${label} (${items.length})`,
      line: items[0].line, // Use first item's line
      children: items,
    };
  };

  // Create blocks in order (imports first, then types, etc.)
  const blocks = [
    createBlock('import', 'Imports'),
    createBlock('type', 'Type Aliases'),
    createBlock('interface', 'Interfaces'),
    createBlock('enum', 'Enums'),
    createBlock('const', 'Constants'),
    createBlock('let', 'Variables'),
    createBlock('function', 'Functions'),
    createBlock('class', 'Classes'),
  ];

  // Add non-null blocks to result
  blocks.forEach((block) => {
    if (block) result.push(block);
  });

  return result;
}

/**
 * Extract definitions (types, interfaces, functions, classes, exports) from SourceFileNode
 */
export function extractDefinitions(
  node: SourceFileNode,
  files?: Record<string, string>
): DefinitionSymbol[] {
  if (!node.sourceFile) {
    console.warn('[definitionExtractor] No sourceFile available for:', node.filePath);
    return [];
  }

  const sourceFile = node.sourceFile;
  const symbols: DefinitionSymbol[] = [];

  // Create Language Service for type inference
  let typeChecker: ts.TypeChecker | undefined;
  if (files) {
    try {
      const languageService = createLanguageService(files);
      const program = languageService.getProgram();
      if (program) {
        typeChecker = program.getTypeChecker();
      }
    } catch (e) {
      console.warn('[definitionExtractor] Failed to create type checker:', e);
    }
  }

  function visit(astNode: ts.Node, skipChildren = false) {
    // Skip if this node's children should not be visited (already processed manually)
    let shouldVisitChildren = !skipChildren;

    // Import Declarations
    if (ts.isImportDeclaration(astNode)) {
      const importClause = astNode.importClause;
      if (importClause) {
        let importName = '';

        // Default import: import React from 'react'
        if (importClause.name) {
          importName = importClause.name.text;
        }
        // Named imports: import { useState } from 'react'
        else if (importClause.namedBindings) {
          if (ts.isNamedImports(importClause.namedBindings)) {
            const names = importClause.namedBindings.elements.map(e => e.name.text);
            importName = `{ ${names.join(', ')} }`;
          }
          // Namespace import: import * as React from 'react'
          else if (ts.isNamespaceImport(importClause.namedBindings)) {
            importName = `* as ${importClause.namedBindings.name.text}`;
          }
        }

        const moduleSpecifier = astNode.moduleSpecifier;
        const from = ts.isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : '';

        symbols.push({
          kind: 'import',
          name: importName || 'import',
          line: getLineNumber(sourceFile, astNode),
          from,
        });
      }
    }

    // Type Alias Declarations
    if (ts.isTypeAliasDeclaration(astNode)) {
      symbols.push({
        kind: 'type',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        modifiers: extractModifiers(astNode),
        type: extractType(astNode, typeChecker),
        jsDoc: extractJsDoc(astNode),
      });
    }

    // Interface Declarations
    if (ts.isInterfaceDeclaration(astNode)) {
      const children: DefinitionSymbol[] = [];

      astNode.members.forEach((member) => {
        if (ts.isPropertySignature(member) && member.name) {
          children.push({
            kind: 'property',
            name: member.name.getText(),
            line: getLineNumber(sourceFile, member),
            type: member.type ? member.type.getText() : undefined,
          });
        }
        if (ts.isMethodSignature(member) && member.name) {
          children.push({
            kind: 'method',
            name: member.name.getText(),
            line: getLineNumber(sourceFile, member),
            type: member.type ? member.type.getText() : undefined,
            params: extractParameters(member as ts.FunctionLikeDeclaration),
          });
        }
      });

      symbols.push({
        kind: 'interface',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        modifiers: extractModifiers(astNode),
        jsDoc: extractJsDoc(astNode),
        children: children.length > 0 ? children : undefined,
      });
    }

    // Enum Declarations
    if (ts.isEnumDeclaration(astNode)) {
      const children: DefinitionSymbol[] = [];

      astNode.members.forEach((member) => {
        children.push({
          kind: 'property',
          name: member.name.getText(),
          line: getLineNumber(sourceFile, member),
          value: member.initializer ? member.initializer.getText() : undefined,
        });
      });

      symbols.push({
        kind: 'enum',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        modifiers: extractModifiers(astNode),
        children: children.length > 0 ? children : undefined,
      });
    }

    // Variable Statements (const, let, var)
    if (ts.isVariableStatement(astNode)) {
      const modifiers = extractModifiers(astNode);

      astNode.declarationList.declarations.forEach((declaration) => {
        if (ts.isIdentifier(declaration.name)) {
          const isConst = (astNode.declarationList.flags & ts.NodeFlags.Const) !== 0;
          const isLet = (astNode.declarationList.flags & ts.NodeFlags.Let) !== 0;

          let children: DefinitionSymbol[] | undefined = undefined;

          // Check if it's an arrow function (React component)
          if (declaration.initializer && ts.isArrowFunction(declaration.initializer)) {
            const arrowFunc = declaration.initializer;
            children = [];

            // Extract arrow function body contents
            if (ts.isBlock(arrowFunc.body)) {
              arrowFunc.body.statements.forEach((statement) => {
                // Variable declarations inside arrow function
                if (ts.isVariableStatement(statement)) {
                  statement.declarationList.declarations.forEach((innerDecl) => {
                    if (ts.isIdentifier(innerDecl.name)) {
                      const innerIsConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
                      const innerIsLet = (statement.declarationList.flags & ts.NodeFlags.Let) !== 0;

                      children!.push({
                        kind: innerIsConst ? 'const' : innerIsLet ? 'let' : 'let',
                        name: innerDecl.name.text,
                        line: getLineNumber(sourceFile, innerDecl),
                        type: extractType(innerDecl, typeChecker),
                      });
                    }
                  });
                }

                // Nested function declarations inside arrow function
                if (ts.isFunctionDeclaration(statement) && statement.name) {
                  children!.push({
                    kind: 'function',
                    name: statement.name.text,
                    line: getLineNumber(sourceFile, statement),
                    type: extractType(statement, typeChecker),
                    params: extractParameters(statement),
                  });
                }
              });
            }
          }
          // Check if it's an object literal with properties
          else if (declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
            children = [];
            declaration.initializer.properties.forEach((prop) => {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                children!.push({
                  kind: 'property',
                  name: prop.name.text,
                  line: getLineNumber(sourceFile, prop),
                  value: prop.initializer.getText(),
                });
              }
            });
          }

          symbols.push({
            kind: isConst ? 'const' : isLet ? 'let' : 'let',
            name: declaration.name.text,
            line: getLineNumber(sourceFile, declaration),
            modifiers,
            type: extractType(declaration, typeChecker),
            children: children && children.length > 0 ? children : undefined,
          });

          // If this is an arrow function or object, don't visit children (already extracted manually)
          if (children && children.length > 0) {
            shouldVisitChildren = false;
          }
        }
      });
    }

    // Function Declarations
    if (ts.isFunctionDeclaration(astNode) && astNode.name) {
      const children: DefinitionSymbol[] = [];

      // Extract function body contents (variables, nested functions)
      if (astNode.body) {
        astNode.body.statements.forEach((statement) => {
          // Variable declarations inside function
          if (ts.isVariableStatement(statement)) {
            statement.declarationList.declarations.forEach((declaration) => {
              if (ts.isIdentifier(declaration.name)) {
                const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
                const isLet = (statement.declarationList.flags & ts.NodeFlags.Let) !== 0;

                children.push({
                  kind: isConst ? 'const' : isLet ? 'let' : 'let',
                  name: declaration.name.text,
                  line: getLineNumber(sourceFile, declaration),
                  type: extractType(declaration, typeChecker),
                });
              }
            });
          }

          // Nested function declarations
          if (ts.isFunctionDeclaration(statement) && statement.name) {
            children.push({
              kind: 'function',
              name: statement.name.text,
              line: getLineNumber(sourceFile, statement),
              type: extractType(statement, typeChecker),
              params: extractParameters(statement),
            });
          }
        });
      }

      symbols.push({
        kind: 'function',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        modifiers: extractModifiers(astNode),
        type: extractType(astNode, typeChecker),
        params: extractParameters(astNode),
        jsDoc: extractJsDoc(astNode),
        children: children.length > 0 ? children : undefined,
      });

      // Don't visit function body children (already extracted manually)
      shouldVisitChildren = false;
    }

    // Class Declarations
    if (ts.isClassDeclaration(astNode) && astNode.name) {
      const children: DefinitionSymbol[] = [];

      astNode.members.forEach((member) => {
        // Constructor
        if (ts.isConstructorDeclaration(member)) {
          children.push({
            kind: 'method',
            name: 'constructor',
            line: getLineNumber(sourceFile, member),
            params: extractParameters(member),
            type: 'void',
          });
        }

        // Methods
        if (ts.isMethodDeclaration(member) && member.name) {
          children.push({
            kind: 'method',
            name: member.name.getText(),
            line: getLineNumber(sourceFile, member),
            modifiers: extractModifiers(member),
            type: extractType(member, typeChecker),
            params: extractParameters(member),
            jsDoc: extractJsDoc(member),
          });
        }

        // Properties
        if (ts.isPropertyDeclaration(member) && member.name) {
          children.push({
            kind: 'property',
            name: member.name.getText(),
            line: getLineNumber(sourceFile, member),
            modifiers: extractModifiers(member),
            type: extractType(member, typeChecker),
          });
        }
      });

      symbols.push({
        kind: 'class',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        modifiers: extractModifiers(astNode),
        jsDoc: extractJsDoc(astNode),
        children: children.length > 0 ? children : undefined,
      });
    }

    // Only visit children if not already processed manually
    if (shouldVisitChildren) {
      ts.forEachChild(astNode, visit);
    }
  }

  visit(sourceFile);

  console.log('[definitionExtractor] Extracted definitions:', symbols.length, 'from', node.filePath);

  // Group imports into a single collapsible group
  const imports = symbols.filter(s => s.kind === 'import');
  const nonImports = symbols.filter(s => s.kind !== 'import');

  if (imports.length === 0) {
    return symbols;
  }

  // Create imports group
  const importsGroup: DefinitionSymbol = {
    kind: 'import',
    name: `Imports (${imports.length})`,
    line: imports[0].line,
    children: imports,
  };

  return [importsGroup, ...nonImports];
}
