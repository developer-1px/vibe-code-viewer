/**
 * Extract export signatures (함수, 변수, interface export 추출)
 * AST 기반으로 export 선언을 간결한 시그니처로 변환
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import type { CodeDocSection } from './types';

/**
 * TypeScript 함수 시그니처를 간결한 형식으로 변환
 * export function extractOutlineStructure(node: SourceFileNode): OutlineNode[]
 * → extractOutlineStructure(node: SourceFileNode) → OutlineNode[]
 */
function formatFunctionSignature(node: ts.FunctionDeclaration | ts.VariableStatement, sourceFile: ts.SourceFile): string {
  // Function Declaration
  if (ts.isFunctionDeclaration(node)) {
    const name = node.name?.getText(sourceFile) || 'anonymous';
    const params = node.parameters.map(p => p.getText(sourceFile)).join(', ');
    const returnType = node.type ? node.type.getText(sourceFile) : 'void';
    return `${name}(${params}) → ${returnType}`;
  }

  // Arrow Function (const foo = () => {})
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const name = declaration.name.getText(sourceFile);

      if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
        const func = declaration.initializer as ts.ArrowFunction | ts.FunctionExpression;
        const params = func.parameters.map(p => p.getText(sourceFile)).join(', ');
        const returnType = func.type ? func.type.getText(sourceFile) : 'unknown';
        return `${name}(${params}) → ${returnType}`;
      }

      // Constant/Variable
      const type = declaration.type ? declaration.type.getText(sourceFile) : 'unknown';
      return `${name}: ${type}`;
    }
  }

  return node.getText(sourceFile);
}

/**
 * AST에서 export 선언 추출 (함수, 변수, interface)
 */
export function extractExportSignatures(node: SourceFileNode): CodeDocSection[] {
  const exportSections: CodeDocSection[] = [];
  const sourceFile = node.sourceFile;

  ts.forEachChild(sourceFile, (child) => {
    // Export로 시작하는 선언문만 처리
    const modifiers = ts.canHaveModifiers(child) ? ts.getModifiers(child) : undefined;
    const hasExportModifier = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    if (!hasExportModifier) return;

    const startLine = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(child.getEnd()).line + 1;

    // 함수 또는 변수 선언
    if (ts.isFunctionDeclaration(child) || ts.isVariableStatement(child)) {
      const signature = formatFunctionSignature(child, sourceFile);

      exportSections.push({
        type: 'export',
        content: signature,
        startLine,
        endLine
      });
    }
    // Interface 선언
    else if (ts.isInterfaceDeclaration(child)) {
      const name = child.name.getText(sourceFile);

      exportSections.push({
        type: 'export',
        content: `interface ${name}`,
        startLine,
        endLine
      });
    }
  });

  return exportSections;
}
