/**
 * Outline Symbol Extractor
 * Extracts code structure (symbols) from TypeScript AST for Outline Panel
 */

import ts from 'typescript';
import type { SourceFileNode } from '../entities/SourceFileNode/model/types';

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

export interface OutlineSymbol {
  kind: SymbolKind;
  name: string;
  line: number;
  modifiers?: SymbolModifier;
  type?: string;
  params?: SymbolParam[];
  jsDoc?: string;
  children?: OutlineSymbol[];
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
 * Extract type annotation from node
 */
function extractType(node: ts.Node): string | undefined {
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
 * Extract outline symbols from SourceFileNode
 */
export function extractOutlineSymbols(node: SourceFileNode): OutlineSymbol[] {
  if (!node.sourceFile) {
    console.warn('[outlineExtractor] No sourceFile available for:', node.filePath);
    return [];
  }

  const sourceFile = node.sourceFile;
  const symbols: OutlineSymbol[] = [];

  function visit(astNode: ts.Node) {
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
        type: extractType(astNode),
        jsDoc: extractJsDoc(astNode),
      });
    }

    // Interface Declarations
    if (ts.isInterfaceDeclaration(astNode)) {
      const children: OutlineSymbol[] = [];

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
      const children: OutlineSymbol[] = [];

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

          // Check if it's an object literal with properties
          let children: OutlineSymbol[] | undefined = undefined;
          if (declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
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
            type: extractType(declaration),
            children: children && children.length > 0 ? children : undefined,
          });
        }
      });
    }

    // Function Declarations
    if (ts.isFunctionDeclaration(astNode) && astNode.name) {
      symbols.push({
        kind: 'function',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        modifiers: extractModifiers(astNode),
        type: extractType(astNode),
        params: extractParameters(astNode),
        jsDoc: extractJsDoc(astNode),
      });
    }

    // Class Declarations
    if (ts.isClassDeclaration(astNode) && astNode.name) {
      const children: OutlineSymbol[] = [];

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
            type: extractType(member),
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
            type: extractType(member),
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

    ts.forEachChild(astNode, visit);
  }

  visit(sourceFile);

  console.log('[outlineExtractor] Extracted symbols:', symbols.length, 'from', node.filePath);
  return symbols;
}
