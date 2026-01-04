/**
 * SegmentRenderer - 순수 라우터
 * clickType에 따라 적절한 하위 컴포넌트로 라우팅
 */


import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import type { CodeSegment, SegmentKind, CodeLine } from '../core/types/codeLine';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';
import { buildSegmentStyle } from '../core/styler/styleBuilder';
import { visibleNodeIdsAtom } from '../../PipelineCanvas/model/atoms';
import { activeLocalVariablesAtom } from '@/features/Code/FocusMode/model/atoms';
import { useEditorTheme } from '../../../app/theme/EditorThemeProvider';
import { StaticSegment } from './segments/StaticSegment';
import { ExpandSegment } from './segments/ExpandSegment';
import { ExternalSegment } from './segments/ExternalSegment';
import { LocalVariableSegment } from '@/features/Code/FocusMode/ui/LocalVariableSegment';
import { DependencyTokenSegment } from './segments/DependencyTokenSegment';

// Helper: Identifier 종류인지 체크
const IDENTIFIER_KINDS: SegmentKind[] = [
  'identifier',
  'local-variable',
  'parameter',
  'self',
  'external-import',
  'external-closure',
  'external-function'
];

const isIdentifierSegment = (segment: CodeSegment): boolean => {
  return segment.kinds?.some(kind => IDENTIFIER_KINDS.includes(kind)) ?? false;
};

export const SegmentRenderer = ({
  segment,
  segIdx,
  node,
  line,
  isFolded = false,
  foldedCount
}: {
  segment: CodeSegment;
  segIdx: number;
  node: CanvasNode;
  line: CodeLine;
  isFolded?: boolean;
  foldedCount?: number;
}) => {
  const theme = useEditorTheme();
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);

  // Focus mode: active identifier가 포함된 line인지 체크
  const focusedVariables = activeLocalVariables.get(node.id);
  const hasFocusMode = focusedVariables && focusedVariables.size > 0;

  const lineHasFocusedVariable = useMemo(() => {
    if (!hasFocusMode) return false;
    return line.segments.some(seg => {
      return isIdentifierSegment(seg) && focusedVariables.has(seg.text);
    });
  }, [hasFocusMode, line.segments, focusedVariables]);

  // 최상위 return 문의 범위 계산
  const isInReturnStatement = useMemo(() => {
    if (!line.hasTopLevelReturn) return false;

    const startIdx = line.segments.findIndex(seg => seg.kinds?.includes('keyword') && seg.text === 'return');
    if (startIdx === -1) return false;

    // return 이후 세미콜론 찾기
    let endIdx = line.segments.findIndex((seg, idx) =>
      idx > startIdx && seg.kinds?.includes('punctuation') && seg.text === ';'
    );

    // 세미콜론이 없으면 라인 끝까지
    if (endIdx === -1) {
      endIdx = line.segments.length - 1;
    }

    return segIdx >= startIdx && segIdx <= endIdx;
  }, [line.segments, line.hasTopLevelReturn, segIdx]);

  // 모든 hook 호출 후 early return 체크
  const foldInfo = line.foldInfo;

  // Import block이 접혔을 때: import 키워드만 남기고 나머지 숨김
  if (isFolded && foldInfo?.foldType === 'import-block') {
    // import 키워드만 표시
    if (segment.text.trim() !== 'import') {
      return null;
    }
  }

  // Statement block 또는 JSX의 마지막 문자 제거
  if (isFolded && segIdx === line.segments.length - 1) {
    // Statement block의 경우 마지막 { 제거
    if (segment.text.trim() === '{') {
      return null;
    }
    // JSX의 경우 마지막 > 제거
    if (segment.text.trim() === '>' && (foldInfo?.foldType === 'jsx-children' || foldInfo?.foldType === 'jsx-fragment')) {
      return null;
    }
  }

  // external-import의 active 상태 체크 (해당 노드가 열려있는지)
  const isExternalActive = segment.kinds?.includes('external-import') &&
    segment.definedIn &&
    (visibleNodeIds.has(segment.definedIn) || visibleNodeIds.has(segment.definedIn.split('::')[0]));

  // local-variable 또는 parameter의 active 상태 체크 (사용자가 활성화했는지)
  const isLocalActive = (segment.kinds?.includes('local-variable') || segment.kinds?.includes('parameter')) &&
    activeLocalVariables.get(node.id)?.has(segment.text) || false;

  // Check if this segment is focused
  const isFocused = focusedVariables?.has(segment.text) || false;

  // Build style
  const style = buildSegmentStyle(segment.kinds, {
    isDeclarationName: segment.isDeclarationName,
    hasNodeId: !!segment.nodeId,
    hasDefinedIn: !!segment.definedIn,
    hasDefinition: !!segment.definitionLocation,
    hasHoverInfo: !!segment.hoverInfo,
    isInReturn: isInReturnStatement,
    isActive: isExternalActive || isLocalActive,
    focusedVariables: lineHasFocusedVariable ? undefined : focusedVariables, // Line이 focused면 normal highlighting
    segmentText: segment.text,
    theme: theme,  // Pass theme to styleBuilder
    isDead: segment.isDead  // ✅ VSCode-like muted styling for dead identifiers
  });

  // Special case: identifier with nodeId → DependencyTokenSegment
  // 단, external-* 종류는 제외 (이들은 definedIn을 사용하고 클릭 핸들러가 별도로 있음)
  if (
    segment.kinds?.includes('identifier') &&
    segment.nodeId &&
    !segment.kinds?.includes('external-import') &&
    !segment.kinds?.includes('external-closure') &&
    !segment.kinds?.includes('external-function')
  ) {
    return <DependencyTokenSegment key={segIdx} segment={segment} node={node} style={style} lineHasFocusedVariable={lineHasFocusedVariable} isFocused={isFocused} />;
  }

  // 클릭 핸들러 기반 라우팅
  switch (style.clickType) {
    case 'expand':
      return <ExpandSegment key={segIdx} segment={segment} node={node} style={style} isFocused={isFocused} />;

    case 'external':
      return <ExternalSegment key={segIdx} segment={segment} node={node} style={style} isFocused={isFocused} />;

    case 'definition':
    case 'local-variable':
      return <LocalVariableSegment key={segIdx} segment={segment} node={node} style={style} isFocused={isFocused} />;

    default:
      return <StaticSegment key={segIdx} segment={segment} style={style} isFocused={isFocused} />;
  }
};
