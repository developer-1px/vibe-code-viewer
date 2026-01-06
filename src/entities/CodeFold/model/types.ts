/**
 * CodeFold Feature Types
 */

export interface FoldInfo {
  isFoldable: boolean; // 접을 수 있는 라인인가? (블록 시작)
  foldStart: number; // 접기 시작 라인 번호
  foldEnd: number; // 접기 끝 라인 번호
  foldType?:
    | 'function-block' // Function declarations
    | 'arrow-function-block' // Arrow functions
    | 'function-expression-block' // Function expressions
    | 'method-block' // Method declarations
    | 'interface-block' // Interface declarations
    | 'type-block' // Type alias declarations
    | 'control-flow-block' // if/for/while/try (excluded from sticky)
    | 'jsx-children' // JSX element children
    | 'jsx-fragment' // JSX fragment children
    | 'import-block'; // Import statements
  tagName?: string; // JSX인 경우 태그 이름
  depth?: number; // 블록의 중첩 깊이 (1: import, 2: 최상위 블록, 3+: 중첩 블록)
}

export interface FoldPlaceholder {
  type: 'fold-placeholder';
  parentLine: number;
  foldStart: number;
  foldEnd: number;
  foldedCount: number;
  foldType:
    | 'function-block'
    | 'arrow-function-block'
    | 'function-expression-block'
    | 'method-block'
    | 'interface-block'
    | 'type-block'
    | 'control-flow-block'
    | 'jsx-children'
    | 'jsx-fragment'
    | 'import-block';
  tagName?: string;
}
