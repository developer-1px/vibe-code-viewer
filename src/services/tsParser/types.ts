/**
 * TypeScript Compiler 기반 파서 타입 정의
 *
 * 목표: 외부 참조 중심 함수 호출 그래프 생성
 */

import * as ts from 'typescript';

/**
 * 외부 참조 타입
 */
export type ExternalRefType =
  | 'import'       // 다른 파일에서 import된 모듈
  | 'file-level'   // 같은 파일의 파일 레벨 변수/함수
  | 'closure'      // 상위 스코프의 변수 (중첩 함수)
  | 'global';      // 글로벌 객체 (console, Math 등)

/**
 * 토큰 사용 정보
 */
export interface TokenUsage {
  name: string;           // 식별자 이름
  start: number;          // 시작 위치 (파일 기준 절대 오프셋)
  end: number;            // 끝 위치
  line: number;           // 라인 번호 (1-based)
  column: number;         // 컬럼 번호 (0-based)
  context: 'call' | 'reference' | 'member' | 'type';
}

/**
 * 외부 참조 정보
 */
export interface ExternalReference {
  name: string;                // 참조하는 식별자 이름
  refType: ExternalRefType;    // 참조 타입
  source?: string;             // import source (import 타입인 경우)
  definedIn?: string;          // 정의 위치 (filePath::name)
  usages: TokenUsage[];        // 사용 위치 목록
}

/**
 * 함수 호출 정보
 */
export interface FunctionCall {
  callerFunctionId: string;    // 호출하는 함수 ID
  calledFunctionName: string;  // 호출되는 함수 이름
  calledFunctionId?: string;   // 호출되는 함수 ID (해결된 경우)
  callSite: TokenUsage;        // 호출 위치
  isDirectCall: boolean;       // 직접 호출 vs 콜백/변수를 통한 호출
}

/**
 * Import 정보
 */
export interface ImportInfo {
  name: string;                // Imported identifier
  source: string;              // Import source path
  importType: 'default' | 'named' | 'namespace' | 'side-effect';
  isTypeOnly: boolean;         // Type-only import
}

/**
 * Export 정보
 */
export interface ExportInfo {
  name: string;                // Exported identifier
  exportType: 'default' | 'named';
  isReExport: boolean;         // Re-export from another module
  source?: string;             // Source module (if re-export)
}

/**
 * 파일 레벨 변수 정보
 */
export interface FileVariable {
  name: string;
  id: string;                  // filePath::name
  line: number;
  isConst: boolean;
  isExported: boolean;
  codeSnippet: string;
}

/**
 * 함수 정보 - AST 노드 기반 (중복 저장 없음)
 *
 * 모든 정보는 getter 함수로 추출:
 * - getCodeSnippet(func) -> string
 * - getStartLine(func) -> number
 * - getParameters(func) -> string[]
 * - isAsync(func) -> boolean
 * - isExported(func) -> boolean
 */
export interface TSFunctionAnalysis {
  // 기본 정보
  name: string;
  id: string;                  // filePath::functionName
  filePath: string;

  // AST 노드 - 모든 정보의 source of truth
  astNode: ts.FunctionLikeDeclaration;
  sourceFile: ts.SourceFile;

  // 분석 결과만 저장 (AST에서 직접 얻을 수 없는 것들)
  externalRefs: ExternalReference[];  // 외부 참조 분석 결과
  callsTo: string[];                  // 호출하는 함수 ID 목록
  calledBy: string[];                 // 호출되는 함수 ID 목록 (역방향)

  // 분석된 메타데이터
  isPure: boolean;
  hasSideEffects: boolean;
}

/**
 * 파일 분석 결과
 */
export interface TSFileAnalysis {
  filePath: string;

  // 파일 레벨 정보
  imports: ImportInfo[];
  exports: ExportInfo[];
  fileVariables: FileVariable[];

  // 함수 분석 결과
  functions: TSFunctionAnalysis[];

  // AST 원본 (필요시)
  sourceFile: ts.SourceFile;
}

/**
 * 함수 호출 그래프
 */
export interface CallGraph {
  nodes: Map<string, TSFunctionAnalysis>;  // functionId → analysis
  edges: CallGraphEdge[];
}

export interface CallGraphEdge {
  from: string;                // caller function ID
  to: string;                  // called function ID
  callSite: TokenUsage;        // 호출 위치
}

/**
 * 프로젝트 전체 분석 결과
 */
export interface TSProjectAnalysis {
  files: Map<string, TSFileAnalysis>;
  allFunctions: Map<string, TSFunctionAnalysis>;
  globalCallGraph: CallGraph;
  entryFile: string;
  languageService?: ts.LanguageService; // Language Service (변수/참조 분석용)
}

/**
 * 파일 컨텍스트 (외부 참조 분석 시 필요한 정보)
 */
export interface FileContext {
  filePath: string;
  imports: Map<string, ImportInfo>;        // name → import info
  fileVariables: Map<string, FileVariable>; // name → variable info
  allFunctions: Map<string, TSFunctionAnalysis>; // name → function (same file)
}
