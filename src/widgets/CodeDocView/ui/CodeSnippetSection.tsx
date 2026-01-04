/**
 * CodeSnippetSection - 코드를 스니펫 박스로 렌더링
 */

import React from 'react';
import type { CodeDocSection } from '../../../entities/CodeDoc/model/types';

interface CodeSnippetSectionProps {
  section: CodeDocSection;
}

const CodeSnippetSection = ({ section }: CodeSnippetSectionProps) => {
  // comment만 제외, 모든 코드 타입 렌더링 (code, jsx, control, export)
  if (section.type === 'comment') return null;

  const { content, startLine } = section;
  const lines = content.split('\n');

  return (
    <div className="mt-3 mb-16 bg-bg-elevated border border-border-DEFAULT rounded-lg overflow-hidden">
      {/* 코드 내용 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-bg-hover">
                {/* 라인 번호 */}
                <td className="px-4 py-0.5 text-[10px] text-text-muted text-right select-none w-10 font-mono">
                  {startLine + idx}
                </td>
                {/* 코드 라인 */}
                <td className="px-4 py-0.5 text-xs font-mono whitespace-pre">
                  <code className="text-text-secondary">{line || ' '}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CodeSnippetSection;
