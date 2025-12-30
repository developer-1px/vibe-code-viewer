import React, { useState, useRef, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { FileCode as IconFileCode } from 'lucide-react';
import { filesAtom, isSidebarOpenAtom } from '../../store/atoms';
import ResetFilesButton from '../../features/ResetFilesButton';
import FolderView from './FolderView';

export const Sidebar: React.FC = () => {
  const files = useAtomValue(filesAtom);
  const [isSidebarOpen] = useAtom(isSidebarOpenAtom);
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

  return (
    <div
      className={`overflow-hidden flex-shrink-0 relative z-50 ${isSidebarOpen ? `w-[${width}px]` : 'w-0'}`}
      style={{ width: isSidebarOpen ? `${width}px` : '0px' }}
    >
      <div
        ref={sidebarRef}
        style={{ width: `${width}px` }}
        className="bg-vibe-panel border-r border-vibe-border flex flex-col h-full select-none shadow-xl z-20 relative"
      >
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
    </div>
  );
};

export default Sidebar;
