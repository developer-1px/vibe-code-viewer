/**
 * CodeFold Feature Types
 */

export interface FoldInfo {
  isFoldable: boolean;        // 접을 수 있는 라인인가? (블록 시작)
  foldStart: number;           // 접기 시작 라인 번호
  foldEnd: number;             // 접기 끝 라인 번호
  foldType?: 'statement-block' | 'jsx-children' | 'jsx-fragment' | 'import-block';
  tagName?: string;            // JSX인 경우 태그 이름
  depth?: number;              // 블록의 중첩 깊이 (1: import, 2: 최상위 블록, 3+: 중첩 블록)
}

export interface FoldPlaceholder {
  type: 'fold-placeholder';
  parentLine: number;
  foldStart: number;
  foldEnd: number;
  foldedCount: number;
  foldType: 'statement-block' | 'jsx-children' | 'jsx-fragment' | 'import-block';
  tagName?: string;
}
