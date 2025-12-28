/**
 * Vue Template Section Component
 *
 * Module 노드에서 Vue template을 렌더링
 */

import React from 'react';

interface VueTemplateSectionProps {
  template: string;
}

const VueTemplateSection: React.FC<VueTemplateSectionProps> = ({ template }) => {
  const lines = template.split('\n');

  return (
    <div className="border-t border-white/10 mt-2">
      {/* Template Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-emerald-900/20 to-transparent border-b border-white/5">
        <span className="text-xs font-semibold text-emerald-400">
          &lt;template&gt;
        </span>
      </div>

      {/* Template Content */}
      <div className="flex flex-col">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="flex items-start hover:bg-white/5 transition-colors duration-200"
          >
            {/* Line Number */}
            <div className="flex-shrink-0 w-12 px-2 py-0.5 text-right text-xs text-slate-600 select-none font-mono">
              {idx + 1}
            </div>

            {/* Template Code */}
            <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-5 overflow-x-auto whitespace-pre-wrap break-words">
              <span className="text-slate-300 select-text">{line}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VueTemplateSection;
