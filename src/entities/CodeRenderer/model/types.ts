/**
 * Code rendering and syntax highlighting type definitions
 */

import type { FoldInfo } from '../../../features/CodeFold/lib/types';

/**
 * Segment kind flags - multiple kinds can be combined using bitwise OR
 */
export type SegmentKind =
  | 'text'
  | 'keyword'
  | 'punctuation'
  | 'string'
  | 'comment'
  | 'identifier'
  | 'external-import'
  | 'external-closure'
  | 'external-function'
  | 'self'
  | 'local-variable'
  | 'parameter';

/**
 * A code segment represents a single token/text piece within a code line
 * with syntax highlighting information
 */
export interface CodeSegment {
  text: string;
  kinds: SegmentKind[]; // 여러 kind를 동시에 가질 수 있음
  nodeId?: string;
  definedIn?: string;
  offset?: number; // Position in line for accurate sorting
  isDeclarationName?: boolean; // 선언되는 변수/함수/타입 이름인지 여부
  position?: number; // AST position for Language Service queries
  hoverInfo?: string; // Quick info from Language Service
  definitionLocation?: { // Definition location from Language Service
    filePath: string;
    line: number;
    character: number;
  };
}

/**
 * A code line represents a single line of code with its segments and metadata
 */
export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  hasInput: boolean;
  hasTopLevelReturn?: boolean;
  hasDeclarationKeyword?: boolean; // interface, type, class, enum 등의 선언 키워드가 있는 라인
  foldInfo?: FoldInfo;        // Fold 관련 메타데이터
  isFolded?: boolean;          // 현재 접혀있는 상태인가? (UI에서 설정)
  foldedCount?: number;        // 접힌 라인 수 (UI에서 설정)
  isInsideFold?: boolean;      // 접힌 범위 내부 라인인가? (숨김 처리용, UI에서 설정)
}

/**
 * TypeScript Language Service - Definition location result
 */
export interface DefinitionLocation {
  filePath: string;
  line: number;
  character: number;
  fileName: string;
}
