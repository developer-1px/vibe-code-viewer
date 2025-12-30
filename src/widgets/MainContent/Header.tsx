
import React from 'react';
import { Box as IconBox, AlertCircle as IconAlertCircle } from 'lucide-react';
import { useGraphData } from '../../hooks/useGraphData';

const Header: React.FC = () => {
  const { error: parseError } = useGraphData();

  return (
    <header className="h-10 bg-vibe-panel border-b border-vibe-border flex items-center px-4 justify-between relative z-50 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <IconBox className="w-4 h-4 text-vibe-accent" />
          Teo's Devtools
        </h1>

        <span className="text-xs text-slate-500">Project Logic Visualization</span>
      </div>

      <div className="flex gap-2 items-center text-xs">
        {parseError ? (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] border border-red-500/20 flex items-center gap-1">
            <IconAlertCircle className="w-3 h-3" />
            Syntax Error
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-vibe-accent/10 text-vibe-accent rounded text-[10px] border border-vibe-accent/20">
            Project Analysis Active
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
