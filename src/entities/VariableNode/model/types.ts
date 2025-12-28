import type { TemplateTokenRange } from '../../CanvasNode';
import type { MutabilityAnalysis } from '../../../services/parser/utils/mutabilityChecker';
import type { FunctionAnalysis } from '../../../services/functionalParser/types';

export interface LocalReference {
  name: string;           // Variable/function name
  nodeId: string;         // Statement node ID
  summary: string;        // 1-line code summary
  type: VariableNode['type'];
}

export interface VariableNode {
  id: string; // Globally unique ID (usually filePath::localName)
  label: string;
  filePath: string; // The file where this variable is defined
  type:
    // === CALCULATIONS (불변, 청록/파랑 계열) ===
    | 'pure-function'     // 순수 함수 - 사이드 이펙트 없음
    | 'immutable-data'    // 불변 상수 - const + primitive/immutable 값
    | 'computed'          // 계산된 값 - useMemo, useCallback

    // === STATE ACTIONS (상태 변경, 주황/노랑 계열) ===
    | 'ref'               // 기존 ref (하위 호환성, state-ref로 마이그레이션 권장)
    | 'state-ref'         // 상태 참조 - useState의 state 값
    | 'state-action'      // 상태 액션 - setState, mutation 함수
    | 'mutable-ref'       // 가변 참조 - useRef

    // === EFFECT ACTIONS (부수효과, 빨강/분홍 계열) ===
    | 'effect-action'     // 부수효과 액션 - useEffect, API 호출
    | 'hook'              // 커스텀 hook (복합적 성격)

    // === LEGACY/OTHER ===
    | 'function'          // 일반 함수 (구체적 타입으로 마이그레이션 권장)
    | 'prop'              // 컴포넌트 프롭
    | 'store'             // 상태 스토어
    | 'template'          // 템플릿/컴포넌트
    | 'call'              // 함수 호출 표현식
    | 'module';           // 모듈/파일 엔트리
  codeSnippet: string;
  startLine: number;
  dependencies: string[]; // List of IDs
  templateTokenRanges?: TemplateTokenRange[]; // For template nodes: AST-based token positions
  localReferences?: LocalReference[]; // For JSX_ROOT (View): local vars/functions used in return statement

  // === NEW: Mutability metadata ===
  mutabilityInfo?: MutabilityAnalysis; // 가변성 분석 정보 (mutations, type 등)
  localVariableNames?: string[]; // For pure functions: local variable names to exclude from highlighting

  // === NEW: Functional Parser metadata ===
  functionAnalysis?: FunctionAnalysis; // Functional parser analysis with external dependencies

  // === NEW: Vue Template ===
  vueTemplate?: string; // For Vue module nodes: raw template content
}

export interface GraphData {
  nodes: VariableNode[];
}

export interface GraphNode extends VariableNode {
  x?: number;
  y?: number;
  depth?: number;
}
