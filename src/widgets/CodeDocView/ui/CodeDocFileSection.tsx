/**
 * CodeDocFileSection - 파일별 CodeDoc 섹션 렌더링
 */

import React, { forwardRef, useMemo, useState, useEffect, useRef } from 'react';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import { parseCodeDoc } from '../../../entities/CodeDoc/lib/parseCodeDoc';
import { getFileName } from '../../../shared/pathUtils';
import { getFileIcon } from '../../FileExplorer/lib/getFileIcon';
import CommentSection from './CommentSection';
import CodeSnippetSection from './CodeSnippetSection';
import ExportSection from './ExportSection';

interface CodeDocFileSectionProps {
  node: SourceFileNode;
}

const CodeDocFileSection = forwardRef<HTMLDivElement, CodeDocFileSectionProps>(({ node }, ref) => {
  const fileName = getFileName(node.filePath);
  const FileIconComponent = getFileIcon(fileName);

  // 섹션 파싱 (캐싱)
  const sections = useMemo(() => {
    return parseCodeDoc(node);
  }, [node]);

  // 메타데이터 계산
  const totalLines = node.codeSnippet.split('\n').length;
  const exportCount = sections.filter(s => s.type === 'export').length;
  const codeBlocks = sections.filter(s => s.type === 'code' || s.type === 'jsx').length;

  // Sticky 상태 감지
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // 큰 헤더가 화면에서 사라지면 sticky bar 표시
        setIsSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-1px 0px 0px 0px'
      }
    );

    observer.observe(headerElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      id={`codedoc-section-${node.filePath}`}
      className="border-b border-border-DEFAULT mb-24 pb-16"
    >
      {/* Sticky bar - sticky 상태일 때만 표시, full-width */}
      {isSticky && (
        <div className="sticky top-0 z-10 bg-bg-elevated border-b border-border-DEFAULT px-8 py-2 flex items-center gap-3 shadow-sm">
          <FileIconComponent size={16} className="text-warm-300" />
          <span className="text-sm font-medium text-text-primary">{fileName}</span>
        </div>
      )}

      {/* 큰 헤더 - 스크롤됨 */}
      <div ref={headerRef} className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <FileIconComponent size={32} className="text-warm-300" />
          <h1 className="text-4xl font-bold text-text-primary">{fileName}</h1>
        </div>
        <div className="flex items-center gap-6 text-sm text-text-tertiary ml-12">
          <span className="font-mono text-xs">{node.filePath}</span>
          <span className="text-text-muted">•</span>
          <span>{totalLines} lines</span>
          <span className="text-text-muted">•</span>
          <span>{exportCount} exports</span>
          <span className="text-text-muted">•</span>
          <span>{codeBlocks} code blocks</span>
        </div>
      </div>

      {/* 섹션 렌더링 */}
      <div className="px-8">
        {sections.map((section, idx) => (
          <div key={idx}>
            {section.type === 'comment' ? (
              <CommentSection section={section} />
            ) : section.type === 'export' ? (
              <ExportSection section={section} />
            ) : (
              <CodeSnippetSection section={section} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

CodeDocFileSection.displayName = 'CodeDocFileSection';

export default CodeDocFileSection;
