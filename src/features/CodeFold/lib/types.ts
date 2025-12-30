/**
 * CodeFold Feature Types
 */

export interface FoldInfo {
  isFoldable: boolean;        // 접을 수 있는 라인인가? (블록 시작)
  foldStart: number;           // 접기 시작 라인 번호
  foldEnd: number;             // 접기 끝 라인 번호
  foldType?: 'statement-block' | 'jsx-children' | 'jsx-fragment' | 'import-block';
  tagName?: string;            // JSX인 경우 태그 이름
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
