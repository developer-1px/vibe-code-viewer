import React, { useState, useRef, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { FileCode as IconFileCode, ChevronRight, ChevronLeft } from 'lucide-react';
import { filesAtom, isSidebarOpenAtom } from '../../store/atoms';
import ResetFilesButton from '../../features/ResetFilesButton';
import FolderView from './FolderView';

export const Sidebar: React.FC = () => {
  const files = useAtomValue(filesAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);
  const [width, setWidth] = useState(300);
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

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className="absolute top-0 left-0 h-full bg-vibe-panel border-r border-vibe-border flex flex-col select-none shadow-2xl z-50 transition-transform duration-200 ease-out"
      style={{ width: `${width}px` }}
    >
      {/* Header with Close Button */}
      <div className="p-2 border-b border-vibe-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <IconFileCode className="w-3 h-3" />
          <span className="font-semibold">FILES</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title="Close (or click outside)"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
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
