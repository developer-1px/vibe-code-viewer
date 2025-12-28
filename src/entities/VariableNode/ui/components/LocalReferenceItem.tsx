
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { LocalReference } from '../../model/types';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom, entryFileAtom, templateRootIdAtom } from '../../../../store/atoms';
import { pruneDetachedNodes } from '../../../../widgets/PipelineCanvas/utils';
import { getNodeBorderColor } from '../../lib/styleUtils';

interface LocalReferenceItemProps {
  reference: LocalReference;
}

const LocalReferenceItem: React.FC<LocalReferenceItemProps> = ({ reference }) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);

  const isActive = visibleNodeIds.has(reference.nodeId);
  const isLinkable = fullNodeMap.has(reference.nodeId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Debug: Sidebar vs Header 비교
    if (reference.name === 'Sidebar' || reference.name === 'Header') {
      console.log(`🎯 [LocalReferenceItem] ${reference.name} clicked:`, {
        nodeId: reference.nodeId,
        isLinkable,
        hasInFullNodeMap: fullNodeMap.has(reference.nodeId),
        allMatchingKeys: Array.from(fullNodeMap.keys()).filter(k => k.includes(reference.name)),
      });
    }

    if (!isLinkable) {
      // Try FILE_ROOT fallback
      const filePath = reference.nodeId.split('::')[0];
      const fileRootId = `${filePath}::FILE_ROOT`;

      if (reference.name === 'Sidebar' || reference.name === 'Header') {
        console.log(`🔄 [LocalReferenceItem] ${reference.name} trying FILE_ROOT fallback:`, {
          fileRootId,
          hasFileRoot: fullNodeMap.has(fileRootId),
        });
      }

      if (fullNodeMap.has(fileRootId)) {
        setVisibleNodeIds((prev: Set<string>) => {
          const next = new Set(prev);
          next.add(fileRootId);
          return next;
        });
        setLastExpandedId(fileRootId);
      }
      return;
    }

    const forceExpand = e.metaKey || e.ctrlKey;
    let isExpanding = false;

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);

      if (next.has(reference.nodeId) && !forceExpand) {
        // TOGGLE OFF (Fold)
        console.log('🔽 Folding node:', reference.nodeId);
        next.delete(reference.nodeId);
        // Don't prune - let users manually manage external references
        return next;
      } else {
        // TOGGLE ON (Unfold Recursively)
        console.log('🔼 Expanding node:', reference.nodeId);
        isExpanding = true;

        const expandRecursive = (id: string) => {
          if (next.has(id)) return;
          next.add(id);

          const node = fullNodeMap.get(id);
          if (node) {
            // Stop expanding if we hit a template node
            if (node.type === 'template') return;

            node.dependencies.forEach(depId => {
              if (fullNodeMap.has(depId)) {
                expandRecursive(depId);
              }
            });
          }
        };

        expandRecursive(reference.nodeId);
        console.log('✅ Nodes after expansion:', Array.from(next));
      }
      return next;
    });

    // Center camera if expanding
    if (isExpanding || forceExpand) {
      setLastExpandedId(reference.nodeId);
    }
  };

  const borderColor = getNodeBorderColor(reference.type).replace('border-', 'border-l-');

  return (
    <div
      onClick={isLinkable ? handleClick : undefined}
      className={`
        group relative flex items-start gap-2 px-3 py-1.5 text-xs font-mono
        border-l-2 rounded-r transition-all duration-200
        ${borderColor}
        ${isLinkable ? 'cursor-pointer hover:bg-white/5' : 'cursor-default opacity-50'}
        ${isActive ? 'bg-white/10' : 'bg-transparent'}
      `}
      title={isLinkable ? 'Click to expand/collapse' : 'Node not found'}
    >
      {/* Variable/Function name */}
      <span className={`flex-shrink-0 font-semibold ${isActive ? 'text-vibe-accent' : 'text-slate-300'}`}>
        {reference.name}
      </span>

      {/* 1-line summary */}
      <span className="flex-1 text-slate-400 truncate opacity-70">
        {reference.summary}
      </span>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rounded-full bg-vibe-accent ring-2 ring-vibe-panel" />
      )}
    </div>
  );
};

export default LocalReferenceItem;
