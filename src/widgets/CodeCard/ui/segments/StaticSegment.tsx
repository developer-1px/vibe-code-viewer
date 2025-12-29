/**
 * StaticSegment - 클릭 불가능한 정적 텍스트
 * (keyword, punctuation, string, comment, text 등)
 */

import React from 'react';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';

interface StaticSegmentProps {
  segment: CodeSegment;
  style: SegmentStyle;
}

export const StaticSegment: React.FC<StaticSegmentProps> = ({ segment, style }) => {
  return (
    <span className={style.className} title={style.title}>
      {segment.text}
    </span>
  );
};
