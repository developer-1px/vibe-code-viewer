
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { LocalReference } from '../../../entities/VariableNode/model/types';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom, entryFileAtom, templateRootIdAtom, foldedLinesAtom } from '../../../store/atoms';
import { pruneDetachedNodes } from '../../PipelineCanvas/utils';
import { getNodeBorderColor } from '../../../entities/VariableNode/lib/styleUtils';

const LocalReferenceItem = ({reference }: {
  reference: LocalReference;
}) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const setFoldedLinesMap = useSetAtom(foldedLinesAtom);

  const isActive = visibleNodeIds.has(reference.nodeId);
  const isLinkable = fullNodeMap.has(reference.nodeId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    console.log(`🎯 [LocalReferenceItem] ${reference.name} clicked:`, {
      nodeId: reference.nodeId,
      isActive,
      isLinkable,
      forceExpand: e.metaKey || e.ctrlKey,
      hasInFullNodeMap: fullNodeMap.has(reference.nodeId),
    });

    if (!isLinkable) {
      // 노드가 없으면 아무것도 하지 않음
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

    // Unfold the target node when expanding (Module 노드의 경우 접혀있을 수 있음)
    if (isExpanding || forceExpand) {
      // 해당 노드가 접힌 범위 내부에 있는지 확인하고, 관련된 fold만 해제
      const targetNode = fullNodeMap.get(reference.nodeId);

      console.log('🔓 [LocalReferenceItem] Unfolding:', {
        referenceNodeId: reference.nodeId,
        referenceName: reference.name,
        targetNode: targetNode ? 'found' : 'NOT FOUND',
        targetStartLine: targetNode?.startLine
      });

      if (targetNode && targetNode.startLine !== undefined) {
        const targetLineNum = targetNode.startLine;

        // 부모 노드(파일 노드)의 fold 찾기
        // reference.nodeId는 "filePath::name" 형태
        const parentNodeId = reference.nodeId.split('::')[0]; // 파일 경로 직접 사용

        console.log('🔓 [LocalReferenceItem] Parent node:', {
          parentNodeId,
          targetLineNum
        });

        setFoldedLinesMap((prev) => {
          const next = new Map(prev);
          const parentFolds = next.get(parentNodeId);

          console.log('🔓 [LocalReferenceItem] Current folds:', {
            parentNodeId,
            hasFolds: !!parentFolds,
            foldCount: parentFolds?.size,
            folds: parentFolds ? Array.from(parentFolds) : []
          });

          if (parentFolds) {
            // 모든 fold 제거
            next.delete(parentNodeId);
            console.log('🔓 [LocalReferenceItem] Removed all folds for', parentNodeId);
          }

          return next;
        });
      }

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
