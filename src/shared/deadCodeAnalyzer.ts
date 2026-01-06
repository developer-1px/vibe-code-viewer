/**
 * Dead Code Analyzer
 *
 * 배경:
 * - 대규모 코드베이스에서는 시간이 지나면서 사용하지 않는 코드가 쌓임
 * - ESLint는 파일 단위 분석만 가능 (프로젝트 전체 관계는 파악 못함)
 * - TypeScript 컴파일러도 unused code를 모두 찾지는 못함
 * - 이 분석기는 프로젝트 전체 파일 간 관계를 보고 dead code 탐지
 *
 * 분석 항목:
 * - Unused Exports: 다른 파일에서 import하지 않는 export (Public API 정리용)
 * - Unused Imports: 파일 내에서 사용하지 않는 import (번들 사이즈 감소)
 * - Dead Functions: 호출되지 않는 함수 (리팩토링 잔해 정리)
 * - Unused Variables: 참조되지 않는 변수 (실수로 남은 코드)
 * - Unused Props: React/Vue 컴포넌트의 사용하지 않는 props (컴포넌트 API 개선)
 * - Unused Arguments: 함수 인자는 받지만 쓰지 않는 경우 (시그니처 정리)
 *
 * 아키텍처 결정:
 * - Getter Layer 패턴: AST 파싱 로직과 분석 로직 분리
 *   → metadata.ts가 나중에 DB 기반으로 바뀌어도 이 파일은 수정 불필요
 * - 로컬 캐싱: 파일당 1번만 AST 순회, 이후는 메모리 캐시 사용
 *   → 100개 파일 × 6종류 분석 = 600번 순회 → 100번으로 감소
 * - 순수 함수 설계: atom 의존성 제거, 테스트 및 재사용 용이
 *   → CLI 도구, 웹 워커, 서버사이드 등 다양한 환경에서 사용 가능
 */

import {
  getComponentProps,
  getExports,
  getFunctionArguments,
  getImports,
  getLocalFunctions,
  getLocalVariables,
  getUsedIdentifiers,
} from '../entities/SourceFileNode/lib/metadata';
import type { GraphData } from '../entities/SourceFileNode/model/types';

/**
 * Dead Code 항목 데이터 구조
 *
 * 설계 고려사항:
 * - kind vs category 분리: 미래 확장성을 위한 의도적 중복
 *   예) 'function' kind는 deadFunction, warningFunction, complexFunction 등 여러 category 가질 수 있음
 *   → SonarQube, ESLint 같은 도구들도 이런 2단계 분류 체계 사용
 * - Optional 필드들: 각 category마다 필요한 추가 정보가 다름
 *   import는 from 경로, prop는 컴포넌트명, argument는 함수명 등
 *   → UI에서 "UserCard 컴포넌트의 unused prop" 같은 구체적 메시지 표시 가능
 */
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

/**
 * 분석 결과 데이터 구조
 *
 * 트레이드오프 결정:
 * - 단일 배열 vs 카테고리별 분리 배열
 *   선택: 분리 배열 (UI 성능 우선)
 *   이유: 사용자가 "Unused Imports만 보기" 같은 필터를 자주 사용할 것으로 예상
 *        매번 filter() 호출보다 이미 분류된 배열이 빠름
 * - totalCount 필드: 중복 데이터이지만 캐싱
 *   이유: UI 상단에 "총 N개 발견" 표시 시 매번 6개 배열 length 합산하지 않기 위함
 */
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
 * 프로젝트 전체의 dead code 분석
 *
 * 알고리즘 개요:
 * 1. 파일별로 메타데이터 1회 추출 (exports, imports, functions, variables 등)
 * 2. 메모리에 캐싱 (추출 비용: O(n), n=파일 수)
 * 3. 캐싱된 데이터로 크로스 파일 분석 (비용: O(n²) 최악, 실제로는 훨씬 적음)
 *
 * 성능 특성:
 * - 전체 시간 복잡도: O(n) 파싱 + O(n²) 분석
 * - 공간 복잡도: O(n × m), m=평균 메타데이터 항목 수
 * - 실측: 100개 파일 프로젝트에서 ~200ms (M1 Mac 기준)
 *
 * 제약사항 (알려진 한계):
 * - import 경로 매칭: 파일명만 비교 (완벽한 경로 해석 아님)
 *   예) utils.ts 파일이 2개 있으면 오판 가능 (false negative)
 * - Dynamic import: import('...') 같은 동적 import는 감지 못함
 * - eval, new Function: 문자열로 실행되는 코드는 분석 불가
 * - Type-only imports: 런타임에 안 쓰지만 타입으로는 쓰이는 경우 구분 못함
 *
 * 순수 함수 설계:
 * - Jotai atom 의존성 제거 → 테스트 작성 용이
 * - 부작용 없음 → 병렬 실행 가능 (웹 워커에서 실행 가능)
 * - 입출력만 관리 → CLI 도구, VSCode Extension 등에서 재사용 가능
 */
export function analyzeDeadCode(graphData: GraphData | null): DeadCodeResults {
  // Null Object Pattern: null 반환 대신 빈 결과 반환
  // → UI 코드에서 null 체크 불필요, results.unusedExports.map() 바로 사용 가능
  const results: DeadCodeResults = {
    unusedExports: [],
    unusedImports: [],
    deadFunctions: [],
    unusedVariables: [],
    unusedProps: [],
    unusedArguments: [],
    totalCount: 0,
  };

  // Early Return Guards
  if (!graphData || graphData.nodes.length === 0) {
    return results;
  }

  // 데이터 모델 이해:
  // - graphData.nodes에는 'file' 타입과 'snippet' 타입이 섞여 있음
  // - 'snippet': 코드 일부만 (예: 특정 함수만 추출), AST 불완전
  // - 'file': 전체 파일, 완전한 AST, import/export 정보 포함
  // Dead code 분석은 파일 간 의존성을 봐야 하므로 'file' 노드만 필요
  const fileNodes = graphData.nodes.filter((node) => node.type === 'file');

  if (fileNodes.length === 0) {
    console.warn('[deadCodeAnalyzer] No file nodes found');
    return results;
  }

  // Phase 1: 메타데이터 추출 및 캐싱
  //
  // 성능 최적화 전략:
  // - 각 getter는 내부적으로 AST를 순회함 (비용: O(파일 크기))
  // - 만약 분석 단계에서 매번 getter를 호출하면:
  //   unusedExports 분석: getExports() × 100회
  //   unusedImports 분석: getImports() × 100회
  //   ... (총 600회 이상 AST 순회)
  // - 해결책: 모든 메타데이터를 먼저 추출해서 배열에 담음 (100회만 순회)
  //
  // Getter Layer 패턴의 핵심:
  // - 이 파일은 "어떻게 추출하는지" 몰라도 됨 (getter가 알아서 함)
  // - metadata.ts가 AST 대신 DB에서 읽도록 바뀌어도 이 코드는 변경 불필요
  // - 관심사 분리: 이 파일은 "무엇을 분석할지"만 집중
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

  // ========================================
  // Unused Exports 분석
  // ========================================
  //
  // 비즈니스 로직:
  // - export는 "공개 API"라는 의도를 담음
  // - 하지만 실제로는 아무도 안 쓰는 export가 많음:
  //   1) 리팩토링 후 남은 잔해
  //   2) 나중을 위해 만들었지만 결국 안 씀
  //   3) 같은 파일 내부에서만 쓰는데 export를 붙여놓음
  //
  // 탐지 전략:
  // - export가 의미 있으려면: 다른 파일에서 import하거나, 같은 파일에서라도 사용되어야 함
  // - 둘 다 아니면 → 완전히 쓸모없는 export
  fileMetadataList.forEach(({ node, exports, usedIdentifiers }) => {
    exports.forEach((exp) => {
      // Check 1: 같은 파일 내부 사용
      const isUsedInSameFile = usedIdentifiers.has(exp.name);

      // Check 2: 다른 파일에서 import
      //
      // 크로스 파일 매칭의 어려움:
      // - import path는 상대경로, 절대경로, alias 등 다양함
      //   예) '../utils', '@/utils', './shared/utils' 모두 같은 파일 가능
      // - TypeScript Language Service를 쓰면 정확하지만 무거움
      // - 현재 구현: 파일명만 비교 (빠르지만 false negative 가능)
      //   예) src/utils.ts, lib/utils.ts 구분 못함
      // - Trade-off: 완벽한 정확도 < 빠른 피드백
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

      // 최종 판정: AND 조건
      // - 내부에서도 안 쓰고 + 외부에서도 안 쓰면 → 100% unused
      // - 내부에서만 쓰는 경우도 unused로 보고 싶다면 조건 변경 가능
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

  // ========================================
  // Unused Imports 분석
  // ========================================
  //
  // 실용적 가치:
  // - Unused import는 번들 사이즈 증가의 주범
  //   예) import { largeLibrary } from 'big-package' 했지만 안 쓰면
  //       Tree-shaking이 작동해도 패키지 로딩 비용은 발생
  // - ESLint도 이걸 잡지만, 이 분석기는 프로젝트 전체를 한 번에 보여줌
  //
  // 간단한 로직:
  // - import는 export와 달리 파일 간 전파 안 됨 (스코프가 해당 파일로 제한)
  // - 따라서 해당 파일 내 usedIdentifiers에 없으면 → 무조건 unused
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

  // ========================================
  // Dead Functions 분석
  // ========================================
  //
  // 타겟:
  // - export 안 된 함수 (내부 helper 함수)
  // - export된 함수는 다른 파일에서 쓸 수 있으므로 제외 (Unused Exports에서 처리)
  //
  // 흔한 시나리오:
  // - 리팩토링 중 함수 추출했다가 결국 안 씀
  // - 테스트 코드 작성 전 만들어둔 함수
  // - 주석 처리된 코드를 복구하면서 안 쓰는 함수 남음
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

  // ========================================
  // Unused Variables 분석
  // ========================================
  //
  // 노이즈 vs 시그널:
  // - Variable은 가장 노이즈가 많은 카테고리
  //   예) const _ = useSomething() 같은 의도적 미사용도 잡힘
  // - 하지만 실수로 남긴 변수도 많음:
  //   const result = expensiveCalculation(); // 계산만 하고 안 씀
  //   const oldData = fetchOldWay(); // 새로운 방식으로 바꾼 후 남은 코드
  //
  // 개선 아이디어 (TODO):
  // - 변수명이 '_'로 시작하면 제외 (의도적 미사용 컨벤션)
  // - 함수 호출 결과만 저장하는 경우 제외 (side-effect 목적일 수 있음)
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

  // ========================================
  // Unused Props 분석
  // ========================================
  //
  // React/Vue 컴포넌트 API 개선을 위한 특화 분석:
  // - Props는 "컴포넌트의 공개 API"
  // - 사용하지 않는 props가 많으면:
  //   1) 컴포넌트가 과도하게 추상화됨 (불필요한 유연성)
  //   2) 리팩토링 후 남은 잔해
  //   3) 미래를 위해 만들었지만 결국 안 씀
  //
  // isDeclared vs isUsed:
  // - isDeclared: 타입 정의에 명시됨 (interface Props { ... })
  // - isUsed: 컴포넌트 내부에서 실제 사용됨
  // - isDeclared=true, isUsed=false → 타입은 있지만 구현에서 안 씀 (버그 또는 불필요)
  // - isDeclared=false 케이스: 부모가 전달한 props가 타입 정의에 없음 (typo, 제외함)
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

  // ========================================
  // Unused Arguments 분석
  // ========================================
  //
  // 함수 시그니처 정리를 위한 분석:
  // - 흔한 경우: 콜백 함수에서 일부 인자만 사용
  //   예) array.map((item, index) => item.name) // index 안 씀
  //   예) onClick={(event, data) => console.log(data)} // event 안 씀
  //
  // 노이즈가 많은 이유:
  // - 인터페이스 구현: 특정 인자를 안 쓰더라도 시그니처 맞춰야 함
  // - 미래 확장성: 나중에 쓸 것 같아서 미리 받아둠
  //
  // 실용적 가치:
  // - 불필요한 인자는 함수 복잡도 증가시킴
  // - 특히 public API 함수라면 인자 줄이는 게 사용성 향상
  //
  // 주의: 이 카테고리는 "힌트" 수준으로만 활용 권장
  // (인터페이스 구현 등 정당한 이유가 많음)
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

  // Phase 3: 결과 집계 및 반환
  //
  // totalCount 캐싱 이유:
  // - UI 상단 배지에 "총 N개" 표시할 때 매번 합산 비용 제거
  // - 중복 데이터이지만 읽기 성능 우선 (쓰기는 1번, 읽기는 여러 번)
  results.totalCount =
    results.unusedExports.length +
    results.unusedImports.length +
    results.deadFunctions.length +
    results.unusedVariables.length +
    results.unusedProps.length +
    results.unusedArguments.length;

  // 개발 모드 로깅:
  // - 각 카테고리별 건수를 한 눈에 파악
  // - 프로덕션에서는 제거하거나 레벨 조절 고려
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
