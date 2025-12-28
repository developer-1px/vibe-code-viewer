/**
 * 함수 분석기
 *
 * 개별 함수를 상세 분석:
 * - 로컬 변수 추출
 * - 외부 참조 분석
 * - 함수 호출 분석
 * - 순수성 분석
 */

import * as ts from 'typescript';
import { TSFunctionAnalysis, FileContext } from '../types';
import {
  analyzeExternalReferences,
  extractLocalVariables,
} from '../analyzers/externalRefAnalyzer';
import { extractFunctionCalls } from './callGraphBuilder';
import { analyzePurity } from '../analyzers/purityAnalyzer';

/**
 * 함수 전체 분석
 */
export function analyzeFunctionFull(
  funcAnalysis: TSFunctionAnalysis,
  fileContext: FileContext,
  sourceFile: ts.SourceFile
): void {
  // 1. 로컬 변수 추출
  if (funcAnalysis.astNode.body) {
    funcAnalysis.localVariables = extractLocalVariables(funcAnalysis.astNode.body);
  }

  // 2. 외부 참조 분석 ⭐CORE
  funcAnalysis.externalRefs = analyzeExternalReferences(
    funcAnalysis,
    fileContext,
    sourceFile
  );

  // 3. 함수 호출 분석 ⭐CORE
  funcAnalysis.functionCalls = extractFunctionCalls(
    funcAnalysis,
    fileContext.allFunctions,
    sourceFile
  );

  // 4. 순수성 분석
  const purityResult = analyzePurity(funcAnalysis.astNode);
  funcAnalysis.isPure = purityResult.isPure;
  funcAnalysis.hasSideEffects = purityResult.hasSideEffects;
}
