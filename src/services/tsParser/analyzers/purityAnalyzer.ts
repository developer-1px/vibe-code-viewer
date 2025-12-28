/**
 * 순수성 분석기
 *
 * 함수가 순수한지 (side effect가 없는지) 판단
 */

import * as ts from 'typescript';

// 순수한 메서드들 (호출해도 side effect 없음)
const PURE_METHODS = new Set([
  // Array
  'includes',
  'indexOf',
  'lastIndexOf',
  'find',
  'findIndex',
  'filter',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'concat',
  'flat',
  'flatMap',
  'some',
  'every',
  'join',
  // String
  'charAt',
  'charCodeAt',
  'includes',
  'indexOf',
  'lastIndexOf',
  'slice',
  'substring',
  'substr',
  'split',
  'toLowerCase',
  'toUpperCase',
  'trim',
  'trimStart',
  'trimEnd',
  'padStart',
  'padEnd',
  'repeat',
  // Math
  'abs',
  'ceil',
  'floor',
  'round',
  'max',
  'min',
  'sqrt',
  'pow',
  // Object
  'keys',
  'values',
  'entries',
  'assign', // 새 객체 반환
]);

// 부수효과를 가진 글로벌 객체/메서드
const SIDE_EFFECT_GLOBALS = new Set([
  'console',
  'alert',
  'confirm',
  'prompt',
  'fetch',
  'localStorage',
  'sessionStorage',
  'document',
  'window',
]);

// 부수효과를 가진 메서드
const SIDE_EFFECT_METHODS = new Set([
  // Array mutations
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
  // Object mutations
  'assign', // 첫 번째 인자를 변경
  'defineProperty',
  'defineProperties',
  'setPrototypeOf',
]);

/**
 * 함수 순수성 분석
 */
export function analyzePurity(functionNode: ts.FunctionLikeDeclaration): {
  isPure: boolean;
  hasSideEffects: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let hasSideEffects = false;

  if (!functionNode.body) {
    return { isPure: true, hasSideEffects: false, reasons: [] };
  }

  // AST 순회하며 side effect 패턴 찾기
  const visit = (node: ts.Node) => {
    // 1. CallExpression 검사
    if (ts.isCallExpression(node)) {
      if (hasSideEffectCall(node)) {
        hasSideEffects = true;
        reasons.push(`Side effect call: ${node.expression.getText()}`);
      }
    }

    // 2. Assignment 검사 (멤버 변경)
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left)
    ) {
      hasSideEffects = true;
      reasons.push(`Property mutation: ${node.left.getText()}`);
    }

    // 3. Update expression (++, --)
    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      const operator = node.operator;
      if (
        operator === ts.SyntaxKind.PlusPlusToken ||
        operator === ts.SyntaxKind.MinusMinusToken
      ) {
        hasSideEffects = true;
        reasons.push(`Update expression: ${node.getText()}`);
      }
    }

    // 4. Delete expression
    if (ts.isDeleteExpression(node)) {
      hasSideEffects = true;
      reasons.push(`Delete expression`);
    }

    ts.forEachChild(node, visit);
  };

  visit(functionNode.body);

  return {
    isPure: !hasSideEffects,
    hasSideEffects,
    reasons,
  };
}

/**
 * CallExpression이 side effect를 가지는지 판단
 */
function hasSideEffectCall(callExpr: ts.CallExpression): boolean {
  const expr = callExpr.expression;

  // 직접 호출: console.log() 등
  if (ts.isPropertyAccessExpression(expr)) {
    const objectName = getObjectName(expr.expression);
    const methodName = expr.name.text;

    // 글로벌 side effect 객체
    if (objectName && SIDE_EFFECT_GLOBALS.has(objectName)) {
      return true;
    }

    // Side effect 메서드
    if (SIDE_EFFECT_METHODS.has(methodName)) {
      return true;
    }

    // Pure 메서드는 안전
    if (PURE_METHODS.has(methodName)) {
      return false;
    }
  }

  // 식별자 직접 호출
  if (ts.isIdentifier(expr)) {
    const name = expr.text;

    // 글로벌 side effect 함수
    if (SIDE_EFFECT_GLOBALS.has(name)) {
      return true;
    }

    // Math.* 등은 순수
    if (name === 'Math') {
      return false;
    }
  }

  // 알 수 없는 호출은 일단 side effect로 간주
  return false;
}

/**
 * PropertyAccessExpression에서 객체 이름 추출
 */
function getObjectName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    return getObjectName(expr.expression);
  }
  return null;
}
