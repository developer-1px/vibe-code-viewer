/**
 * AST Getter 함수들
 *
 * TSFunctionAnalysis에서 AST 노드로부터 정보를 추출하는 순수 함수들
 */

import * as ts from 'typescript';
import { TSFunctionAnalysis } from '../types';

/**
 * 함수의 전체 코드 스니펫 가져오기 (최상위 statement 포함)
 *
 * 처리 패턴:
 * 1. export const fn = () => {} → VariableStatement
 * 2. export function fn() {} → FunctionDeclaration (Statement)
 * 3. function fn() {} → FunctionDeclaration (Statement)
 * 4. const fn = () => {} → VariableStatement
 */
export function getCodeSnippet(func: TSFunctionAnalysis): string {
  const { astNode, sourceFile } = func;

  // parent chain을 타고 올라가서 최상위 statement 찾기
  let statementNode: ts.Node = astNode;
  let current = astNode.parent;

  while (current && !ts.isSourceFile(current)) {
    if (ts.isStatement(current) && current.parent && ts.isSourceFile(current.parent)) {
      statementNode = current;
      break;
    }
    current = current.parent;
  }

  return statementNode.getText(sourceFile);
}

/**
 * 함수의 시작 라인 번호 가져오기 (1-based)
 */
export function getStartLine(func: TSFunctionAnalysis): number {
  const { astNode, sourceFile } = func;
  const pos = sourceFile.getLineAndCharacterOfPosition(astNode.getStart(sourceFile));
  return pos.line + 1;
}

/**
 * 함수의 끝 라인 번호 가져오기 (1-based)
 */
export function getEndLine(func: TSFunctionAnalysis): number {
  const { astNode, sourceFile } = func;
  const pos = sourceFile.getLineAndCharacterOfPosition(astNode.getEnd());
  return pos.line + 1;
}

/**
 * 함수의 파라미터 이름 목록 가져오기 (destructuring 지원)
 */
export function getParameters(func: TSFunctionAnalysis): string[] {
  const { astNode } = func;
  const params = new Set<string>();

  astNode.parameters.forEach((param) => {
    // Destructuring 패턴 지원 ({ title, isActive }, [first, second])
    extractVariableNames(param.name, params);
  });

  return Array.from(params);
}

/**
 * 함수의 로컬 변수 이름 목록 가져오기 (destructuring 지원)
 */
export function getLocalVariables(func: TSFunctionAnalysis): string[] {
  const { astNode } = func;
  const localVars = new Set<string>();

  function visit(n: ts.Node) {
    if (ts.isVariableDeclaration(n)) {
      // Destructuring 패턴 지원 ([a, b] = ..., {x, y} = ...)
      extractVariableNames(n.name, localVars);
    }
    ts.forEachChild(n, visit);
  }

  if (astNode.body) {
    visit(astNode.body);
  }

  return Array.from(localVars);
}

/**
 * 변수 이름 추출 (destructuring 지원)
 */
function extractVariableNames(
  name: ts.BindingName,
  names: Set<string>
): void {
  if (ts.isIdentifier(name)) {
    names.add(name.text);
  } else if (ts.isObjectBindingPattern(name)) {
    // { a, b } = ...
    name.elements.forEach((element) => {
      extractVariableNames(element.name, names);
    });
  } else if (ts.isArrayBindingPattern(name)) {
    // [a, b] = ...
    name.elements.forEach((element) => {
      if (ts.isBindingElement(element)) {
        extractVariableNames(element.name, names);
      }
    });
  }
}

/**
 * 함수가 async인지 확인
 */
export function isAsyncFunction(func: TSFunctionAnalysis): boolean {
  const { astNode } = func;
  return ts.canHaveModifiers(astNode) &&
    ts.getModifiers(astNode)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) === true;
}

/**
 * 함수가 export되었는지 확인
 */
export function isExportedFunction(func: TSFunctionAnalysis): boolean {
  const { astNode } = func;

  // parent statement 확인
  let current: ts.Node | undefined = astNode;
  while (current && !ts.isSourceFile(current)) {
    if (ts.canHaveModifiers(current)) {
      const modifiers = ts.getModifiers(current);
      if (modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        return true;
      }
    }
    current = current.parent;
  }

  return false;
}

/**
 * 코드 시작 오프셋 가져오기 (하이라이팅용)
 */
export function getCodeStartOffset(func: TSFunctionAnalysis): number {
  const { astNode, sourceFile } = func;
  return astNode.getStart(sourceFile);
}
