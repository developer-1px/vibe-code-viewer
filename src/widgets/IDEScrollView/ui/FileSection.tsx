/**
 * FileSection - 개별 파일 섹션 (헤더 + CodeViewer)
 * 스크롤 뷰에서 하나의 파일을 표시하는 단위
 */

import React, { useMemo, forwardRef } from 'react';
import { useAtomValue } from 'jotai';
import { FileText } from 'lucide-react';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import { deadCodeResultsAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import { renderCodeLinesDirect } from '../../CodeViewer/core/renderer/renderCodeLinesDirect';
import { renderVueFile } from '../../CodeViewer/core/renderer/renderVueFile';
import CodeViewer from '../../CodeViewer/CodeViewer';
import { getFileName } from '../../../shared/pathUtils';

const FileSection = forwardRef<HTMLDivElement, {
  node: SourceFileNode;
  files: Record<string, string>;
  highlightedLines: Set<number>;
}>(({ node, files, highlightedLines }, ref) => {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const fileName = getFileName(node.filePath);

  // Process code lines
  const processedLines = useMemo(() => {
    if (node.filePath.endsWith('.vue')) {
      return renderVueFile(node, files);
    }
    return renderCodeLinesDirect(node, files, deadCodeResults);
  }, [node, files, deadCodeResults]);

  return (
    <div
      ref={ref}
      id={`file-section-${node.filePath}`}
      className="border-b border-border-DEFAULT"
    >
      {/* 파일 헤더 */}
      <div className="sticky top-0 z-10 bg-bg-elevated border-b border-border-hover px-4 py-2 flex items-center gap-2 shadow-sm">
        <FileText size={14} className="text-text-secondary" />
        <span className="text-sm font-medium text-text-primary">{fileName}</span>
        <span className="text-xs text-text-tertiary ml-auto">{node.filePath}</span>
      </div>

      {/* 코드 뷰어 */}
      <CodeViewer
        processedLines={processedLines}
        node={node}
        highlightedLines={highlightedLines}
      />
    </div>
  );
});

FileSection.displayName = 'FileSection';

export default FileSection;
