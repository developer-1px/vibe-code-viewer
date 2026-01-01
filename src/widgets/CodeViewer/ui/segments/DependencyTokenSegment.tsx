/**
 * DependencyTokenSegment - 의존성 토큰 렌더링 (CodeToken 래핑)
 * identifier with nodeId의 특수 케이스
 */

import React from 'react';
import type { CodeSegment, SegmentStyle } from '../../core/types';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import CodeToken from '../CodeToken';

interface DependencyTokenSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  lineHasFocusedVariable?: boolean;
  isFocused?: boolean;
}

export const DependencyTokenSegment: React.FC<DependencyTokenSegmentProps> = ({ segment, node, style, lineHasFocusedVariable, isFocused }) => {
  const className = isFocused
    ? `${style.className} bg-cyan-500/30 rounded`
    : style.className;

  return (
    <span className={className}>
      <CodeToken
        text={segment.text}
        tokenId={segment.nodeId!}
        nodeId={node.id}
        lineHasFocusedVariable={lineHasFocusedVariable}
      />
    </span>
  );
};
