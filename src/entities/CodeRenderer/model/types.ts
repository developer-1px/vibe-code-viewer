/**
 * Code rendering and syntax highlighting type definitions
 */

import type { FoldInfo } from '../../../features/CodeFold/lib/types';
import type { CodeSegment, SegmentKind } from '../../CodeSegment';

// Re-export for backward compatibility
export type { CodeSegment, SegmentKind };

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
