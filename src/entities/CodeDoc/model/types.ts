/**
 * CodeDoc - 주석 기반 문서 뷰 데이터 구조
 * 주석을 본문으로, 코드를 스니펫으로 변환한 섹션 모델
 */

/**
 * 주석 스타일 종류
 * - line: 일반 한줄 주석 (//)
 * - block: 블록 주석 (/* */)
 * - jsdoc: JSDoc 스타일 주석 (/** */)
 * - separator: 구분선 스타일 주석 (// ==== Title ====)
 * - xml: XML Doc 주석 (///)
 */
export type CommentStyle = 'line' | 'block' | 'jsdoc' | 'separator' | 'xml';

/**
 * CodeDoc 섹션 (주석, 코드, export, jsx, 또는 제어문)
 */
export interface CodeDocSection {
  /** 섹션 타입 */
  type: 'comment' | 'code' | 'export' | 'jsx' | 'control';

  /** 섹션 내용 (주석의 경우 텍스트, 코드의 경우 원본 코드) */
  content: string;

  /** 시작 라인 번호 */
  startLine: number;

  /** 종료 라인 번호 */
  endLine: number;

  // Comment specific fields

  /** 주석이 속한 블록의 depth (0 = 최상위) */
  depth?: number;

  /** 주석 스타일 */
  commentStyle?: CommentStyle;

  /** 추출된 제목 텍스트 (separator 스타일의 경우) */
  headingText?: string;
}

/**
 * 파일별 CodeDoc 섹션 모음
 */
export interface CodeDocFile {
  /** 파일 경로 */
  filePath: string;

  /** 섹션 배열 */
  sections: CodeDocSection[];
}
