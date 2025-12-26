
import React, { useMemo, useState } from 'react';
import { CanvasNode } from '../model/types';
import { Terminal, Box, FunctionSquare, LayoutTemplate, Database, Link2, PlayCircle, BoxSelect, Copy, Check } from 'lucide-react';

// Extracted Logic
import { extractTokenRanges } from '../lib/tokenUtils';
import { processCodeLines } from '../lib/lineUtils';
import { getNodeBorderColor, getTokenStyle, getSlotColor } from '../lib/styleUtils';

interface CodeCardProps {
  node: CanvasNode;
  onTokenClick: (token: string, sourceNodeId: string) => void;
  onSlotClick?: (tokenId: string) => void;
  activeDependencies: string[];
  allKnownIds: string[];
  nodeMap?: Map<string, CanvasNode>;
}

const CodeCard: React.FC<CodeCardProps> = ({ node, onTokenClick, onSlotClick, activeDependencies, nodeMap }) => {

  const isTemplate = node.type === 'template';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(node.codeSnippet);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // --- 1. Prepare Data (Pure Logic) ---
  const tokenRanges = useMemo(() => {
    return extractTokenRanges(node.codeSnippet, node.id, node.dependencies, isTemplate);
  }, [node.codeSnippet, node.id, node.dependencies, isTemplate]);

  const processedLines = useMemo(() => {
    return processCodeLines(
        node.codeSnippet, 
        node.startLine || 1, 
        node.id, 
        node.dependencies, 
        tokenRanges, 
        isTemplate
    );
  }, [node.codeSnippet, node.startLine, node.id, node.dependencies, tokenRanges, isTemplate]);


  // --- 2. UI Helpers ---
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

  const maxWidthClass = 'max-w-[600px]';

  return (
    <div
      id={`node-${node.visualId || node.id}`}
      className={`
        bg-vibe-panel/95 backdrop-blur-md border shadow-2xl rounded-lg flex flex-col relative group/card overflow-visible transition-colors
        ${getNodeBorderColor(node.type)}
        min-w-[420px] ${maxWidthClass} w-fit cursor-default
      `}
    >
      {/* Header */}
      <div className={`px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-black/20`}>
        <div className="flex items-center gap-2 overflow-hidden">
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

      {/* Body: Render Lines from Processed Data */}
      <div className="flex flex-col bg-[#0b1221] rounded-b-lg py-2">
        {processedLines.map((line, i) => {
             const isDefinitionLine = line.num === node.startLine;
             return (
                 <div
                    key={i}
                    className={`
                        flex w-full group/line relative
                        ${isDefinitionLine && !isTemplate ? 'bg-vibe-accent/5' : ''}
                    `}
                    data-line-num={line.num}
                 >
                     {/* Line Number Column */}
                     <div className="flex-none w-12 pr-3 flex justify-end select-none text-xs font-mono text-slate-600 border-r border-white/5 bg-[#0f172a]/50">
                         <div className="relative">
                            {/* Render input slots for each token in this line */}
                            {line.segments.filter(seg => seg.type === 'token' && seg.tokenId).map((seg, slotIdx) => {
                                const depNode = nodeMap?.get(seg.tokenId);
                                const slotColorClass = depNode ? getSlotColor(depNode.type) : 'bg-slate-500/60 border-slate-400/80 shadow-slate-500/30 group-hover/line:border-slate-300';

                                return (
                                    <div
                                        key={`slot-${slotIdx}`}
                                        className={`w-2 h-2 rounded-full absolute -left-3.5 transition-all duration-300 border-2 group-hover/line:scale-110 shadow-lg cursor-pointer hover:scale-125 ${slotColorClass}`}
                                        style={{ top: `${6 + slotIdx * 0}px` }}
                                        data-input-slot-for={seg.tokenId}
                                        data-input-slot-line={line.num}
                                        data-input-slot-unique={`${seg.tokenId}::line${line.num}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSlotClick && seg.tokenId) {
                                                onSlotClick(seg.tokenId);
                                            }
                                        }}
                                        title={`Go to ${depNode?.label || seg.tokenId.split('::').pop()}`}
                                    />
                                );
                            })}
                            <span className="leading-5">{line.num}</span>
                         </div>
                     </div>

                     {/* Code Content Column */}
                     <div className="flex-1 px-3 min-w-0">
                         <div className="font-mono text-xs leading-5 whitespace-pre-wrap break-all text-slate-300">
                             {line.segments.length > 0 ? (
                                 line.segments.map((segment, segIdx) => {
                                     if (segment.type === 'text') {
                                         return <span key={segIdx} className="text-slate-300">{segment.text}</span>;
                                     } 
                                     
                                     if (segment.type === 'self') {
                                         return (
                                            <span key={segIdx} className="text-vibe-accent font-bold" data-token={node.id}>
                                                {segment.text}
                                            </span>
                                         );
                                     }

                                     if (segment.type === 'token' && segment.tokenId) {
                                         const isActive = activeDependencies.includes(segment.tokenId);
                                         return (
                                            <span 
                                                key={segIdx}
                                                data-token={segment.tokenId}
                                                className={`
                                                    inline-block px-0.5 rounded cursor-pointer transition-all duration-200 border 
                                                    ${getTokenStyle(isActive)}
                                                `}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (segment.tokenId) onTokenClick(segment.tokenId, node.id);
                                                }}
                                            >
                                                {segment.text}
                                            </span>
                                         );
                                     }
                                     
                                     return <span key={segIdx}>{segment.text}</span>;
                                 })
                             ) : (
                                <span className="text-slate-500 opacity-50">{/* Empty Line Placeholder */}</span>
                             )}
                         </div>
                     </div>

                     {/* Output Port Indicator (Right Side) */}
                     {isDefinitionLine && (
                        <div 
                            className="absolute right-0 top-3 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%] ring-2 ring-vibe-panel" 
                            data-output-port={node.id}
                        />
                     )}
                 </div>
             );
        })}
      </div>

      {/* Copy Button - Bottom Right */}
      <button
        onClick={handleCopyCode}
        className="absolute bottom-2 right-2 p-1.5 rounded bg-slate-700/50 border border-slate-600/50 text-slate-400 opacity-0 group-hover/card:opacity-100 hover:bg-slate-600 hover:text-white hover:border-slate-500 transition-all duration-200 shadow-lg z-10"
        title="Copy code"
      >
        {isCopied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="absolute inset-0 border-2 border-transparent group-hover/card:border-white/5 rounded-lg pointer-events-none transition-colors" />
    </div>
  );
};

export default CodeCard;
