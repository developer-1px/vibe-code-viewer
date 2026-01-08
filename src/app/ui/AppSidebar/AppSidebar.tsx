/**
 * AppSidebar - Sidebar container with FileExplorer
 * Provides resizable sidebar layout for file navigation
 */

import { useAtom, useAtomValue } from 'jotai';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { Sidebar } from '@/components/ide/Sidebar.tsx';
import { viewModeAtom } from '@/entities/AppView/model/atoms';
import { FileExplorer } from '../../../widgets/FileExplorer/FileExplorer.tsx';
import { RelatedFilesView } from '../../../widgets/RelatedFilesView/RelatedFilesView.tsx';
import { fileTreeModeAtom, isSidebarOpenAtom } from './model/atoms.ts';

export const AppSidebar: React.FC = () => {
  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);
  const _viewMode = useAtomValue(viewModeAtom);
  const [fileTreeMode, setFileTreeMode] = useAtom(fileTreeModeAtom);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collapsible states
  const [isFileExplorerCollapsed, setIsFileExplorerCollapsed] = useState(false);

  if (!isSidebarOpen) {
    return null;
  }

  const projectLabel = 'Project';

  return (
    <div ref={containerRef} className="relative focus:outline-none">
      <Sidebar resizable defaultWidth={250} minWidth={200} maxWidth={800} className="h-full shadow-2xl">
        {/* PROJECT */}
        <div className={!isFileExplorerCollapsed ? 'flex-1 flex flex-col overflow-hidden' : ''}>
          <button
            onClick={() => setIsFileExplorerCollapsed(!isFileExplorerCollapsed)}
            className="flex w-full h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0 hover:bg-bg-deep transition-colors"
          >
            <span className="text-2xs font-medium text-text-tertiary normal-case">{projectLabel}</span>
            {isFileExplorerCollapsed ? (
              <ChevronRight className="w-3 h-3 text-text-muted" />
            ) : (
              <ChevronDown className="w-3 h-3 text-text-muted" />
            )}
          </button>

          {!isFileExplorerCollapsed && (
            <>
              {/* Mode Tabs */}
              <div className="flex border-b border-border-DEFAULT">
                <button
                  onClick={() => setFileTreeMode('all')}
                  className={`flex-1 px-2 py-1.5 text-2xs font-medium transition-colors ${
                    fileTreeMode === 'all'
                      ? 'bg-bg-deep text-text-primary border-b-2 border-warm-300'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  All Files
                </button>
                <button
                  onClick={() => setFileTreeMode('related')}
                  className={`flex-1 px-2 py-1.5 text-2xs font-medium transition-colors ${
                    fileTreeMode === 'related'
                      ? 'bg-bg-deep text-text-primary border-b-2 border-warm-300'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  Related
                </button>
              </div>

              {fileTreeMode === 'all' ? (
                <FileExplorer containerRef={containerRef} />
              ) : (
                <RelatedFilesView containerRef={containerRef} />
              )}
            </>
          )}
        </div>
      </Sidebar>
    </div>
  );
};

export default AppSidebar;
