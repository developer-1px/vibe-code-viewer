import React, { useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Terminal as IconTerminal, Box as IconBox, FunctionSquare as IconFunctionSquare, LayoutTemplate as IconLayoutTemplate, Database as IconDatabase, Link2 as IconLink2,
  PlayCircle as IconPlayCircle, BoxSelect as IconBoxSelect,
  Calculator as IconCalculator, Shield as IconShield, Zap as IconZap, RefreshCw as IconRefreshCw, AlertCircle as IconAlertCircle,
  Maximize as IconMaximize, AlignJustify as IconCompact, Minimize as IconMinimize
} from 'lucide-react';
import { CanvasNode } from '../../../entities/CanvasNode';
import { visibleNodeIdsAtom, fullNodeMapAtom, activeLocalVariablesAtom, filesAtom, foldedLinesAtom, viewModeAtom, focusedNodeIdAtom } from '../../../store/atoms';
import { renderCodeLinesDirect, renderVueFile } from '../../CodeViewer/core';
import { pruneDetachedNodes } from '../../PipelineCanvas/utils';
import { getFoldableLinesByMaxDepth, getFoldableLinesExcludingDepth } from '../../../features/CodeFold/lib';

const CodeCardHeader = ({ node }: { node: CanvasNode }) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);
  const files = useAtomValue(filesAtom);
  const [foldedLinesMap, setFoldedLinesMap] = useAtom(foldedLinesAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const setFocusedNodeId = useSetAtom(focusedNodeIdAtom);

  // Focused identifiers for this node
  const focusedVariables = activeLocalVariables.get(node.id);

  // Process code lines to extract metadata
  const processedLines = useMemo(() => {
    if (node.filePath.endsWith('.vue')) {
      return renderVueFile(node, files);
    }
    return renderCodeLinesDirect(node, files);
  }, [node, files]);

  // Extract metadata for each focused identifier
  const identifiersWithMetadata = useMemo(() => {
    if (!focusedVariables || focusedVariables.size === 0) {
      return [];
    }

    const metadata: Array<{ name: string; hoverInfo?: string; definedIn?: string }> = [];

    focusedVariables.forEach((identifier) => {
      // Find first occurrence of this identifier in segments
      for (const line of processedLines) {
        const segment = line.segments.find(seg => seg.text === identifier);
        if (segment) {
          metadata.push({
            name: identifier,
            hoverInfo: segment.hoverInfo,
            definedIn: segment.definedIn
          });
          return; // Found, move to next identifier
        }
      }

      // If not found in segments, add without metadata
      metadata.push({
        name: identifier
      });
    });

    return metadata;
  }, [focusedVariables, processedLines]);

  // Handle removing a focused identifier
  const handleRemoveIdentifier = (identifierName: string, definedIn?: string) => {
    const isExternal = !!definedIn;
    const isActive = definedIn && (visibleNodeIds.has(definedIn) || visibleNodeIds.has(definedIn.split('::')[0]));

    // Remove from focus
    setActiveLocalVariables((prev: Map<string, Set<string>>) => {
      const next = new Map(prev);
      const nodeVars = new Set(next.get(node.id) || new Set());

      nodeVars.delete(identifierName);

      if (nodeVars.size > 0) {
        next.set(node.id, nodeVars);
      } else {
        next.delete(node.id);
      }

      return next;
    });

    // Close node if external and active
    if (isExternal && isActive && definedIn) {
      setVisibleNodeIds((prev: Set<string>) => {
        const next = new Set(prev);

        // 함수/변수 노드가 열려있으면 제거
        if (fullNodeMap.has(definedIn) && next.has(definedIn)) {
          next.delete(definedIn);
        }

        // 파일 노드가 열려있으면 제거
        const filePath = definedIn.split('::')[0];
        if (fullNodeMap.has(filePath) && next.has(filePath)) {
          next.delete(filePath);
        }

        return pruneDetachedNodes(next, fullNodeMap, null, null);
      });
    }
  };

  // Determine current fold level based on what's folded
  const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();

  const currentFoldLevel = useMemo(() => {
    const allFoldableLines = getFoldableLinesByMaxDepth(processedLines, 999);
    const depth1Lines = getFoldableLinesByMaxDepth(processedLines, 1); // import only
    const depth2ExcludedLines = getFoldableLinesExcludingDepth(processedLines, 2);

    // 실제로 접혀있는 라인 수 계산
    const allFoldedCount = allFoldableLines.filter(line => foldedLines.has(line)).length;
    const depth1FoldedCount = depth1Lines.filter(line => foldedLines.has(line)).length;
    const depth2ExcludedFoldedCount = depth2ExcludedLines.filter(line => foldedLines.has(line)).length;

    console.log(`[${node.label}] all: ${allFoldedCount}/${allFoldableLines.length}, depth1: ${depth1FoldedCount}/${depth1Lines.length}, excludeDepth2: ${depth2ExcludedFoldedCount}/${depth2ExcludedLines.length}, total folded: ${foldedLines.size}`);

    // Level 2 (all): 모든 foldable 라인이 접혀있음
    if (allFoldedCount === allFoldableLines.length && allFoldableLines.length > 0) {
      return 2;
    }

    // Level 1: depth 2를 제외한 모든 라인이 접혀있음
    if (depth2ExcludedFoldedCount === depth2ExcludedLines.length && depth2ExcludedLines.length > 0) {
      return 1;
    }

    // Level 0: depth 1 (import)만 접혀있음
    if (depth1FoldedCount === depth1Lines.length && depth1Lines.length > 0 && allFoldedCount === depth1FoldedCount) {
      return 0;
    }

    // 부분적으로 접힘 - 기본값 0
    return 0;
  }, [processedLines, foldedLines, node.label]);

  // Toggle fold level in cycle: 2 → 1 → 0 → 2
  const toggleFoldLevel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (processedLines.length === 0) return;

    const nextLevel = currentFoldLevel === 2 ? 1 : currentFoldLevel === 1 ? 0 : 2;
    console.log(`[${node.label}] Cycling fold level: ${currentFoldLevel} → ${nextLevel}`);

    setFoldedLinesMap(prev => {
      const next = new Map(prev);

      if (nextLevel === 0) {
        // Level 0: import만 접기, 나머지는 펴기
        const linesToFold = getFoldableLinesByMaxDepth(processedLines, 1); // depth 1 (import only)
        console.log(`[${node.label}] Level 0: Fold imports only:`, linesToFold);
        const nodeFolds = new Set<number>();
        linesToFold.forEach(lineNum => nodeFolds.add(lineNum));
        next.set(node.id, nodeFolds);
      } else if (nextLevel === 1) {
        // Level 1: 1개씩만 더 펴기 = depth 2만 펼치고 나머지 접기 (import + 중첩 블록 접기)
        const linesToFold = getFoldableLinesExcludingDepth(processedLines, 2);
        console.log(`[${node.label}] Level 1: Fold all except depth 2:`, linesToFold);
        const nodeFolds = new Set<number>();
        linesToFold.forEach(lineNum => nodeFolds.add(lineNum));
        next.set(node.id, nodeFolds);
      } else if (nextLevel === 2) {
        // Level 2: 다 접기 - 모든 foldable 라인 접기
        const linesToFold = getFoldableLinesByMaxDepth(processedLines, 999);
        console.log(`[${node.label}] Level 2: Fold all:`, linesToFold);
        const nodeFolds = new Set<number>();
        linesToFold.forEach(lineNum => nodeFolds.add(lineNum));
        next.set(node.id, nodeFolds);
      }

      console.log(`[${node.label}] New fold state size:`, next.get(node.id)?.size);
      return next;
    });
  };

  // Get icon based on current fold level
  const getFoldIcon = () => {
    if (currentFoldLevel === 2) return <IconMinimize className="w-3.5 h-3.5" />;
    if (currentFoldLevel === 1) return <IconCompact className="w-3.5 h-3.5" />;
    return <IconMaximize className="w-3.5 h-3.5" />;
  };

  // Get tooltip based on current fold level
  const getFoldTooltip = () => {
    if (currentFoldLevel === 2) return "Minimal - 다 접기 → Compact";
    if (currentFoldLevel === 1) return "Compact - 최상위 블록만 펼침 → Maximize";
    return "Maximize - Import만 접기 → Minimal";
  };

  const getIcon = () => {
    switch (node.type) {
      // === CALCULATIONS (불변, 청록/파랑 계열) ===
      case 'pure-function': return <IconCalculator className="w-4 h-4 text-cyan-400" />;
      case 'immutable-data': return <IconShield className="w-4 h-4 text-blue-400" />;
      case 'computed': return <IconFunctionSquare className="w-4 h-4 text-sky-400" />;

      // === STATE ACTIONS (상태 변경, 주황/노랑 계열) ===
      case 'ref': return <IconDatabase className="w-4 h-4 text-emerald-400" />; // 하위 호환
      case 'state-ref': return <IconDatabase className="w-4 h-4 text-amber-400" />;
      case 'state-action': return <IconRefreshCw className="w-4 h-4 text-orange-400" />;
      case 'mutable-ref': return <IconAlertCircle className="w-4 h-4 text-yellow-400" />;

      // === EFFECT ACTIONS (부수효과, 빨강/분홍 계열) ===
      case 'effect-action': return <IconZap className="w-4 h-4 text-red-400" />;
      case 'hook': return <IconLink2 className="w-4 h-4 text-violet-400" />;

      // === LEGACY/OTHER ===
      case 'function': return <IconTerminal className="w-4 h-4 text-amber-400" />;
      case 'template': return <IconLayoutTemplate className="w-4 h-4 text-pink-400" />;
      case 'call': return <IconPlayCircle className="w-4 h-4 text-yellow-400" />;
      case 'module': return <IconBoxSelect className="w-4 h-4 text-orange-400" />;

      default: return <IconBox className="w-4 h-4 text-slate-400" />;
    }
  };

  // Get display label with extension for file nodes
  const displayLabel = useMemo(() => {
    if (node.type === 'module' && node.filePath) {
      const fileName = node.filePath.split('/').pop() || node.label;
      return fileName;
    }
    return node.label;
  }, [node.type, node.filePath, node.label]);

  // Handle double-click to enter IDE view mode
  const handleDoubleClick = () => {
    setViewMode('ide');
    setFocusedNodeId(node.id);
  };

  return (
    <div
      className="px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-black/20 cursor-pointer select-none"
      onDoubleClick={handleDoubleClick}
      title="더블클릭하여 IDE 뷰로 전환"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Fold Level Toggle Button */}
        {processedLines.length > 0 && (
          <button
            onClick={toggleFoldLevel}
            className="p-1 rounded transition-colors text-slate-400 hover:bg-white/10 hover:text-slate-200"
            title={getFoldTooltip()}
          >
            {getFoldIcon()}
          </button>
        )}
        {getIcon()}
        <div className="flex flex-col">
          <span className="font-bold text-xs text-slate-100 truncate max-w-[300px]">{displayLabel}</span>
          <span className="text-[9px] text-slate-500 font-mono truncate max-w-[300px]">{node.filePath?.replace('src/', '') || node.filePath || ''}</span>
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono ml-2">
        {node.type === 'template' && node.id.includes('::') && !node.id.endsWith('::TEMPLATE_ROOT') && !node.id.endsWith('::JSX_ROOT') && !node.id.endsWith('::FILE_ROOT')
          ? 'component'
          : node.type}
      </span>
    </div>
  );
};

export default CodeCardHeader;
