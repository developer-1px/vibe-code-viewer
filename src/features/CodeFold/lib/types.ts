/**
 * CodeFold Feature Types
 */

export interface FoldInfo {
  isFoldable: boolean;        // 접을 수 있는 라인인가? (블록 시작)
  foldStart: number;           // 접기 시작 라인 번호
  foldEnd: number;             // 접기 끝 라인 번호
  isInsideFold: boolean;       // 접힌 범위 내부에 있는가?
  parentFoldLine?: number;     // 부모 fold 라인 번호 (중첩 지원)
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
