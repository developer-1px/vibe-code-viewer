/**
 * AppSidebar - Sidebar container with FileExplorer
 * Provides resizable sidebar layout for file navigation
 */
import React, { useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Sidebar } from '@/components/ide/Sidebar';
import { isSidebarOpenAtom } from '../../store/atoms';
import UploadFolderButton from '../../features/UploadFolderButton';
import { FileExplorer } from '../FileExplorer/FileExplorer';

export const AppSidebar: React.FC = () => {
  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <div ref={containerRef} tabIndex={0} className="relative focus:outline-none">
      <Sidebar
        resizable
        defaultWidth={300}
        minWidth={250}
        maxWidth={800}
        className="h-full shadow-2xl"
      >
        <Sidebar.Header>
          <span className="label text-2xs">PROJECT</span>
          <UploadFolderButton />
        </Sidebar.Header>

        <FileExplorer containerRef={containerRef} />
      </Sidebar>
    </div>
  );
};

export default AppSidebar;
