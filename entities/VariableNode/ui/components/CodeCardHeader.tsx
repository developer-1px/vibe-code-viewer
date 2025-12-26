import React from 'react';
import { Terminal, Box, FunctionSquare, LayoutTemplate, Database, Link2, PlayCircle, BoxSelect, ChevronsDown, ChevronsUp } from 'lucide-react';
import { CanvasNode } from '../../model/types';

interface CodeCardHeaderProps {
  node: CanvasNode;
  allDepsExpanded: boolean;
  onToggleAll: (e: React.MouseEvent) => void;
  showToggleButton: boolean;
}

const CodeCardHeader: React.FC<CodeCardHeaderProps> = ({ node, allDepsExpanded, onToggleAll, showToggleButton }) => {
  const getIcon = () => {
    switch (node.type) {
      case 'template': return <LayoutTemplate className="w-4 h-4 text-pink-400" />;
      case 'computed': return <FunctionSquare className="w-4 h-4 text-vibe-accent" />;
      case 'ref': return <Database className="w-4 h-4 text-emerald-400" />;
      case 'function': return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'hook': return <Link2 className="w-4 h-4 text-violet-400" />;
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
            onClick={onToggleAll}
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
          <span className="text-[9px] text-slate-500 font-mono truncate max-w-[300px]">{node.filePath.replace('src/', '')}</span>
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono ml-2">
        {node.type}
      </span>
    </div>
  );
};

export default CodeCardHeader;
