import React, { useEffect, useState } from 'react';
import { Box, Code2, Eraser, FileCode } from 'lucide-react';
import { VUE_CODE_RAW } from '../constants';

interface SidebarProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ code, onCodeChange }) => {
  const [localCode, setLocalCode] = useState(code);
  const [isTyping, setIsTyping] = useState(false);

  // Debounce logic to prevent parsing on every keystroke
  useEffect(() => {
    setIsTyping(true);
    const handler = setTimeout(() => {
      onCodeChange(localCode);
      setIsTyping(false);
    }, 800); // 800ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [localCode, onCodeChange]);

  const handleReset = () => {
    if (window.confirm("Reset to default sample code?")) {
      setLocalCode(VUE_CODE_RAW);
    }
  };

  return (
    <div className="w-[400px] bg-vibe-panel border-r border-vibe-border flex flex-col h-full select-none shadow-xl z-20">
      <div className="p-4 border-b border-vibe-border bg-[#162032]">
        <h1 className="font-bold text-slate-100 flex items-center gap-2 mb-1">
            <Box className="w-5 h-5 text-vibe-accent" />
            Vibe Coder
        </h1>
        <p className="text-xs text-slate-500">Paste your Vue SFC code below to visualize.</p>
      </div>
      
      <div className="flex-1 relative group">
        <textarea 
            className="w-full h-full bg-[#0b1221] text-xs font-mono text-slate-300 p-4 resize-none focus:outline-none focus:ring-1 focus:ring-vibe-accent/50 leading-relaxed scrollbar-hide selection:bg-vibe-accent/30"
            value={localCode}
            spellCheck={false}
            onChange={(e) => setLocalCode(e.target.value)}
            placeholder="<script setup>..."
        />
        
        {/* Status Indicator overlay */}
        <div className="absolute bottom-4 right-4 pointer-events-none transition-opacity duration-300">
            {isTyping ? (
                 <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full border border-yellow-500/20 animate-pulse">
                    Typing...
                 </span>
            ) : (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20">
                    Synced
                 </span>
            )}
        </div>
      </div>

      <div className="p-3 border-t border-vibe-border bg-[#162032] flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileCode className="w-3 h-3" />
            <span>Vue 3 SFC Supported</span>
        </div>
        <button 
            onClick={handleReset}
            className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
            title="Reset to sample code"
        >
            <Eraser className="w-3 h-3" />
            Reset
        </button>
      </div>
    </div>
  );
};

export default Sidebar;