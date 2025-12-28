import React, { useState, useRef, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { Box, FileCode } from 'lucide-react';
import { filesAtom } from '../../store/atoms';
import ResetFilesButton from '../../features/ResetFilesButton';
import FileExplorer from './FileExplorer';

const Sidebar: React.FC = () => {
  const files = useAtomValue(filesAtom);
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className="bg-vibe-panel border-r border-vibe-border flex flex-col h-full select-none shadow-xl z-20 relative"
    >
      {/* Header */}
      <div className="p-4 border-b border-vibe-border bg-[#162032] flex-shrink-0">
        <h1 className="font-bold text-slate-100 flex items-center gap-2 mb-1">
          <Box className="w-5 h-5 text-vibe-accent" />
          Vibe Coder
        </h1>
        <p className="text-xs text-slate-500">Project Logic Visualization</p>
      </div>

      {/* File Explorer */}
      <FileExplorer files={files} />

      {/* Footer */}
      <div className="p-3 border-t border-vibe-border bg-[#162032] flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileCode className="w-3 h-3" />
          <span>TypeScript Project</span>
        </div>
        <ResetFilesButton />
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-vibe-accent/50 transition-colors ${isResizing ? 'bg-vibe-accent' : ''}`}
      />
    </div>
  );
};

export default Sidebar;
