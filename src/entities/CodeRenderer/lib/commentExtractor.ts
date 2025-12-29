/**
 * Comment 추출 순수 함수들
 */

export interface CommentRange {
  start: number;
  end: number;
}

/**
 * JSX comments 추출 (curly brace + multi-line comment)
 */
export function extractJsxComments(fullText: string): CommentRange[] {
  const comments: CommentRange[] = [];
  const jsxComments = fullText.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*}/g);

  for (const match of jsxComments) {
    if (match.index !== undefined) {
      comments.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  return comments;
}

/**
 * Multi-line comments 추출 (slash + asterisk)
 */
export function extractMultiLineComments(fullText: string): CommentRange[] {
  const comments: CommentRange[] = [];
  const multiLineComments = fullText.matchAll(/\/\*[\s\S]*?\*\//g);

  for (const match of multiLineComments) {
    if (match.index !== undefined) {
      comments.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  return comments;
}

/**
 * Single-line comments 추출 (double slash)
 */
export function extractSingleLineComments(fullText: string): CommentRange[] {
  const comments: CommentRange[] = [];
  const singleLineComments = fullText.matchAll(/\/\/.*/g);

  for (const match of singleLineComments) {
    if (match.index !== undefined) {
      comments.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  return comments;
}

/**
 * 모든 타입의 comment 추출
 */
export function extractAllComments(fullText: string, isTsx: boolean): CommentRange[] {
  const comments: CommentRange[] = [];

  // JSX comments (TSX only)
  if (isTsx) {
    comments.push(...extractJsxComments(fullText));
  }

  // Multi-line comments
  comments.push(...extractMultiLineComments(fullText));

  // Single-line comments
  comments.push(...extractSingleLineComments(fullText));

  return comments;
}
