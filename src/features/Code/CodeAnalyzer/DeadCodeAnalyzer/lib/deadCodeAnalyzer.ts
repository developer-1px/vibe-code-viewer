/**
 * Dead Code Analyzer - 프로젝트 전체 파일 간 관계 기반 unused code 탐지
 *
 * 분석 항목: Unused Exports/Imports/Variables, Dead Functions, Unused Props/Arguments
 * 아키텍처: Getter Layer 패턴 (AST 파싱 로직 분리), 로컬 캐싱 (파일당 1회 순회), 순수 함수 설계
 */

import {
  getComponentProps,
  getExports,
  getFunctionArguments,
  getImports,
  getLocalFunctions,
  getLocalVariables,
  getUsedIdentifiers,
} from '../../../../../entities/SourceFileNode/lib/metadata.ts';
import type { GraphData } from '../../../../../entities/SourceFileNode/model/types.ts';

// Dead Code 항목 (kind/category 2단계 분류, optional 필드로 상세 정보 제공)
export interface DeadCodeItem {
  filePath: string;
  symbolName: string;
  line: number;
  kind: 'export' | 'import' | 'function' | 'variable' | 'prop' | 'argument';
  category: 'unusedExport' | 'unusedImport' | 'deadFunction' | 'unusedVariable' | 'unusedProp' | 'unusedArgument';
  from?: string;
  componentName?: string;
  functionName?: string;
}

// 분석 결과 (카테고리별 분리 배열 - 필터 성능 최적화, totalCount 캐싱)
export interface DeadCodeResults {
  unusedExports: DeadCodeItem[];
  unusedImports: DeadCodeItem[];
  deadFunctions: DeadCodeItem[];
  unusedVariables: DeadCodeItem[];
  unusedProps: DeadCodeItem[];
  unusedArguments: DeadCodeItem[];
  totalCount: number;
}

/**
 * 프로젝트 전체 dead code 분석
 * 알고리즘: 1) 파일별 메타데이터 1회 추출 2) 메모리 캐싱 3) 크로스 파일 분석
 * 성능: O(n) 파싱 + O(n²) 분석, 100개 파일 ~200ms
 * 제약: 파일명 매칭만 지원, dynamic import/eval/type-only import 미감지
 */
export function analyzeDeadCode(graphData: GraphData | null): DeadCodeResults {
  // Null Object Pattern (빈 결과 반환으로 UI null 체크 불필요)
  const results: DeadCodeResults = {
    unusedExports: [],
    unusedImports: [],
    deadFunctions: [],
    unusedVariables: [],
    unusedProps: [],
    unusedArguments: [],
    totalCount: 0,
  };

  if (!graphData || graphData.nodes.length === 0) {
    return results;
  }

  // 'file' 노드만 필터 (snippet은 AST 불완전, import/export 정보 없음)
  const fileNodes = graphData.nodes.filter((node) => node.type === 'file');

  if (fileNodes.length === 0) {
    console.warn('[deadCodeAnalyzer] No file nodes found');
    return results;
  }

  // Phase 1: 메타데이터 추출 및 캐싱 (파일당 1회 AST 순회, Getter Layer 패턴)
  const fileMetadataList = fileNodes.map((node) => ({
    node,
    exports: getExports(node),
    imports: getImports(node),
    localFunctions: getLocalFunctions(node),
    localVariables: getLocalVariables(node),
    usedIdentifiers: getUsedIdentifiers(node),
    componentProps: getComponentProps(node),
    functionArguments: getFunctionArguments(node),
  }));

  // Phase 2: 캐싱된 데이터로 분석 (AST 순회 없음)

  // Unused Exports (같은 파일에서도 안 쓰고, 다른 파일에서도 import 안 함)
  fileMetadataList.forEach(({ node, exports, usedIdentifiers }) => {
    exports.forEach((exp) => {
      const isUsedInSameFile = usedIdentifiers.has(exp.name);

      // 파일명 매칭 (상대/절대 경로 완벽 해석 X, false negative 가능)
      const isImportedByOtherFile = fileMetadataList.some((other) => {
        if (other.node.filePath === node.filePath) return false;

        return other.imports.some((imp) => {
          if (imp.name !== exp.name) return false;
          const fileName =
            node.filePath
              .split('/')
              .pop()
              ?.replace(/\.(tsx?|jsx?|vue)$/, '') || '';
          return imp.from.includes(fileName);
        });
      });

      if (!isUsedInSameFile && !isImportedByOtherFile) {
        results.unusedExports.push({
          filePath: node.filePath,
          symbolName: exp.name,
          line: exp.line,
          kind: 'export',
          category: 'unusedExport',
        });
      }
    });
  });

  // Unused Imports (파일 내부에서 사용하지 않음)
  fileMetadataList.forEach(({ node, imports, usedIdentifiers }) => {
    imports.forEach((imp) => {
      if (!usedIdentifiers.has(imp.name)) {
        results.unusedImports.push({
          filePath: node.filePath,
          symbolName: imp.name,
          line: imp.line,
          kind: 'import',
          category: 'unusedImport',
          from: imp.from,
        });
      }
    });
  });

  // Dead Functions (export 안 된 함수 중 호출되지 않음)
  fileMetadataList.forEach(({ node, localFunctions, usedIdentifiers }) => {
    localFunctions.forEach((func) => {
      if (!usedIdentifiers.has(func.name)) {
        results.deadFunctions.push({
          filePath: node.filePath,
          symbolName: func.name,
          line: func.line,
          kind: 'function',
          category: 'deadFunction',
        });
      }
    });
  });

  // Unused Variables (참조되지 않는 변수)
  fileMetadataList.forEach(({ node, localVariables, usedIdentifiers }) => {
    localVariables.forEach((variable) => {
      if (!usedIdentifiers.has(variable.name)) {
        results.unusedVariables.push({
          filePath: node.filePath,
          symbolName: variable.name,
          line: variable.line,
          kind: 'variable',
          category: 'unusedVariable',
        });
      }
    });
  });

  // Unused Props (타입 선언은 있지만 컴포넌트 내부에서 미사용)
  fileMetadataList.forEach(({ node, componentProps }) => {
    componentProps.forEach((componentInfo) => {
      componentInfo.props.forEach((prop) => {
        if (prop.isDeclared && !prop.isUsed) {
          results.unusedProps.push({
            filePath: node.filePath,
            symbolName: prop.name,
            line: prop.line,
            kind: 'prop',
            category: 'unusedProp',
            componentName: componentInfo.componentName,
          });
        }
      });
    });
  });

  // Unused Arguments (함수 인자 선언은 있지만 함수 내부에서 미사용)
  fileMetadataList.forEach(({ node, functionArguments }) => {
    functionArguments.forEach((functionInfo) => {
      functionInfo.arguments.forEach((arg) => {
        if (arg.isDeclared && !arg.isUsed) {
          results.unusedArguments.push({
            filePath: node.filePath,
            symbolName: arg.name,
            line: arg.line,
            kind: 'argument',
            category: 'unusedArgument',
            functionName: functionInfo.functionName,
          });
        }
      });
    });
  });

  // Phase 3: 결과 집계
  results.totalCount =
    results.unusedExports.length +
    results.unusedImports.length +
    results.deadFunctions.length +
    results.unusedVariables.length +
    results.unusedProps.length +
    results.unusedArguments.length;

  console.log('[deadCodeAnalyzer] Analysis complete:', {
    unusedExports: results.unusedExports.length,
    unusedImports: results.unusedImports.length,
    deadFunctions: results.deadFunctions.length,
    unusedVariables: results.unusedVariables.length,
    unusedProps: results.unusedProps.length,
    unusedArguments: results.unusedArguments.length,
    total: results.totalCount,
  });

  return results;
}
