import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Terminal as IconTerminal, Box as IconBox, FunctionSquare as IconFunctionSquare, LayoutTemplate as IconLayoutTemplate, Database as IconDatabase, Link2 as IconLink2,
  PlayCircle as IconPlayCircle, BoxSelect as IconBoxSelect, ChevronsDown as IconChevronsDown, ChevronsUp as IconChevronsUp,
  Calculator as IconCalculator, Shield as IconShield, Zap as IconZap, RefreshCw as IconRefreshCw, AlertCircle as IconAlertCircle, GripVertical as IconGripVertical,
  X as IconX
} from 'lucide-react';
import { CanvasNode } from '../../../entities/CanvasNode';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom, cardPositionsAtom, transformAtom, activeFileAtom, activeLocalVariablesAtom, filesAtom, entryFileAtom, templateRootIdAtom } from '../../../store/atoms';
import { checkAllDepsExpanded, expandDependenciesRecursive, collapseDependencies, getFirstDependency } from '../../../entities/SourceFileNode/model/nodeVisibility';
import { renderCodeLines } from '../../../entities/CodeRenderer/lib/renderCodeLines';
import { renderVueFile } from '../../../entities/CodeRenderer/lib/renderVueFile';
import { pruneDetachedNodes } from '../../PipelineCanvas/utils';

const CodeCardHeader = ({ node }: { node: CanvasNode }) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const setCardPositions = useSetAtom(cardPositionsAtom);
  const transform = useAtomValue(transformAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);
  const files = useAtomValue(filesAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startOffset: { x: number; y: number } } | null>(null);

  // Check if all dependencies are expanded
  const allDepsExpanded = useMemo(() => {
    return checkAllDepsExpanded(node.dependencies, visibleNodeIds);
  }, [node.dependencies, visibleNodeIds]);

  // Focused identifiers for this node
  const focusedVariables = activeLocalVariables.get(node.id);

  // Process code lines to extract metadata
  const processedLines = useMemo(() => {
    if (node.filePath.endsWith('.vue')) {
      return renderVueFile(node, files);
    }
    return renderCodeLines(node, files);
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

        return pruneDetachedNodes(next, fullNodeMap, entryFile, templateRootId);
      });
    }
  };

  const showToggleButton = node.dependencies.length > 0;

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.dependencies.length === 0) return;

    setVisibleNodeIds(prev => {
      if (!allDepsExpanded) {
        // Expand all dependencies recursively
        const newVisible = expandDependenciesRecursive(node.id, fullNodeMap, prev);

        // Center on the first expanded dependency
        const firstDep = getFirstDependency(node.id, fullNodeMap);
        if (firstDep) {
          setLastExpandedId(firstDep);
        }

        return newVisible;
      } else {
        // Collapse dependencies (keep nodes reachable from other paths)
        return collapseDependencies(node.id, fullNodeMap, prev);
      }
    });
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);

    // Get current card position offset
    setCardPositions(prev => {
      const currentOffset = prev.get(node.id) || { x: 0, y: 0 };
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startOffset: currentOffset
      };
      return prev;
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const dx = (e.clientX - dragStartRef.current.x) / transform.k;
      const dy = (e.clientY - dragStartRef.current.y) / transform.k;

      setCardPositions(prev => {
        const newMap = new Map(prev);
        newMap.set(node.id, {
          x: dragStartRef.current!.startOffset.x + dx,
          y: dragStartRef.current!.startOffset.y + dy
        });
        return newMap;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, node.id, setCardPositions, transform.k]);

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

  return (
    <div className="px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-black/20">
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Drag Handle */}
        <div
          onMouseDown={handleDragStart}
          className={`p-1 rounded hover:bg-white/10 transition-colors ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} card-drag-handle`}
          data-drag-handle="true"
          title="Drag to move card"
        >
          <IconGripVertical className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
        </div>

        {/* Toggle All Dependencies Button */}
        {showToggleButton && (
          <button
            onClick={handleToggleAll}
            className="p-1 rounded hover:bg-white/10 transition-colors group/toggle"
            title={allDepsExpanded ? "Collapse all dependencies" : "Expand all dependencies"}
          >
            {allDepsExpanded ? (
              <IconChevronsUp className="w-3.5 h-3.5 text-slate-400 group-hover/toggle:text-slate-200" />
            ) : (
              <IconChevronsDown className="w-3.5 h-3.5 text-slate-400 group-hover/toggle:text-slate-200" />
            )}
          </button>
        )}
        {getIcon()}
        <div className="flex flex-col">
          <span className="font-bold text-xs text-slate-100 truncate max-w-[300px]">{node.label}</span>
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
