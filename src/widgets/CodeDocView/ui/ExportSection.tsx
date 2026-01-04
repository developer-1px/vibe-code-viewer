/**
 * ExportSection - export 선언을 문서 본문처럼 렌더링
 */

import React from 'react';
import type { CodeDocSection } from '../../../entities/CodeDoc/model/types';

interface ExportSectionProps {
  section: CodeDocSection;
}

const ExportSection = ({ section }: ExportSectionProps) => {
  if (section.type !== 'export') return null;

  const { content } = section;

  return (
    <div className="mt-16 mb-4 px-5 py-3 bg-blue-500/5 border-l-2 border-blue-400 rounded-r-lg shadow-sm">
      <code className="text-sm text-text-primary font-mono leading-relaxed">
        {content}
      </code>
    </div>
  );
};

export default ExportSection;
