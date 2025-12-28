import React, { useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Terminal, Box, FunctionSquare, LayoutTemplate, Database, Link2,
  PlayCircle, BoxSelect, ChevronsDown, ChevronsUp,
  Calculator, Shield, Zap, RefreshCw, AlertCircle
} from 'lucide-react';
import { CanvasNode } from '../../../CanvasNode';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom } from '../../../../store/atoms';
import { checkAllDepsExpanded, expandDependenciesRecursive, collapseDependencies, getFirstDependency } from '../../model/nodeVisibility';

interface CodeCardHeaderProps {
  node: CanvasNode;
}

const CodeCardHeader: React.FC<CodeCardHeaderProps> = ({ node }) => {
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);

  // Check if all dependencies are expanded
  const allDepsExpanded = useMemo(() => {
    return checkAllDepsExpanded(node.dependencies, visibleNodeIds);
  }, [node.dependencies, visibleNodeIds]);

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
  const getIcon = () => {
    switch (node.type) {
      // === CALCULATIONS (불변, 청록/파랑 계열) ===
      case 'pure-function': return <Calculator className="w-4 h-4 text-cyan-400" />;
      case 'immutable-data': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'computed': return <FunctionSquare className="w-4 h-4 text-sky-400" />;

      // === STATE ACTIONS (상태 변경, 주황/노랑 계열) ===
      case 'ref': return <Database className="w-4 h-4 text-emerald-400" />; // 하위 호환
      case 'state-ref': return <Database className="w-4 h-4 text-amber-400" />;
      case 'state-action': return <RefreshCw className="w-4 h-4 text-orange-400" />;
      case 'mutable-ref': return <AlertCircle className="w-4 h-4 text-yellow-400" />;

      // === EFFECT ACTIONS (부수효과, 빨강/분홍 계열) ===
      case 'effect-action': return <Zap className="w-4 h-4 text-red-400" />;
      case 'hook': return <Link2 className="w-4 h-4 text-violet-400" />;

      // === LEGACY/OTHER ===
      case 'function': return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'template': return <LayoutTemplate className="w-4 h-4 text-pink-400" />;
      case 'call': return <PlayCircle className="w-4 h-4 text-yellow-400" />;
      case 'module': return <BoxSelect className="w-4 h-4 text-orange-400" />;

      default: return <Box className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-black/20">
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Toggle All Dependencies Button */}
        {showToggleButton && (
          <button
            onClick={handleToggleAll}
            className="p-1 rounded hover:bg-white/10 transition-colors group/toggle"
            title={allDepsExpanded ? "Collapse all dependencies" : "Expand all dependencies"}
          >
            {allDepsExpanded ? (
              <ChevronsUp className="w-3.5 h-3.5 text-slate-400 group-hover/toggle:text-slate-200" />
            ) : (
              <ChevronsDown className="w-3.5 h-3.5 text-slate-400 group-hover/toggle:text-slate-200" />
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
        {node.type}
      </span>
    </div>
  );
};

export default CodeCardHeader;
