/**
 * AST 순회 중 특정 노드를 처리하는 Hook 함수들
 */

import * as ts from 'typescript';
import type { CodeLine, SegmentKind } from '../model/types';
import { isDeclarationNode, getDeclarationName } from './segmentUtils';

export type AddKindFunction = (
  start: number,
  end: number,
  kind: SegmentKind,
  nodeId?: string,
  isDeclarationNameOrDefinedIn?: boolean | string
) => void;

/**
 * Hook 0: Declaration 노드 처리
 * - hasDeclarationKeyword 플래그 설정
 * - Declaration 이름에 'self' kind 추가
 * - Local identifier로 등록
 */
export function processDeclarationNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  result: CodeLine[],
  localIdentifiers: Set<string>,
  addKind: AddKindFunction
): void {
  const start = node.getStart(sourceFile);
  const pos = sourceFile.getLineAndCharacterOfPosition(start);
  const lineIdx = pos.line;

  if (!isDeclarationNode(node)) return;
  if (lineIdx < 0 || lineIdx >= result.length) return;

  result[lineIdx].hasDeclarationKeyword = true; // Output Port 표시용

  // 선언 이름 추출 및 glow 표시
  const declarationName = getDeclarationName(node);

  if (declarationName) {
    const nameStart = declarationName.getStart(sourceFile);
    const nameEnd = declarationName.getEnd();

    addKind(nameStart, nameEnd, 'self', undefined, true); // isDeclarationName = true

    // Local identifier로 등록
    localIdentifiers.add(declarationName.text);
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

  // Self reference
  if (name === nodeShortId) {
    addKind(start, end, 'self', nodeId);
    addKind(start, end, 'identifier');
  }

  // Parameter
  if (parameters.has(name)) {
    addKind(start, end, 'parameter');
    addKind(start, end, 'identifier');
  }

  // Local variable
  if (localVars.has(name)) {
    addKind(start, end, 'local-variable');
    addKind(start, end, 'identifier');
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
    addKind(start, end, kind, undefined, importSource);
    addKind(start, end, 'identifier', importSource);
  } else if (dependencyMap.has(name)) {
    // Fallback: dependency 기반
    const depId = dependencyMap.get(name)!;
    addKind(start, end, 'external-import', undefined, depId);
    addKind(start, end, 'identifier', depId);
  } else if (localIdentifiers.has(name)) {
    addKind(start, end, 'identifier');
  }
}
