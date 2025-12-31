import React, { useState, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { FileCode as IconFileCode, FolderTree } from 'lucide-react';
import { filesAtom, isSidebarOpenAtom } from '../../store/atoms';
import ResetFilesButton from '../../features/ResetFilesButton';
import UploadFolderButton from '../../features/UploadFolderButton';
import FolderView from './FolderView';

export const Sidebar: React.FC = () => {
  const files = useAtomValue(filesAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);
  const [width, setWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

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

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <div
      className="absolute top-0 left-0 h-full bg-vibe-panel border-r border-vibe-border flex flex-col select-none shadow-2xl z-50 transition-transform duration-200 ease-out"
      style={{ width: `${width}px` }}
    >
      {/* Compact Header */}
      <div className="px-2 py-1 border-b border-vibe-border/50 flex items-center justify-between flex-shrink-0 bg-black/10">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium uppercase tracking-wide">
          <FolderTree className="w-2.5 h-2.5" />
          <span>Project</span>
        </div>
        <UploadFolderButton />
      </div>

      {/* Folder View */}
      <FolderView files={files} />

      {/* Footer */}
      <div className="p-3 border-t border-vibe-border bg-[#162032] flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <IconFileCode className="w-3 h-3" />
          <span>TypeScript Project</span>
        </div>
        <ResetFilesButton />
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-vibe-accent/50 ${isResizing ? 'bg-vibe-accent' : ''}`}
      />
    </div>
  );
};

export default Sidebar;
