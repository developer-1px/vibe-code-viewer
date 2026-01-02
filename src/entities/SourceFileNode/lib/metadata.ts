/**
 * Getter Layer: SourceFileNode → 메타데이터
 *
 * AST와 사용처 사이의 추상화 계층
 * - 현재: AST 순회로 구현
 * - 미래: DB 조회로 전환 가능 (인터페이스 변경 없음)
 *
 * 금지 사항:
 * - SourceFileNode에 metadata 필드 추가 금지
 * - Private 함수 직접 호출 금지
 * - Public getter만 사용
 */

import ts from 'typescript';
import type { SourceFileNode } from '../model/types';

// ========================================
// Public 인터페이스
// ========================================

export interface ExportInfo {
  name: string;
  line: number;
  kind: 'function' | 'variable' | 'type' | 'interface' | 'class' | 'enum';
}

export interface ImportInfo {
  name: string;
  line: number;
  from: string;
  isDefault: boolean;
  isNamespace: boolean;
}

export interface DeclarationInfo {
  name: string;
  line: number;
  kind: 'function' | 'variable' | 'class';
}

// ========================================
// Public Getter 함수
// ========================================

/**
 * 파일의 모든 export 정보 추출
 *
 * @example
 * const exports = getExports(node);
 * exports.forEach(exp => console.log(exp.name, exp.line));
 */
export function getExports(node: SourceFileNode): ExportInfo[] {
  if (!node.sourceFile || node.type !== 'file') return [];
  return extractExportsFromAST(node.sourceFile);
}

/**
 * 파일의 모든 import 정보 추출
 */
export function getImports(node: SourceFileNode): ImportInfo[] {
  if (!node.sourceFile || node.type !== 'file') return [];
  return extractImportsFromAST(node.sourceFile);
}

/**
 * export되지 않은 로컬 함수 추출
 */
export function getLocalFunctions(node: SourceFileNode): DeclarationInfo[] {
  if (!node.sourceFile || node.type !== 'file') return [];
  return extractLocalFunctionsFromAST(node.sourceFile);
}

/**
 * export되지 않은 로컬 변수 추출
 */
export function getLocalVariables(node: SourceFileNode): DeclarationInfo[] {
  if (!node.sourceFile || node.type !== 'file') return [];
  return extractLocalVariablesFromAST(node.sourceFile);
}

/**
 * 파일 내에서 사용된 모든 identifier 추출
 */
export function getUsedIdentifiers(node: SourceFileNode): Set<string> {
  if (!node.sourceFile || node.type !== 'file') return new Set();
  return extractUsedIdentifiersFromAST(node.sourceFile);
}


// ========================================
// Private 구현 함수 (외부에서 직접 호출 금지)
// ========================================

/**
 * Line number 계산 헬퍼
 */
function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return line + 1; // Convert to 1-based
}

/**
 * AST에서 exports 추출 (Private)
 */
function extractExportsFromAST(sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];

  function visit(astNode: ts.Node) {
    // Export 키워드가 있는 선언
    if (ts.canHaveModifiers(astNode)) {
      const modifiers = ts.getModifiers(astNode);
      const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

      if (hasExport) {
        // Function declarations
        if (ts.isFunctionDeclaration(astNode) && astNode.name) {
          exports.push({
            name: astNode.name.text,
            line: getLineNumber(sourceFile, astNode),
            kind: 'function'
          });
        }
        // Variable statements
        else if (ts.isVariableStatement(astNode)) {
          astNode.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              exports.push({
                name: decl.name.text,
                line: getLineNumber(sourceFile, decl),
                kind: 'variable'
              });
            }
          });
        }
        // Type alias
        else if (ts.isTypeAliasDeclaration(astNode)) {
          exports.push({
            name: astNode.name.text,
            line: getLineNumber(sourceFile, astNode),
            kind: 'type'
          });
        }
        // Interface
        else if (ts.isInterfaceDeclaration(astNode)) {
          exports.push({
            name: astNode.name.text,
            line: getLineNumber(sourceFile, astNode),
            kind: 'interface'
          });
        }
        // Class
        else if (ts.isClassDeclaration(astNode) && astNode.name) {
          exports.push({
            name: astNode.name.text,
            line: getLineNumber(sourceFile, astNode),
            kind: 'class'
          });
        }
        // Enum
        else if (ts.isEnumDeclaration(astNode)) {
          exports.push({
            name: astNode.name.text,
            line: getLineNumber(sourceFile, astNode),
            kind: 'enum'
          });
        }
      }
    }

    ts.forEachChild(astNode, visit);
  }

  visit(sourceFile);
  return exports;
}

/**
 * AST에서 imports 추출 (Private)
 */
function extractImportsFromAST(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  sourceFile.statements.forEach(statement => {
    if (ts.isImportDeclaration(statement)) {
      const moduleSpecifier = statement.moduleSpecifier;
      const from = ts.isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : '';
      const line = getLineNumber(sourceFile, statement);

      const importClause = statement.importClause;
      if (!importClause) return;

      // Default import: import React from 'react'
      if (importClause.name) {
        imports.push({
          name: importClause.name.text,
          line,
          from,
          isDefault: true,
          isNamespace: false
        });
      }

      // Named imports: import { useState, useEffect } from 'react'
      if (importClause.namedBindings) {
        if (ts.isNamedImports(importClause.namedBindings)) {
          importClause.namedBindings.elements.forEach(element => {
            imports.push({
              name: element.name.text,
              line,
              from,
              isDefault: false,
              isNamespace: false
            });
          });
        }
        // Namespace import: import * as React from 'react'
        else if (ts.isNamespaceImport(importClause.namedBindings)) {
          imports.push({
            name: importClause.namedBindings.name.text,
            line,
            from,
            isDefault: false,
            isNamespace: true
          });
        }
      }
    }
  });

  return imports;
}

/**
 * AST에서 로컬 함수 추출 (Private)
 */
function extractLocalFunctionsFromAST(sourceFile: ts.SourceFile): DeclarationInfo[] {
  const functions: DeclarationInfo[] = [];

  sourceFile.statements.forEach(statement => {
    // Export 여부 확인
    const hasExport = ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    if (hasExport) return; // Export된 것은 제외

    // Function declarations
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      functions.push({
        name: statement.name.text,
        line: getLineNumber(sourceFile, statement),
        kind: 'function'
      });
    }

    // Variable statements with arrow functions or function expressions
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
            functions.push({
              name: decl.name.text,
              line: getLineNumber(sourceFile, decl),
              kind: 'function'
            });
          }
        }
      });
    }
  });

  return functions;
}

/**
 * AST에서 로컬 변수 추출 (Private)
 */
function extractLocalVariablesFromAST(sourceFile: ts.SourceFile): DeclarationInfo[] {
  const variables: DeclarationInfo[] = [];

  sourceFile.statements.forEach(statement => {
    // Export 여부 확인
    const hasExport = ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    if (hasExport) return; // Export된 것은 제외

    // Variable statements
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          // 함수가 아닌 변수만
          if (decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
            return; // 함수는 제외
          }
          variables.push({
            name: decl.name.text,
            line: getLineNumber(sourceFile, decl),
            kind: 'variable'
          });
        }
      });
    }
  });

  return variables;
}

/**
 * AST에서 사용된 identifiers 추출 (Private)
 */
function extractUsedIdentifiersFromAST(sourceFile: ts.SourceFile): Set<string> {
  const usedIdentifiers = new Set<string>();

  function isDeclarationName(node: ts.Node): boolean {
    const parent = node.parent;
    if (!parent) return false;

    // Import 이름
    if (ts.isImportClause(parent) || ts.isImportSpecifier(parent)) {
      return true;
    }

    // Declaration 이름
    if (ts.isFunctionDeclaration(parent) ||
        ts.isVariableDeclaration(parent) ||
        ts.isClassDeclaration(parent) ||
        ts.isParameter(parent)) {
      return parent.name === node;
    }

    return false;
  }

  function visit(astNode: ts.Node) {
    // Import declarations는 skip
    if (ts.isImportDeclaration(astNode)) {
      return;
    }

    // Identifier 수집 (선언 이름 제외)
    if (ts.isIdentifier(astNode)) {
      if (!isDeclarationName(astNode)) {
        usedIdentifiers.add(astNode.text);
      }
    }

    ts.forEachChild(astNode, visit);
  }

  visit(sourceFile);
  return usedIdentifiers;
}
