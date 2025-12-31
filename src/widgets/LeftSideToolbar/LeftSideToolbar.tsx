import React from 'react';
import { useSetAtom } from 'jotai';
import { FolderOpen } from 'lucide-react';
import { isSidebarOpenAtom } from '../../store/atoms';

/**
 * LeftSideToolbar - Compact icon toolbar
 */
const LeftSideToolbar = () => {
  const setIsSidebarOpen = useSetAtom(isSidebarOpenAtom);

  return (
    <div className="w-[40px] h-full bg-vibe-panel border-r border-vibe-border flex flex-col items-center py-1.5 gap-0.5 flex-shrink-0">
      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setIsSidebarOpen(prev => !prev)}
        className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
        title="Toggle Files Panel"
      >
        <FolderOpen className="w-4 h-4" />
      </button>
    </div>
  );
};

export default LeftSideToolbar;
