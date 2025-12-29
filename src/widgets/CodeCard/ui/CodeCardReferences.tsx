import React, { useMemo } from 'react';
import { CanvasNode } from '../../../entities/CanvasNode';
import LocalReferenceItem from './LocalReferenceItem';

const CodeCardReferences = ({node }: {
  node: CanvasNode;
}) => {
  // Extract external references from functionAnalysis or dependencies
  const externalReferences = useMemo(() => {
    // 1. functionAnalysis가 있으면 externalDeps 사용
    if (node.functionAnalysis) {
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
    }

    // 2. functionAnalysis가 없으면 dependencies 사용 (template/file 노드)
    if (node.dependencies && node.dependencies.length > 0) {
      return node.dependencies.map(dep => {
        const name = dep.split('::').pop() || dep;
        return {
          nodeId: dep,
          name,
          summary: 'dependency',
          type: 'pure-function' as const,
          isImport: true,
        };
      });
    }

    return [];
  }, [node.functionAnalysis, node.dependencies]);

  // Check if we have any references to show
  const hasReferences = externalReferences.length > 0 ||
    (node.localReferences && node.localReferences.length > 0) ||
    (node.vueTemplateRefs && node.vueTemplateRefs.length > 0);

  if (!hasReferences) return null;

  return (
    <div className="flex flex-col gap-0.5 bg-[#0d1526] border-y border-white/5 py-2">
      <div className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        {externalReferences.length > 0 ? 'External References' : 'Local References'}
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
