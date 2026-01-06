/**
 * renderPlaintext - Phase B: Progressive Rendering
 * 파싱 없이 즉시 텍스트만 렌더링 (초고속)
 */

import type { SourceFileNode } from '../../../../entities/SourceFileNode/model/types';
import type { CodeLine } from '../types';

/**
 * 파일 내용을 plaintext CodeLine[]로 변환 (파싱 없음)
 * - Syntax highlighting 없음
 * - 토큰 정보 없음
 * - 단순 텍스트만 표시
 *
 * 목적: 즉시 화면에 표시하여 사용자 대기 시간 최소화
 */
export function renderPlaintext(node: SourceFileNode, files: Record<string, string>): CodeLine[] {
  const content = files[node.filePath] || node.codeSnippet || '';
  const lines = content.split('\n');

  return lines.map((lineText, idx) => ({
    num: idx + 1,
    text: lineText,
    segments: [
      {
        text: lineText,
        style: {
          className: 'text-text-primary', // 기본 텍스트 색상
        },
      },
    ],
    // 최소한의 메타데이터
    hasDeclarationKeyword: false,
    tokens: [],
    dependencyTokens: [],
    localVariables: new Set<string>(),
  }));
}
