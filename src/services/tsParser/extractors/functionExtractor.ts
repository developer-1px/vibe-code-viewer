/**
 * 함수 추출기
 *
 * TypeScript AST에서 모든 함수 선언을 추출하고 기본 정보를 수집
 */

import * as ts from 'typescript';
import { TSFunctionAnalysis } from '../types';

/**
 * 파일에서 모든 함수 추출
 */
export function extractFunctions(
  sourceFile: ts.SourceFile,
  filePath: string
): TSFunctionAnalysis[] {
  const functions: TSFunctionAnalysis[] = [];

  // 파일 레벨 함수만 추출 (중첩 함수는 나중에 처리)
  ts.forEachChild(sourceFile, (node) => {
    if (isFunctionLike(node)) {
      const funcAnalysis = createFunctionAnalysis(node, sourceFile, filePath);
      if (funcAnalysis) {
        functions.push(funcAnalysis);
      }
    }

    // 변수 선언에 함수 할당: const foo = () => {}
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((decl) => {
        if (decl.initializer && isFunctionLike(decl.initializer)) {
          const funcAnalysis = createFunctionAnalysis(
            decl.initializer,
            sourceFile,
            filePath,
            ts.isIdentifier(decl.name) ? decl.name.text : undefined
          );
          if (funcAnalysis) {
            functions.push(funcAnalysis);
          }
        }
      });
    }

    // export default function 또는 export default () => {}
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const expression = node.expression;

      // export default function Foo() {}
      if (ts.isFunctionDeclaration(expression) || ts.isFunctionExpression(expression)) {
        const funcAnalysis = createFunctionAnalysis(
          expression,
          sourceFile,
          filePath
        );
        if (funcAnalysis) {
          functions.push(funcAnalysis);
        }
      }
      // export default () => {}
      else if (ts.isArrowFunction(expression)) {
        const funcAnalysis = createFunctionAnalysis(
          expression,
          sourceFile,
          filePath,
          'default'
        );
        if (funcAnalysis) {
          functions.push(funcAnalysis);
        }
      }
      // export default SomeFunction (identifier)
      else if (ts.isIdentifier(expression)) {
        // 이미 함수로 추출되었을 것이므로 나중에 처리
      }
    }
  });

  return functions;
}

/**
 * 함수 분석 객체 생성 - AST 노드 기반
 */
function createFunctionAnalysis(
  node: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile,
  filePath: string,
  overrideName?: string
): TSFunctionAnalysis | null {
  // 함수 이름 결정
  let name: string;
  if (overrideName) {
    name = overrideName;
  } else if (
    (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
    node.name
  ) {
    name = node.name.text;
  } else if (ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
    // Arrow function은 변수 이름에서 가져와야 함 (overrideName)
    // Method는 parent에서 처리
    return null;
  } else {
    name = 'anonymous';
  }

  // AST 노드만 저장하고, 나머지는 런타임에 계산
  return {
    name,
    id: `${filePath}::${name}`,
    filePath,
    astNode: node,
    sourceFile,

    // 분석 결과 (나중에 채워질 것)
    externalRefs: [],
    callsTo: [],
    calledBy: [],

    // 메타데이터 (나중에 분석)
    isPure: false,
    hasSideEffects: false,
  };
}

/**
 * 함수 유사 노드 판별
 */
function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  );
}

// 불필요한 헬퍼 함수 제거 - AST에서 직접 가져옴

/**
 * 함수 Map 생성 (name → TSFunctionAnalysis)
 */
export function createFunctionMap(
  functions: TSFunctionAnalysis[]
): Map<string, TSFunctionAnalysis> {
  const map = new Map<string, TSFunctionAnalysis>();
  functions.forEach((f) => map.set(f.name, f));
  return map;
}
