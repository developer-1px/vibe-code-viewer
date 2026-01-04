/**
 * CommentSection - 주석을 문서 본문처럼 렌더링
 */

import React from 'react';
import type { CodeDocSection } from '../../../entities/CodeDoc/model/types';

interface CommentSectionProps {
  section: CodeDocSection;
}

const CommentSection = ({ section }: CommentSectionProps) => {
  if (section.type !== 'comment') return null;

  const { depth = 0, commentStyle, headingText, content } = section;

  // Separator 스타일: 구분선 + 큰 제목
  if (commentStyle === 'separator' && headingText) {
    return (
      <div className="mt-20 mb-12">
        <div className="border-t border-border-medium mb-8" />
        <h1 className="text-3xl font-bold text-center text-text-primary mb-8">
          {headingText}
        </h1>
        <div className="border-t border-border-medium mt-8" />
      </div>
    );
  }

  // JSDoc 스타일: 연한 배경 패널 (위: 큰 간격, 아래: 작은 간격)
  if (commentStyle === 'jsdoc') {
    return (
      <div className="mt-16 mb-4 px-5 py-3 bg-warm-500/5 border-l-2 border-warm-400 rounded-r-lg shadow-sm">
        <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{content}</div>
      </div>
    );
  }

  // XML Doc 스타일: 파란 테두리 강조 (위: 큰 간격, 아래: 작은 간격)
  if (commentStyle === 'xml') {
    return (
      <div className="mt-16 mb-4 px-5 py-3 bg-status-info/5 border-l-2 border-status-info rounded-r-lg shadow-sm">
        <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{content}</div>
      </div>
    );
  }

  // Depth에 따른 제목 스타일
  if (depth === 0) {
    // h1 스타일 (최상위) - 위: 큰 간격, 아래: 작은 간격
    return (
      <h1 className="mt-14 mb-4 text-2xl font-bold text-text-primary leading-snug whitespace-pre-wrap">{content}</h1>
    );
  }

  if (depth === 1) {
    // h2 스타일 (블록 내부) - 작게, 위: 큰 간격, 아래: 작은 간격
    return (
      <h2 className="mt-12 mb-3 text-base font-semibold text-text-secondary leading-snug whitespace-pre-wrap">{content}</h2>
    );
  }

  // depth 2+ : h3 스타일 (더 깊은 블록) - 더 작게, 위: 큰 간격, 아래: 작은 간격
  return (
    <h3 className="mt-10 mb-3 text-sm font-medium text-text-tertiary leading-snug whitespace-pre-wrap">{content}</h3>
  );
};

export default CommentSection;
