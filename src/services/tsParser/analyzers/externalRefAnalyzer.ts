/**
 * 외부 참조 분석기 ⭐CORE
 *
 * 함수 내에서 사용되는 모든 식별자를 분석하여,
 * 로컬 변수가 아닌 "외부 참조"를 식별
 *
 * 외부 참조 정의:
 * - Import된 모듈
 * - 파일 레벨 변수/함수
 * - Closure (상위 스코프 변수)
 * - Global 객체 (console, Math 등)
 *
 * ❌ 로컬 변수는 외부 참조가 아님:
 * - 함수 파라미터
 * - 함수 내부 선언 변수
 */

import * as ts from 'typescript';
import {
  ExternalReference,
  ExternalRefType,
  TokenUsage,
  FileContext,
  TSFunctionAnalysis,
} from '../types';
import { getParameters, getLocalVariables } from '../utils/astGetters';

// 글로벌 객체 목록 (외부 참조로 간주하지만 별도 표시)
const GLOBAL_OBJECTS = new Set([
  'console',
  'Math',
  'Date',
  'JSON',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'RegExp',
  'Error',
  'Promise',
  'Set',
  'Map',
  'WeakSet',
  'WeakMap',
  'Symbol',
  'Proxy',
  'Reflect',
  'Intl',
  'window',
  'document',
  'navigator',
  'location',
  'fetch',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'localStorage',
  'sessionStorage',
]);

/**
 * 함수의 외부 참조 분석
 */
export function analyzeExternalReferences(
  funcAnalysis: TSFunctionAnalysis,
  fileContext: FileContext,
  sourceFile: ts.SourceFile
): ExternalReference[] {
  const refs = new Map<string, ExternalReference>();

  // 1. 로컬 스코프 수집 (getter 함수 사용)
  const localScope = new Set<string>([
    ...getParameters(funcAnalysis),
    ...getLocalVariables(funcAnalysis),
  ]);

  // 2. 함수 body의 모든 식별자 방문
  if (funcAnalysis.astNode.body) {
    visitIdentifiers(funcAnalysis.astNode.body, (identifier, context) => {
      const name = identifier.text;

      // 로컬 변수면 스킵
      if (localScope.has(name)) return;

      // 이미 처리된 외부 참조면 usage만 추가
      if (refs.has(name)) {
        const ref = refs.get(name)!;
        ref.usages.push(createTokenUsage(identifier, context, sourceFile));
        return;
      }

      // 외부 참조 타입 결정
      const refType = determineRefType(name, fileContext);

      if (refType) {
        // 외부 참조 생성
        const ref: ExternalReference = {
          name,
          refType,
          source: getSource(name, refType, fileContext),
          definedIn: getDefinedIn(name, refType, fileContext),
          usages: [createTokenUsage(identifier, context, sourceFile)],
        };
        refs.set(name, ref);
      }
    });
  }

  return Array.from(refs.values());
}

/**
 * 외부 참조 타입 결정
 */
function determineRefType(
  name: string,
  fileContext: FileContext
): ExternalRefType | null {
  // 1. Import에서 찾기
  if (fileContext.imports.has(name)) {
    return 'import';
  }

  // 2. 파일 레벨 변수에서 찾기
  if (fileContext.fileVariables.has(name)) {
    return 'file-level';
  }

  // 3. 같은 파일의 다른 함수에서 찾기
  if (fileContext.allFunctions.has(name)) {
    return 'file-level';
  }

  // 4. Global 객체
  if (GLOBAL_OBJECTS.has(name)) {
    return 'global';
  }

  // TODO: Closure detection (중첩 함수의 경우 상위 함수 변수)
  // 현재는 파일 레벨만 지원, 중첩 함수는 Phase 2에서

  // 알 수 없는 참조는 null
  return null;
}

/**
 * Source 정보 가져오기
 */
function getSource(
  name: string,
  refType: ExternalRefType,
  fileContext: FileContext
): string | undefined {
  if (refType === 'import') {
    const importInfo = fileContext.imports.get(name);
    return importInfo?.source;
  }
  return undefined;
}

/**
 * 정의 위치 가져오기
 */
function getDefinedIn(
  name: string,
  refType: ExternalRefType,
  fileContext: FileContext
): string | undefined {
  if (refType === 'file-level') {
    const variable = fileContext.fileVariables.get(name);
    if (variable) return variable.id;

    const func = fileContext.allFunctions.get(name);
    if (func) return func.id;
  }

  if (refType === 'import') {
    const importInfo = fileContext.imports.get(name);
    if (importInfo) {
      return `${importInfo.source}::${name}`;
    }
  }

  return undefined;
}

/**
 * TokenUsage 생성
 */
function createTokenUsage(
  identifier: ts.Identifier,
  context: 'call' | 'reference' | 'member' | 'type',
  sourceFile: ts.SourceFile
): TokenUsage {
  const start = identifier.getStart(sourceFile);
  const end = identifier.getEnd();
  const pos = sourceFile.getLineAndCharacterOfPosition(start);

  return {
    name: identifier.text,
    start,
    end,
    line: pos.line + 1,
    column: pos.character,
    context,
  };
}

/**
 * AST의 모든 식별자 방문
 */
function visitIdentifiers(
  node: ts.Node,
  callback: (identifier: ts.Identifier, context: TokenUsage['context']) => void
): void {
  const visit = (node: ts.Node, parentContext?: ts.Node) => {
    if (ts.isIdentifier(node)) {
      // 식별자 컨텍스트 판단
      const context = getIdentifierContext(node, parentContext);
      if (context) {
        callback(node, context);
      }
      return;
    }

    ts.forEachChild(node, (child) => visit(child, node));
  };

  visit(node);
}

/**
 * 식별자 사용 컨텍스트 판단
 */
function getIdentifierContext(
  identifier: ts.Identifier,
  parent?: ts.Node
): TokenUsage['context'] | null {
  if (!parent) return 'reference';

  // 함수 호출: foo()
  if (
    ts.isCallExpression(parent) &&
    parent.expression === identifier
  ) {
    return 'call';
  }

  // 멤버 접근: obj.foo
  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.name === identifier
  ) {
    // 오른쪽 (프로퍼티 이름)은 참조가 아님
    return null;
  }

  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === identifier
  ) {
    // 왼쪽 (객체)은 멤버 컨텍스트
    return 'member';
  }

  // 타입 참조: foo: Foo
  if (ts.isTypeReferenceNode(parent)) {
    return 'type';
  }

  // 프로퍼티 선언/할당의 키는 스킵
  if (
    (ts.isPropertyAssignment(parent) && parent.name === identifier) ||
    (ts.isPropertyDeclaration(parent) && parent.name === identifier)
  ) {
    return null;
  }

  // 기본: 참조
  return 'reference';
}

/**
 * 로컬 변수 추출 (함수 body 내부에서 선언된 변수들)
 */
export function extractLocalVariables(
  functionBody: ts.Node
): Set<string> {
  const localVars = new Set<string>();

  const visit = (node: ts.Node) => {
    // 변수 선언
    if (ts.isVariableDeclaration(node)) {
      extractVariableNames(node.name, localVars);
    }

    // 중첩 함수 선언 (중첩 함수는 로컬 변수로 간주)
    if (
      ts.isFunctionDeclaration(node) &&
      node.name
    ) {
      localVars.add(node.name.text);
      // 중첩 함수 내부는 탐색하지 않음
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(functionBody);
  return localVars;
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
    name.elements.forEach((element) => {
      extractVariableNames(element.name, names);
    });
  } else if (ts.isArrayBindingPattern(name)) {
    name.elements.forEach((element) => {
      if (ts.isBindingElement(element)) {
        extractVariableNames(element.name, names);
      }
    });
  }
}
