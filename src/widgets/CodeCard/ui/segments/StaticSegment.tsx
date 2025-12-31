/**
 * StaticSegment - 클릭 불가능한 정적 텍스트
 * (keyword, punctuation, string, comment, text 등)
 */

import React from 'react';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';

interface StaticSegmentProps {
  segment: CodeSegment;
  style: SegmentStyle;
  isFocused?: boolean;
}

export const StaticSegment: React.FC<StaticSegmentProps> = ({ segment, style, isFocused }) => {
  const className = isFocused
    ? `${style.className} bg-cyan-500/30 rounded`
    : style.className;

  return (
    <span className={className} title={style.title}>
      {segment.text}
    </span>
  );
};
