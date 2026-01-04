/**
 * Extract file header (상단 주석 추출)
 * 첫 번째 import 전까지의 주석을 파일 헤더로 인식
 */

import type { CodeDocSection, CommentStyle } from './types';

/**
 * 주석 스타일 분석
 */
function analyzeCommentStyle(commentText: string): {
  style: CommentStyle;
  headingText?: string;
} {
  const trimmed = commentText.trim();

  // Separator 스타일: // ==== Title ====
  const separatorMatch = trimmed.match(/^\/\/\s*={3,}\s*(.+?)\s*={3,}/);
  if (separatorMatch) {
    return {
      style: 'separator',
      headingText: separatorMatch[1].trim()
    };
  }

  // JSDoc 스타일: /** ... */
  if (trimmed.startsWith('/**')) {
    return { style: 'jsdoc' };
  }

  // XML Doc 스타일: /// ...
  if (trimmed.startsWith('///')) {
    return { style: 'xml' };
  }

  // 블록 주석: /* ... */
  if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
    return { style: 'block' };
  }

  // 일반 한줄 주석: //
  return { style: 'line' };
}

/**
 * 주석 텍스트 정제 (주석 기호 제거)
 */
function cleanCommentText(commentText: string, style: CommentStyle): string {
  const lines = commentText.split('\n');

  if (style === 'jsdoc') {
    // /** ... */ 형식 정제
    return lines
      .map(line => {
        let cleaned = line.trim();
        // 시작/끝 기호 제거
        cleaned = cleaned.replace(/^\/\*\*\s*/, '').replace(/\*\/$/, '');
        // 각 라인의 * 제거
        cleaned = cleaned.replace(/^\*\s?/, '');
        return cleaned;
      })
      .join('\n')
      .trim();
  }

  if (style === 'xml') {
    // /// ... 형식 정제
    return lines
      .map(line => line.trim().replace(/^\/\/\/\s?/, ''))
      .join('\n')
      .trim();
  }

  if (style === 'block') {
    // /* ... */ 형식 정제
    return lines
      .map(line => {
        let cleaned = line.trim();
        cleaned = cleaned.replace(/^\/\*\s*/, '').replace(/\*\/$/, '');
        cleaned = cleaned.replace(/^\*\s?/, '');
        return cleaned;
      })
      .join('\n');
  }

  if (style === 'separator') {
    // // ==== Title ==== 형식은 headingText만 사용하므로 빈 문자열 반환
    return '';
  }

  // 일반 한줄 주석: // ...
  return lines
    .map(line => line.trim().replace(/^\/\/\s?/, ''))
    .join('\n');
}

/**
 * 라인이 주석인지 판별
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/');
}

/**
 * 파일 상단 주석 추출 (첫 번째 import 전까지)
 */
export function extractFileHeader(lines: string[]): CodeDocSection | null {
  let headerLines: string[] = [];
  let inComment = false;
  let commentStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // import 구문을 만나면 중단
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      break;
    }

    // 주석 라인
    if (isCommentLine(line)) {
      if (!inComment) {
        commentStartLine = i + 1;
        inComment = true;
      }
      headerLines.push(line);
    }
    // 빈 라인
    else if (trimmed.length === 0) {
      if (inComment) {
        headerLines.push(line);
      }
    }
    // 코드 라인 (주석 아님)
    else {
      // 주석 블록이 끝났으면 중단
      if (inComment) {
        break;
      }
    }
  }

  // 주석이 없으면 null 반환
  if (headerLines.length === 0) {
    return null;
  }

  // 주석 텍스트 정제
  const commentText = headerLines.join('\n');
  const { style, headingText } = analyzeCommentStyle(commentText);
  const cleanedContent = cleanCommentText(commentText, style);

  return {
    type: 'fileHeader',
    content: cleanedContent,
    startLine: commentStartLine,
    endLine: commentStartLine + headerLines.length - 1,
    commentStyle: style,
    headingText,
    depth: 0
  };
}
