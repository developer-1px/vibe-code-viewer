/**
 * 함수 호출 그래프 빌더 ⭐CORE
 *
 * 함수들 간의 호출 관계를 분석하여 그래프 생성
 */

import * as ts from 'typescript';
import {
  TSFunctionAnalysis,
  FunctionCall,
  CallGraph,
  CallGraphEdge,
  TokenUsage,
} from '../types';

/**
 * 함수 호출 정보 추출
 */
export function extractFunctionCalls(
  funcAnalysis: TSFunctionAnalysis,
  functionMap: Map<string, TSFunctionAnalysis>,
  sourceFile: ts.SourceFile
): FunctionCall[] {
  const calls: FunctionCall[] = [];

  if (!funcAnalysis.astNode.body) return calls;

  // 함수 body의 모든 CallExpression 찾기
  visitCallExpressions(funcAnalysis.astNode.body, (callExpr) => {
    const calledName = getCalleeName(callExpr);
    if (!calledName) return;

    // 같은 파일의 다른 함수인지 확인
    const calledFunc = functionMap.get(calledName);
    const isDirectCall = ts.isIdentifier(callExpr.expression);

    const call: FunctionCall = {
      callerFunctionId: funcAnalysis.id,
      calledFunctionName: calledName,
      calledFunctionId: calledFunc?.id,
      callSite: createTokenUsage(callExpr, sourceFile),
      isDirectCall,
    };

    calls.push(call);
  });

  return calls;
}

/**
 * CallExpression에서 호출되는 함수 이름 추출
 */
function getCalleeName(callExpr: ts.CallExpression): string | null {
  const expr = callExpr.expression;

  // 직접 호출: foo()
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }

  // 멤버 호출: obj.foo()
  if (ts.isPropertyAccessExpression(expr)) {
    // 체이닝된 경우 마지막 이름만 사용
    return expr.name.text;
  }

  // 복잡한 표현식은 null
  return null;
}

/**
 * AST의 모든 CallExpression 방문
 */
function visitCallExpressions(
  node: ts.Node,
  callback: (callExpr: ts.CallExpression) => void
): void {
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      callback(node);
    }

    // 중첩 함수는 방문하지 않음 (현재 함수의 직접 호출만)
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(node);
}

/**
 * TokenUsage 생성
 */
function createTokenUsage(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile
): TokenUsage {
  const start = callExpr.expression.getStart(sourceFile);
  const end = callExpr.expression.getEnd();
  const pos = sourceFile.getLineAndCharacterOfPosition(start);

  const name = ts.isIdentifier(callExpr.expression)
    ? callExpr.expression.text
    : callExpr.expression.getText(sourceFile);

  return {
    name,
    start,
    end,
    line: pos.line + 1,
    column: pos.character,
    context: 'call',
  };
}

/**
 * 전역 함수 호출 그래프 생성
 */
export function buildCallGraph(
  allFunctions: Map<string, TSFunctionAnalysis>
): CallGraph {
  const nodes = new Map<string, TSFunctionAnalysis>();
  const edges: CallGraphEdge[] = [];

  // 1. 모든 함수의 호출 정보에서 엣지 생성
  allFunctions.forEach((func) => {
    nodes.set(func.id, func);

    func.functionCalls.forEach((call) => {
      if (call.calledFunctionId) {
        // 호출되는 함수가 식별된 경우만 엣지 추가
        edges.push({
          from: call.callerFunctionId,
          to: call.calledFunctionId,
          callSite: call.callSite,
        });
      }
    });
  });

  // 2. 역방향 관계 구축 (calledBy)
  edges.forEach((edge) => {
    const calledFunc = allFunctions.get(edge.to);
    if (calledFunc && !calledFunc.calledBy.includes(edge.from)) {
      calledFunc.calledBy.push(edge.from);
    }

    const callerFunc = allFunctions.get(edge.from);
    if (callerFunc && !callerFunc.callsTo.includes(edge.to)) {
      callerFunc.callsTo.push(edge.to);
    }
  });

  return { nodes, edges };
}

/**
 * 호출 그래프를 기반으로 함수 간 의존성 업데이트
 */
export function updateFunctionDependencies(
  allFunctions: Map<string, TSFunctionAnalysis>
): void {
  allFunctions.forEach((func) => {
    // callsTo를 dependencies로 설정
    func.callsTo = Array.from(new Set(func.callsTo));
    func.calledBy = Array.from(new Set(func.calledBy));
  });
}
