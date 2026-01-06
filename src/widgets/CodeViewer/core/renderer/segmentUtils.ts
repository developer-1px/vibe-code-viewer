/**
 * Segment 처리 관련 순수 함수들
 */

import * as ts from 'typescript';

/**
 * Segment의 고유 키 생성
 */
export function getSegmentKey(start: number, end: number): string {
  return `${start}-${end}`;
}

/**
 * 노드에서 짧은 ID 추출 (파일명 또는 함수명)
 */
export function extractShortId(nodeId: string): string {
  return nodeId.includes('::')
    ? nodeId.split('::').pop() || ''
    : nodeId
        .split('/')
        .pop()
        ?.replace(/\.(tsx?|jsx?|vue)$/, '') || '';
}

/**
 * dependencies 배열에서 dependency map 생성
 */
export function createDependencyMap(dependencies: string[] = []): Map<string, string> {
  const map = new Map<string, string>();
  dependencies.forEach((dep) => {
    const name = dep.split('::').pop();
    if (name) map.set(name, dep);
  });
  return map;
}

/**
 * 파일 확장자로부터 TSX 여부 확인
 */
export function isTsxFile(filePath?: string): boolean {
  return filePath?.endsWith('.tsx') || filePath?.endsWith('.jsx') || false;
}

/**
 * BindingName에서 모든 identifier 추출 (destructuring 지원)
 */
function extractBindingIdentifiers(bindingName: ts.BindingName, identifiers: Set<string>) {
  if (ts.isIdentifier(bindingName)) {
    identifiers.add(bindingName.text);
  } else if (ts.isObjectBindingPattern(bindingName)) {
    // const { a, b: c } = obj;
    bindingName.elements.forEach((element) => {
      extractBindingIdentifiers(element.name, identifiers);
    });
  } else if (ts.isArrayBindingPattern(bindingName)) {
    // const [a, b] = arr;
    bindingName.elements.forEach((element) => {
      if (ts.isBindingElement(element)) {
        extractBindingIdentifiers(element.name, identifiers);
      }
    });
  }
}

/**
 * SourceFile에서 local identifiers 추출
 */
export function extractLocalIdentifiers(sourceFile: ts.SourceFile): Set<string> {
  const localIdentifiers = new Set<string>();

  function visit(node: ts.Node) {
    // Declaration 노드 체크
    if (
      ts.isVariableStatement(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isModuleDeclaration(node)
    ) {
      // 선언 이름 추출
      if (ts.isVariableStatement(node)) {
        // VariableStatement은 여러 declaration을 가질 수 있음
        node.declarationList.declarations.forEach((declaration) => {
          extractBindingIdentifiers(declaration.name, localIdentifiers);
        });
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isInterfaceDeclaration(node)) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isTypeAliasDeclaration(node)) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isEnumDeclaration(node)) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isModuleDeclaration(node)) {
        localIdentifiers.add((node.name as ts.Identifier).text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return localIdentifiers;
}

/**
 * Declaration 노드인지 확인
 */
export function isDeclarationNode(node: ts.Node): boolean {
  return (
    ts.isVariableStatement(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node)
  );
}

/**
 * Declaration 노드에서 이름 추출
 */
export function getDeclarationName(node: ts.Node): ts.Identifier | undefined {
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (declaration && ts.isIdentifier(declaration.name)) {
      return declaration.name;
    }
  } else if (ts.isFunctionDeclaration(node) && node.name) {
    return node.name;
  } else if (ts.isInterfaceDeclaration(node)) {
    return node.name;
  } else if (ts.isTypeAliasDeclaration(node)) {
    return node.name;
  } else if (ts.isClassDeclaration(node) && node.name) {
    return node.name;
  } else if (ts.isEnumDeclaration(node)) {
    return node.name;
  } else if (ts.isModuleDeclaration(node)) {
    return node.name as ts.Identifier;
  }
  return undefined;
}

/**
 * JSX 태그 이름인지 확인
 */
export function isJsxTagName(node: ts.Node, parent: ts.Node): boolean {
  return (
    (ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent) || ts.isJsxClosingElement(parent)) &&
    (parent as any).tagName === node
  );
}

/**
 * Property access의 name인지 확인
 */
export function isPropertyAccessName(node: ts.Node, parent: ts.Node): boolean {
  return (ts.isPropertyAccessExpression(parent) || ts.isPropertyAccessChain(parent)) && (parent as any).name === node;
}

/**
 * Property key인지 확인
 */
export function isPropertyKey(node: ts.Node, parent: ts.Node): boolean {
  return ts.isPropertyAssignment(parent) && parent.name === node;
}

/**
 * Identifier를 스킵해야 하는지 확인
 */
export function shouldSkipIdentifier(node: ts.Node, parent: ts.Node): boolean {
  const isJsxTag = isJsxTagName(node, parent);
  const isPropertyAccess = isPropertyAccessName(node, parent);
  const isPropertyK = isPropertyKey(node, parent);

  return !isJsxTag && (isPropertyAccess || isPropertyK);
}

/**
 * SourceFile에서 모든 함수 파라미터 추출 (destructuring 지원)
 * @deprecated Use extractASTMetadata() instead for better performance (Phase 3-A)
 */
export function extractParametersFromAST(sourceFile: ts.SourceFile): Set<string> {
  const parameters = new Set<string>();

  function visit(node: ts.Node) {
    // 함수 선언, 함수 표현식, 화살표 함수 등
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      // 파라미터 추출
      node.parameters.forEach((param) => {
        extractBindingIdentifiers(param.name, parameters);
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return parameters;
}

/**
 * Phase 3-A: Combined metadata extraction (2 traversals → 1 traversal)
 * Extracts both parameters and local identifiers in a single AST pass
 * Performance: ~50% faster than calling extractParametersFromAST + extractLocalIdentifiers separately
 */
export interface ASTMetadata {
  parameters: Set<string>;
  localIdentifiers: Set<string>;
}

export function extractASTMetadata(sourceFile: ts.SourceFile): ASTMetadata {
  const parameters = new Set<string>();
  const localIdentifiers = new Set<string>();

  function visit(node: ts.Node) {
    // Extract parameters from function-like nodes
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      node.parameters.forEach((param) => {
        extractBindingIdentifiers(param.name, parameters);
      });
    }

    // Extract local identifiers from declarations
    if (
      ts.isVariableStatement(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isModuleDeclaration(node)
    ) {
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((declaration) => {
          extractBindingIdentifiers(declaration.name, localIdentifiers);
        });
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isInterfaceDeclaration(node)) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isTypeAliasDeclaration(node)) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isEnumDeclaration(node)) {
        localIdentifiers.add(node.name.text);
      } else if (ts.isModuleDeclaration(node)) {
        localIdentifiers.add(node.name.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { parameters, localIdentifiers };
}
