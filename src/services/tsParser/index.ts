/**
 * TypeScript 파서 메인 엔트리
 *
 * Babel 완전 제거, TypeScript 컴파일러 기반 파서
 * 목표: 외부 참조 중심 함수 호출 그래프
 */

import { GraphData } from '../../entities/VariableNode';
import { TSProjectAnalysis } from './types';
import { analyzeFile } from './core/fileAnalyzer';
import { buildCallGraph, updateFunctionDependencies } from './core/callGraphBuilder';
import { tsProjectToGraphData } from './adapters/toVariableNode';
import { resolvePath } from './utils/pathResolver';
import { createLanguageService } from './utils/languageService';

/**
 * 프로젝트 파싱 메인 함수
 */
export function parseProject(
  files: Record<string, string>,
  entryFile: string
): GraphData {
  // Language Service 생성 (변수 및 참조 분석용)
  console.log('🔧 Creating Language Service...');
  const languageService = createLanguageService(files);

  const projectAnalysis: TSProjectAnalysis = {
    files: new Map(),
    allFunctions: new Map(),
    globalCallGraph: { nodes: new Map(), edges: [] },
    entryFile,
    languageService, // Language Service 추가
  };

  const processedFiles = new Set<string>();

  /**
   * 재귀적 파일 처리
   */
  function processFile(filePath: string): void {
    // 이미 처리한 파일은 스킵
    if (processedFiles.has(filePath)) {
      return;
    }

    // TypeScript/TSX 파일만 처리 (.ts, .tsx, .d.ts 제외)
    const isTsFile = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isDtsFile = filePath.endsWith('.d.ts');

    if (!isTsFile || isDtsFile) {
      return;
    }

    const content = files[filePath];
    if (!content) {
      return;
    }

    processedFiles.add(filePath);

    try {
      // 파일 분석
      const fileAnalysis = analyzeFile(filePath, content);
      projectAnalysis.files.set(filePath, fileAnalysis);

      // 함수들을 글로벌 맵에 추가
      fileAnalysis.functions.forEach((func) => {
        projectAnalysis.allFunctions.set(func.id, func);
      });

      // Import된 파일들 재귀 처리
      fileAnalysis.imports.forEach((imp) => {
        if (imp.importType !== 'side-effect' && !imp.isTypeOnly) {
          const resolvedPath = resolvePath(filePath, imp.source, files);
          if (resolvedPath) {
            processFile(resolvedPath);
          }
        }
      });
    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error);
    }
  }

  // Entry file부터 시작
  processFile(entryFile);

  // 전역 함수 호출 그래프 생성
  projectAnalysis.globalCallGraph = buildCallGraph(projectAnalysis.allFunctions);

  // 함수 간 의존성 업데이트
  updateFunctionDependencies(projectAnalysis.allFunctions);

  // VariableNode로 변환 및 반환
  return tsProjectToGraphData(projectAnalysis);
}

// Re-export types for convenience
export * from './types';
export { getExternalRefTokenRanges } from './adapters/toVariableNode';

// Re-export AST getter functions
export * from './utils/astGetters';
