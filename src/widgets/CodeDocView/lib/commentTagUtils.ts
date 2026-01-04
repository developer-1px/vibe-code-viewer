/**
 * 주석 태그 유틸리티
 * TODO, FIXME, NOTE 등의 태그를 감지하고 스타일 정보를 제공
 */

export type CommentTag = 'TODO' | 'FIXME' | 'NOTE' | 'HACK' | 'XXX' | 'BUG' | 'OPTIMIZE' | 'REVIEW';

export interface CommentTagInfo {
  tag: CommentTag;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

/**
 * 주석 내용에서 태그 추출
 */
export function extractCommentTag(content: string): CommentTag | null {
  const firstLine = content.split('\n')[0].trim();

  // TODO: ... 형식 감지
  if (/^TODO:/i.test(firstLine)) return 'TODO';
  if (/^FIXME:/i.test(firstLine)) return 'FIXME';
  if (/^NOTE:/i.test(firstLine)) return 'NOTE';
  if (/^HACK:/i.test(firstLine)) return 'HACK';
  if (/^XXX:/i.test(firstLine)) return 'XXX';
  if (/^BUG:/i.test(firstLine)) return 'BUG';
  if (/^OPTIMIZE:/i.test(firstLine)) return 'OPTIMIZE';
  if (/^REVIEW:/i.test(firstLine)) return 'REVIEW';

  return null;
}

/**
 * 태그별 색상 정보
 */
export function getCommentTagInfo(tag: CommentTag): CommentTagInfo {
  switch (tag) {
    case 'TODO':
      return {
        tag,
        colorClass: 'text-blue-700',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200'
      };
    case 'FIXME':
      return {
        tag,
        colorClass: 'text-red-700',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200'
      };
    case 'NOTE':
      return {
        tag,
        colorClass: 'text-green-700',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200'
      };
    case 'HACK':
      return {
        tag,
        colorClass: 'text-orange-700',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200'
      };
    case 'XXX':
      return {
        tag,
        colorClass: 'text-purple-700',
        bgClass: 'bg-purple-50',
        borderClass: 'border-purple-200'
      };
    case 'BUG':
      return {
        tag,
        colorClass: 'text-rose-700',
        bgClass: 'bg-rose-50',
        borderClass: 'border-rose-200'
      };
    case 'OPTIMIZE':
      return {
        tag,
        colorClass: 'text-teal-700',
        bgClass: 'bg-teal-50',
        borderClass: 'border-teal-200'
      };
    case 'REVIEW':
      return {
        tag,
        colorClass: 'text-indigo-700',
        bgClass: 'bg-indigo-50',
        borderClass: 'border-indigo-200'
      };
  }
}

/**
 * 태그를 제거한 내용 반환
 */
export function removeTagFromContent(content: string, tag: CommentTag): string {
  const lines = content.split('\n');
  const firstLine = lines[0];

  // TODO: ... 형식에서 TODO: 부분 제거
  const cleaned = firstLine.replace(new RegExp(`^${tag}:\\s*`, 'i'), '');

  return [cleaned, ...lines.slice(1)].join('\n');
}
