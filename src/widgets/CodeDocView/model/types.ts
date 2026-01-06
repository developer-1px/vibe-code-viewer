/**
 * CodeDocView 타입 정의 (sample 기반)
 */

/**
 * 블록 타입
 */
export enum BlockType {
  PROSE = 'PROSE', // 설명 텍스트
  CODE = 'CODE', // 코드 블록
  TAG = 'TAG', // NOTE, WARNING 등의 태그
  BRANCH = 'BRANCH', // 분기 설명
}

/**
 * 문서 블록
 */
export interface DocBlock {
  type: BlockType;
  content: string;
  label?: string; // TAG, BRANCH의 라벨
  lines?: string; // 라인 범위 (e.g., "L10-15")
}

/**
 * Import 항목
 */
export interface ImportItem {
  name: string;
  path: string;
}

/**
 * Export 항목
 */
export interface ExportItem {
  name: string;
  type: 'function' | 'interface' | 'class' | 'const';
}

/**
 * 심볼 멤버 (interface, class의 멤버)
 */
export interface SymbolMember {
  name: string;
  type: string;
  description?: string;
}

/**
 * 심볼 분석 정보
 */
export interface SymbolAnalysis {
  complexity?: number;
  branches?: number;
  coverage?: string;
}

/**
 * 파라미터 정보
 */
export interface Parameter {
  name: string;
  type: string;
  description: string;
}

/**
 * 심볼 상세 정보
 */
export interface SymbolDetail {
  name: string;
  type: 'function' | 'interface' | 'class' | 'test-suite' | 'test-case' | 'test-hook';
  modifiers?: string[];
  lineRange?: string;
  startLine?: number; // 소스 파일에서의 시작 라인 (스크롤용)
  signature: string;
  description: string;
  parameters?: Parameter[];
  returns?: string;
  throws?: string[];
  members?: SymbolMember[];
  analysis?: SymbolAnalysis;
  blocks?: DocBlock[];
  flowchart?: string; // Mermaid flowchart

  // Test-specific fields
  testMetadata?: {
    url?: string;
    selectors?: string[];
    expectations?: string[];
  };
}

/**
 * 파일 메타데이터
 */
export interface FileMeta {
  filename: string;
  path: string;
  description: string;
  lines?: number;
  version?: string;
  lastModified?: string;
  author?: string;
}

/**
 * 문서 데이터 (전체)
 */
export interface DocData {
  meta: FileMeta;
  imports: ImportItem[];
  exports: ExportItem[];
  symbols: SymbolDetail[];
}
