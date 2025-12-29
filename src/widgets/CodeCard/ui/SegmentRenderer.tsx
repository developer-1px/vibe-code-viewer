/**
 * SegmentRenderer - 순수 라우터
 * clickType에 따라 적절한 하위 컴포넌트로 라우팅
 */

import React from 'react';
import { useAtomValue } from 'jotai';
import type { CodeSegment } from '../../../entities/CodeSegment';
import type { CanvasNode } from '../../../entities/CanvasNode';
import { buildSegmentStyle } from '../../../entities/CodeSegment';
import { visibleNodeIdsAtom, activeLocalVariablesAtom } from '../../../store/atoms';
import {
  StaticSegment,
  CloseSegment,
  ExpandSegment,
  ExternalSegment,
  DefinitionSegment,
  LocalVariableSegment,
  DependencyTokenSegment
} from './segments';

export const SegmentRenderer = ({
  segment,
  segIdx,
  node,
  isInReturnStatement
}: {
  segment: CodeSegment;
  segIdx: number;
  node: CanvasNode;
  isInReturnStatement: boolean;
}) => {
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);

  // external-import의 active 상태 체크 (해당 노드가 열려있는지)
  const isExternalActive = segment.kinds.includes('external-import') &&
    segment.definedIn &&
    (visibleNodeIds.has(segment.definedIn) || visibleNodeIds.has(segment.definedIn.split('::')[0]));

  // local-variable의 active 상태 체크 (사용자가 활성화했는지)
  const isLocalActive = segment.kinds.includes('local-variable') &&
    activeLocalVariables.get(node.id)?.has(segment.text) || false;

  // Build style
  const style = buildSegmentStyle(segment.kinds, {
    isDeclarationName: segment.isDeclarationName,
    hasNodeId: !!segment.nodeId,
    hasDefinedIn: !!segment.definedIn,
    hasDefinition: !!segment.definitionLocation,
    hasHoverInfo: !!segment.hoverInfo,
    isInReturn: isInReturnStatement,
    isActive: isExternalActive || isLocalActive
  });

  // Special case: identifier with nodeId → DependencyTokenSegment
  // 단, external-* 종류는 제외 (이들은 definedIn을 사용하고 클릭 핸들러가 별도로 있음)
  if (
    segment.kinds.includes('identifier') &&
    segment.nodeId &&
    !segment.kinds.includes('external-import') &&
    !segment.kinds.includes('external-closure') &&
    !segment.kinds.includes('external-function')
  ) {
    return <DependencyTokenSegment key={segIdx} segment={segment} node={node} style={style} />;
  }

  // 클릭 핸들러 기반 라우팅
  switch (style.clickType) {
    case 'close':
      return <CloseSegment key={segIdx} segment={segment} node={node} style={style} />;

    case 'expand':
      return <ExpandSegment key={segIdx} segment={segment} node={node} style={style} />;

    case 'external':
      return <ExternalSegment key={segIdx} segment={segment} node={node} style={style} />;

    case 'definition':
      return <DefinitionSegment key={segIdx} segment={segment} node={node} style={style} />;

    case 'local-variable':
      return <LocalVariableSegment key={segIdx} segment={segment} node={node} style={style} />;

    default:
      return <StaticSegment key={segIdx} segment={segment} style={style} />;
  }
};
