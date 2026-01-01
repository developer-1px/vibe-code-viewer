/**
 * AST 순회 중 특정 노드를 처리하는 Hook 함수들
 */

import * as ts from 'typescript';
import type { CodeLine, SegmentKind } from '../types/codeLine';
import { isDeclarationNode, getDeclarationName } from './segmentUtils';

export type AddKindFunction = (
  start: number,
  end: number,
  kind: SegmentKind,
  nodeId?: string,
  isDeclarationNameOrDefinedIn?: boolean | string,
  tsNode?: ts.Node
) => void;

/**
 * BindingName에서 모든 identifier 순회 (destructuring 지원)
 */
function forEachBindingIdentifier(
  bindingName: ts.BindingName,
  sourceFile: ts.SourceFile,
  callback: (id: ts.Identifier) => void
): void {
  if (ts.isIdentifier(bindingName)) {
    callback(bindingName);
  } else if (ts.isObjectBindingPattern(bindingName)) {
    // const { a, b: c } = obj;
    bindingName.elements.forEach(element => {
      forEachBindingIdentifier(element.name, sourceFile, callback);
    });
  } else if (ts.isArrayBindingPattern(bindingName)) {
    // const [a, b] = arr;
    bindingName.elements.forEach(element => {
      if (ts.isBindingElement(element)) {
        forEachBindingIdentifier(element.name, sourceFile, callback);
      }
    });
  }
}

/**
 * Check if node is exported
 */
function isExportedNode(node: ts.Node): boolean {
  const modifiers = (node as any).modifiers;
  const parent = node.parent;

  // Method 1: Check modifiers property directly (works for all TS versions)
  if (modifiers && Array.isArray(modifiers)) {
    if (modifiers.some((mod: any) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
      return true;
    }
  }

  // Method 2: Use ts.canHaveModifiers and ts.getModifiers (newer TS versions)
  if (ts.canHaveModifiers && ts.canHaveModifiers(node)) {
    const mods = ts.getModifiers && ts.getModifiers(node);
    if (mods && mods.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
      return true;
    }
  }

  // Method 3: Check if parent is export declaration/assignment
  if (parent) {
    if (ts.isExportDeclaration(parent) || ts.isExportAssignment(parent)) {
      return true;
    }
  }

  return false;
}

/**
 * Hook 0: Declaration 노드 처리
 * - hasDeclarationKeyword 플래그 설정 (export된 선언만)
 * - Declaration 이름에 'self' kind 추가
 * - Local identifier로 등록
 * - declarationMap에 이름→라인 번호 저장 (export default 처리용)
 */
export function processDeclarationNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  result: CodeLine[],
  localIdentifiers: Set<string>,
  declarationMap: Map<string, number>,
  addKind: AddKindFunction
): void {
  const start = node.getStart(sourceFile);
  const pos = sourceFile.getLineAndCharacterOfPosition(start);
  const lineIdx = pos.line;

  if (!isDeclarationNode(node)) return;
  if (lineIdx < 0 || lineIdx >= result.length) return;

  // Output Port는 export된 선언에만 표시
  const isExported = isExportedNode(node);
  if (isExported) {
    result[lineIdx].hasDeclarationKeyword = true; // Output Port 표시용
  }

  // 선언 이름 추출 및 glow 표시
  if (ts.isVariableStatement(node)) {
    // VariableStatement은 여러 declaration을 가질 수 있고, destructuring도 지원
    node.declarationList.declarations.forEach(declaration => {
      forEachBindingIdentifier(declaration.name, sourceFile, id => {
        const nameStart = id.getStart(sourceFile);
        const nameEnd = id.getEnd();
        addKind(nameStart, nameEnd, 'self', undefined, true, id); // isDeclarationName = true
        localIdentifiers.add(id.text);
        declarationMap.set(id.text, lineIdx); // Store declaration location
      });
    });
  } else {
    // 다른 declaration은 단일 identifier
    const declarationName = getDeclarationName(node);
    if (declarationName) {
      const nameStart = declarationName.getStart(sourceFile);
      const nameEnd = declarationName.getEnd();
      addKind(nameStart, nameEnd, 'self', undefined, true, declarationName); // isDeclarationName = true
      localIdentifiers.add(declarationName.text);
      declarationMap.set(declarationName.text, lineIdx); // Store declaration location
    }
  }
}

/**
 * Hook 1: Template literal 특수 처리
 * - TemplateHead: `text${ → `text` (string) + ${ (punctuation)
 * - TemplateMiddle: }text${ → } + text + ${
 * - TemplateTail: }text` → } + text`
 *
 * @returns true if processed, false otherwise
 */
export function processTemplateLiteral(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  addKind: AddKindFunction
): boolean {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();

  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node)) {
    const text = node.getText(sourceFile);

    if (ts.isTemplateMiddle(node)) {
      // } 부분은 punctuation
      addKind(start, start + 1, 'punctuation');
      // 중간 텍스트는 string
      if (text.length > 3) { // } + text + ${
        addKind(start + 1, end - 2, 'string');
      }
      // ${ 부분은 punctuation
      addKind(end - 2, end, 'punctuation');
    } else {
      // TemplateHead: text${
      // 텍스트 부분은 string (backtick 포함)
      addKind(start, end - 2, 'string');
      // ${ 부분은 punctuation
      addKind(end - 2, end, 'punctuation');
    }
    return true;
  } else if (ts.isTemplateTail(node)) {
    const text = node.getText(sourceFile);
    // } 부분은 punctuation
    addKind(start, start + 1, 'punctuation');
    // 나머지 텍스트와 backtick은 string
    if (text.length > 1) {
      addKind(start + 1, end, 'string');
    }
    return true;
  }

  return false;
}

/**
 * Hook 2: Identifier 분류 및 처리
 */
export function processIdentifier(
  node: ts.Identifier,
  sourceFile: ts.SourceFile,
  nodeShortId: string,
  nodeId: string,
  filePath: string,
  parameters: Set<string>,
  localVars: Set<string>,
  localIdentifiers: Set<string>,
  dependencyMap: Map<string, string>,
  files: Record<string, string>,
  getImportSource: (node: any, name: string, files: Record<string, string>, resolvePath: any) => string | null,
  resolvePath: (from: string, to: string, files: Record<string, string>) => string | null,
  addKind: AddKindFunction
): void {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const name = node.text;

  // Self reference (사용처)
  if (name === nodeShortId) {
    addKind(start, end, 'local-variable', nodeId, undefined, node); // 사용처는 local-variable로
    addKind(start, end, 'identifier', undefined, undefined, node);
  }

  // Parameter detection (includes destructured parameters)
  const isParameter = parameters.has(name) || isDestructuredParameter(node);
  if (isParameter) {
    addKind(start, end, 'parameter', undefined, undefined, node);
    addKind(start, end, 'identifier', undefined, undefined, node);
  }

  // Local variable (다른 local variable 사용처)
  if (localVars.has(name)) {
    addKind(start, end, 'local-variable', undefined, undefined, node);
    addKind(start, end, 'identifier', undefined, undefined, node);
  }

  // External reference 처리 (getter 함수 사용)
  const importSource = getImportSource(
    { id: nodeId, filePath, sourceFile } as any,
    name,
    files,
    resolvePath
  );

  if (importSource) {
    const isNpm = importSource.startsWith('npm:');
    const kind: SegmentKind = isNpm ? 'identifier' : 'external-import';
    addKind(start, end, kind, undefined, importSource, node);
    addKind(start, end, 'identifier', importSource, undefined, node);
  } else if (dependencyMap.has(name)) {
    // Fallback: dependency 기반
    const depId = dependencyMap.get(name)!;
    addKind(start, end, 'external-import', undefined, depId, node);
    addKind(start, end, 'identifier', depId, undefined, node);
  } else if (localIdentifiers.has(name)) {
    addKind(start, end, 'identifier', undefined, undefined, node);
  }
}

/**
 * Check if an identifier is a destructured parameter
 * Example: ({node}) => { ... } - "node" should be detected as parameter
 */
function isDestructuredParameter(identifier: ts.Identifier): boolean {
  const parent = (identifier as any).parent;

  // Check if this identifier is inside a BindingElement
  if (ts.isBindingElement(parent)) {
    // Walk up to find if this is part of a function parameter
    let current: ts.Node = parent;
    while (current) {
      // If we find an ObjectBindingPattern or ArrayBindingPattern
      if (ts.isObjectBindingPattern(current) || ts.isArrayBindingPattern(current)) {
        const bindingParent = (current as any).parent;
        // Check if the binding pattern's parent is a Parameter
        if (ts.isParameter(bindingParent)) {
          return true;
        }
      }
      current = (current as any).parent;
      // Stop if we've gone too far up the tree
      if (!current || ts.isFunctionLike(current)) {
        break;
      }
    }
  }

  return false;
}

/**
 * Hook 3: Export Declaration 처리
 * - export { foo, bar } 형태의 export 문 감지
 * - 각 export되는 식별자에 대해 exportSlots 추가
 * - 나중에 nodeId를 찾아서 매핑 (현재는 이름만 저장)
 */
export function processExportDeclaration(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  result: CodeLine[],
  filePath: string
): void {
  if (!ts.isExportDeclaration(node)) return;

  const exportClause = node.exportClause;
  if (!exportClause || !ts.isNamedExports(exportClause)) return;

  const start = node.getStart(sourceFile);
  const pos = sourceFile.getLineAndCharacterOfPosition(start);
  const lineIdx = pos.line;

  if (lineIdx < 0 || lineIdx >= result.length) return;

  // Initialize exportSlots array if not exists
  if (!result[lineIdx].exportSlots) {
    result[lineIdx].exportSlots = [];
  }

  // Process each exported identifier: export { foo, bar as baz }
  exportClause.elements.forEach(element => {
    const name = element.name.text;
    const elementStart = element.name.getStart(sourceFile);
    const offset = sourceFile.getLineAndCharacterOfPosition(elementStart).character;

    // TODO: nodeId 매핑은 나중에 추가 (원본 선언을 찾아서 연결)
    // 현재는 이름만 저장
    result[lineIdx].exportSlots!.push({
      name,
      offset,
      // nodeId will be resolved later
    });
  });
}

/**
 * Hook 4: Export Default 처리
 * - export default Identifier 형태의 export 문 감지
 * - 해당 identifier의 원본 선언 라인을 찾아서 hasDeclarationKeyword 설정
 */
export function processExportDefault(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  result: CodeLine[],
  declarationMap: Map<string, number>
): void {
  // Check if this is export default
  if (!ts.isExportAssignment(node)) return;

  // Get the exported identifier
  const expression = node.expression;
  if (!ts.isIdentifier(expression)) return;

  const exportedName = expression.text;

  // Find the declaration line for this identifier
  const declarationLineIdx = declarationMap.get(exportedName);

  if (declarationLineIdx !== undefined && declarationLineIdx >= 0 && declarationLineIdx < result.length) {
    result[declarationLineIdx].hasDeclarationKeyword = true;
  }
}
