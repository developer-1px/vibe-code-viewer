/**
 * DependencyTokenSegment - 의존성 토큰 렌더링 (CodeCardToken 래핑)
 * identifier with nodeId의 특수 케이스
 */

import React from 'react';
import type { CodeSegment, SegmentStyle } from '../../../../entities/CodeSegment';
import type { CanvasNode } from '../../../../entities/CanvasNode';
import CodeCardToken from '../CodeCardToken';

interface DependencyTokenSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
}

export const DependencyTokenSegment: React.FC<DependencyTokenSegmentProps> = ({ segment, node, style }) => {
  return (
    <span className={style.className}>
      <CodeCardToken
        text={segment.text}
        tokenId={segment.nodeId!}
        nodeId={node.id}
      />
    </span>
  );
};
