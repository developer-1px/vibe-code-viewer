import React, { useMemo } from 'react';
import { CanvasNode } from '../../../CanvasNode';
import LocalReferenceItem from './LocalReferenceItem.tsx';

interface CodeCardReferencesProps {
  node: CanvasNode;
}

const CodeCardReferences: React.FC<CodeCardReferencesProps> = ({ node }) => {
  // Extract external references from functionAnalysis
  const externalReferences = useMemo(() => {
    if (!node.functionAnalysis) return [];

    const refs = node.functionAnalysis.externalDeps
      .filter(dep => dep.definedIn)
      .map(dep => {
        const refType: 'pure-function' | 'function' = dep.type === 'import' ? 'pure-function' : 'function';
        return {
          nodeId: dep.definedIn!,
          name: dep.name,
          summary: dep.type === 'import' && dep.source
            ? `from ${dep.source}`
            : dep.closureScope === 'file' ? 'file-level' : 'closure',
          type: refType,
          isImport: dep.type === 'import',
        };
      });

    // Sort: imports (npm modules) first, then file-level variables
    return refs.sort((a, b) => {
      if (a.isImport && !b.isImport) return -1;
      if (!a.isImport && b.isImport) return 1;
      return 0;
    });
  }, [node.functionAnalysis]);

  // Check if we have any references to show
  const hasReferences = externalReferences.length > 0 ||
    (node.localReferences && node.localReferences.length > 0) ||
    (node.vueTemplateRefs && node.vueTemplateRefs.length > 0);

  if (!hasReferences) return null;

  return (
    <div className="flex flex-col gap-0.5 bg-[#0d1526] border-y border-white/5 py-2">
      <div className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        {externalReferences.length > 0 ? 'External References' : (node.type === 'module' ? 'Variables' : 'Local References')}
      </div>
      {/* Show external references if available (for functions analyzed by functional parser) */}
      {externalReferences.length > 0 ? (
        externalReferences.map((ref, idx) => (
          <LocalReferenceItem key={`${ref.nodeId}-${idx}`} reference={ref} />
        ))
      ) : (
        <>
          {/* Local references (for JSX_ROOT, TEMPLATE_ROOT, FILE_ROOT) */}
          {node.localReferences?.map((ref, idx) => (
            <LocalReferenceItem key={`${ref.nodeId}-${idx}`} reference={ref} />
          ))}
          {/* Vue Template references (for Vue Module nodes) */}
          {node.vueTemplateRefs?.map((ref, idx) => (
            <LocalReferenceItem key={`vue-${ref.nodeId}-${idx}`} reference={ref} />
          ))}
        </>
      )}
    </div>
  );
};

export default CodeCardReferences;
