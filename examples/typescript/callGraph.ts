/**
 * 테스트 케이스: 함수 호출 그래프
 *
 * 외부 참조 분석 테스트:
 * - Import 참조
 * - 파일 레벨 변수 참조
 * - 함수 호출 관계
 * - 순수 함수 vs 부수효과 함수
 */

// External import (외부 참조)
export function fetchData() {
  return fetch('/api/data');  // 외부 참조: fetch (global)
}

// File-level constant (파일 레벨 변수)
const MULTIPLIER = 2;

// Pure function (순수 함수 - 외부 참조 없음)
export function add(a: number, b: number): number {
  return a + b;
}

// Pure function with file-level reference (파일 레벨 변수 참조)
export function multiply(value: number): number {
  return value * MULTIPLIER;  // 외부 참조: MULTIPLIER (file-level)
}

// Impure function with side effects (부수효과 함수)
export function logResult(result: any): void {
  console.log('Result:', result);  // 외부 참조: console (global)
}

// Function with function calls (함수 호출)
export function processData(data: any): any {
  const transformed = data.map((x: number) => multiply(x));  // 함수 호출: multiply
  return transformed;
}

// Main function with multiple function calls (복합 함수 호출)
export function main() {
  const data = fetchData();  // 함수 호출: fetchData
  const processed = processData(data);  // 함수 호출: processData
  const sum = add(10, 20);  // 함수 호출: add
  logResult(processed);  // 함수 호출: logResult
  return sum;
}

/**
 * 예상 결과:
 *
 * 1. fetchData
 *    - Type: effect-action (fetch는 side effect)
 *    - External refs: fetch (global)
 *    - Calls to: []
 *
 * 2. add
 *    - Type: pure-function
 *    - External refs: []
 *    - Calls to: []
 *
 * 3. multiply
 *    - Type: pure-function
 *    - External refs: MULTIPLIER (file-level)
 *    - Calls to: []
 *
 * 4. logResult
 *    - Type: effect-action (console.log는 side effect)
 *    - External refs: console (global)
 *    - Calls to: []
 *
 * 5. processData
 *    - Type: pure-function (map은 순수 메서드)
 *    - External refs: []
 *    - Calls to: [multiply]
 *    - Dependencies: callGraph.ts::multiply
 *
 * 6. main
 *    - Type: function
 *    - External refs: []
 *    - Calls to: [fetchData, processData, add, logResult]
 *    - Dependencies: callGraph.ts::fetchData, callGraph.ts::processData, callGraph.ts::add, callGraph.ts::logResult
 *
 * Call Graph:
 *   main → fetchData
 *   main → processData → multiply
 *   main → add
 *   main → logResult
 */
