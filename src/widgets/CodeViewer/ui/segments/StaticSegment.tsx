/**
 * StaticSegment - 클릭 불가능한 정적 텍스트
 * (keyword, punctuation, string, comment, text 등)
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { hoveredIdentifierAtom } from '@/app/model/atoms';
import type { CodeSegment, SegmentStyle } from '../../core/types';

interface StaticSegmentProps {
  segment: CodeSegment;
  style: SegmentStyle;
  isFocused?: boolean;
}

// Identifier 종류인지 체크
const IDENTIFIER_KINDS = [
  'identifier',
  'local-variable',
  'parameter',
  'self',
  'external-import',
  'external-closure',
  'external-function',
];
const isIdentifierSegment = (segment: CodeSegment): boolean => {
  return segment.kinds?.some((kind) => IDENTIFIER_KINDS.includes(kind)) ?? false;
};

export const StaticSegment: React.FC<StaticSegmentProps> = ({ segment, style, isFocused }) => {
  const hoveredIdentifier = useAtomValue(hoveredIdentifierAtom);
  const setHoveredIdentifier = useSetAtom(hoveredIdentifierAtom);

  const isIdentifier = isIdentifierSegment(segment);
  const isHovered = isIdentifier && hoveredIdentifier === segment.text;

  const handleMouseEnter = () => {
    if (isIdentifier) {
      setHoveredIdentifier(segment.text);
    }
  };

  const handleMouseLeave = () => {
    if (isIdentifier) {
      setHoveredIdentifier(null);
    }
  };

  const className = isFocused
    ? `${style.className} bg-cyan-500/30 rounded`
    : isHovered
      ? `${style.className} bg-yellow-400/20 rounded`
      : style.className;

  return (
    <span className={className} title={style.title} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {segment.text}
    </span>
  );
};
