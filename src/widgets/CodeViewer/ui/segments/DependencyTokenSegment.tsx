/**
 * DependencyTokenSegment - 의존성 토큰 렌더링
 * 외부 파일의 변수/함수를 클릭하면 해당 파일을 열고 정의 위치로 이동
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { hoveredIdentifierAtom } from '@/app/model/atoms';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types';
import { getTokenStyle } from '../../../../entities/SourceFileNode/lib/styleUtils';
import type { CodeSegment, SegmentStyle } from '../../core/types';

interface DependencyTokenSegmentProps {
  segment: CodeSegment;
  node: CanvasNode;
  style: SegmentStyle;
  lineHasFocusedVariable?: boolean;
  isFocused?: boolean;
}

export const DependencyTokenSegment: React.FC<DependencyTokenSegmentProps> = ({
  segment,
  node,
  style,
  lineHasFocusedVariable,
  isFocused,
}) => {
  const { openFile } = useOpenFile();
  const hoveredIdentifier = useAtomValue(hoveredIdentifierAtom);
  const setHoveredIdentifier = useSetAtom(hoveredIdentifierAtom);

  const isHovered = hoveredIdentifier === segment.text;

  const isComponent = /^[A-Z]/.test(segment.text);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // definitionLocation이 있으면 해당 파일을 열고 정의 위치로 이동
    if (segment.definitionLocation) {
      // Cmd+Click이 아니어도 작동하도록 하려면
      // metaKey를 체크하지 않고 바로 실행
      e.preventDefault();

      const { filePath, line } = segment.definitionLocation;
      openFile(filePath, { lineNumber: line });
      return;
    }

    // Fallback: nodeId로 이동 (기존 동작)
    // TODO: 여기에 기존 CodeToken의 토글 로직 추가 가능
  };

  const handleMouseEnter = () => {
    setHoveredIdentifier(segment.text);
  };

  const handleMouseLeave = () => {
    setHoveredIdentifier(null);
  };

  const className = isFocused
    ? `${style.className} bg-cyan-500/30 rounded`
    : isHovered
      ? `${style.className} bg-yellow-400/20 rounded`
      : style.className;

  return (
    <span
      className={`${className} inline-block rounded transition-all duration-200 select-text cursor-pointer border ${getTokenStyle(false, isComponent)}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {segment.text}
    </span>
  );
};
