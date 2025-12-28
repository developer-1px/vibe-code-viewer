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
import { resolvePath } from '../utils/pathResolver';

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
 * Re-export 파일에서 실제 구현 파일로 연결
 *
 * 예: index.ts → Sidebar.tsx (실제 파일)
 */
function resolveReExport(
  filePath: string,
  name: string,
  files: Record<string, string>
): string {
  // 기본값
  const defaultId = `${filePath}::${name}`;

  // index 파일이 아니면 그대로 반환
  if (!filePath.endsWith('/index.ts') && !filePath.endsWith('/index.tsx')) {
    return defaultId;
  }

  // index 파일인 경우, 같은 폴더에서 동일한 이름의 파일 찾기
  // 예: src/widgets/Sidebar/index.ts → src/widgets/Sidebar/Sidebar.tsx
  const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
  const folderName = dirPath.split('/').pop();

  // 가능한 파일 확장자들
  const possibleFiles = [
    `${dirPath}/${name}.tsx`,
    `${dirPath}/${name}.ts`,
    `${dirPath}/${folderName}.tsx`,
    `${dirPath}/${folderName}.ts`,
  ];

  for (const possibleFile of possibleFiles) {
    if (files[possibleFile]) {
      console.log(`🔄 [externalRefAnalyzer] Resolved re-export: ${filePath} → ${possibleFile}`);
      return `${possibleFile}::${name}`;
    }
  }

  // 찾지 못하면 기본값 반환
  return defaultId;
}

/**
 * 최상위 statement 노드 가져오기
 * (getCodeSnippet과 동일한 로직)
 */
function getStatementNode(node: ts.Node, sourceFile: ts.SourceFile): ts.Node {
  let statementNode: ts.Node = node;
  let current = node.parent;

  while (current && !ts.isSourceFile(current)) {
    if (ts.isStatement(current) && current.parent && ts.isSourceFile(current.parent)) {
      statementNode = current;
      break;
    }
    current = current.parent;
  }

  return statementNode;
}

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

  // 2. 파라미터와 리턴 타입의 타입 참조 추출
  // 상위 statement까지 올라가서 변수 타입 어노테이션도 포함
  const statementNode = getStatementNode(funcAnalysis.astNode, funcAnalysis.sourceFile);
  visitTypeReferences(statementNode, (identifier) => {
    const name = identifier.text;

    console.log(`🔍 [externalRefAnalyzer] Found type reference in ${funcAnalysis.name}: ${name}`);

    // 이미 처리됨
    if (refs.has(name)) {
      const ref = refs.get(name)!;
      ref.usages.push(createTokenUsage(identifier, 'type', sourceFile));
      return;
    }

    // 외부 참조 타입 결정
    const refType = determineRefType(name, fileContext);

    if (refType) {
      console.log(`✅ [externalRefAnalyzer] Type reference ${name} in ${funcAnalysis.name}: ${refType}`);
      const ref: ExternalReference = {
        name,
        refType,
        source: getSource(name, refType, fileContext),
        definedIn: getDefinedIn(name, refType, fileContext),
        usages: [createTokenUsage(identifier, 'type', sourceFile)],
        isFunction: getIsFunction(name, refType, fileContext),
      };
      refs.set(name, ref);
    } else {
      console.log(`❌ [externalRefAnalyzer] Type reference ${name} in ${funcAnalysis.name}: not found in context`);
    }
  });

  // 3. 함수 body의 모든 식별자 방문
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
          isFunction: getIsFunction(name, refType, fileContext),
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
 * 함수 변수 여부 가져오기
 */
function getIsFunction(
  name: string,
  refType: ExternalRefType,
  fileContext: FileContext
): boolean | undefined {
  if (refType === 'file-level') {
    const variable = fileContext.fileVariables.get(name);
    if (variable) {
      console.log(`🔍 [externalRefAnalyzer] ${name}: refType=${refType}, isFunction=${variable.isFunction}`);
      return variable.isFunction;
    }
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
      // 상대 경로를 절대 경로로 해결
      const resolvedPath = resolvePath(fileContext.filePath, importInfo.source, fileContext.files);
      if (resolvedPath) {
        // Re-export 체크: index.ts에서 re-export하는 경우 실제 파일 찾기
        const actualDefinedIn = resolveReExport(resolvedPath, name, fileContext.files);
        console.log(`🔗 [externalRefAnalyzer] Import ${name} from ${importInfo.source} → ${actualDefinedIn}`);
        return actualDefinedIn;
      }
      // 해결 실패 시 원래 source 사용
      console.log(`⚠️ [externalRefAnalyzer] Import ${name}: path resolution failed, using source: ${importInfo.source}`);
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
 * 타입 참조만 방문 (파라미터, 리턴 타입, 타입 어노테이션 등)
 */
function visitTypeReferences(
  node: ts.Node,
  callback: (identifier: ts.Identifier) => void
): void {
  const visit = (node: ts.Node) => {
    // 타입 참조 노드
    if (ts.isTypeReferenceNode(node)) {
      if (ts.isIdentifier(node.typeName)) {
        callback(node.typeName);
      } else if (ts.isQualifiedName(node.typeName)) {
        // 예: React.FC -> React만 추출
        let current = node.typeName;
        while (ts.isQualifiedName(current)) {
          if (ts.isIdentifier(current.left)) {
            callback(current.left);
            break;
          }
          current = current.left as ts.QualifiedName;
        }
      }
    }

    ts.forEachChild(node, visit);
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
