/**
 * AppSidebar - Sidebar container with FileExplorer
 * Provides resizable sidebar layout for file navigation
 */
import React, { useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Sidebar } from '@/components/ide/Sidebar';
import { isSidebarOpenAtom } from './model/atoms';
import { viewModeAtom } from '../../app/model/atoms';
import { openedTabsAtom, activeTabAtom } from '@/features/File/OpenFiles/model/atoms';
import UploadFolderButton from '../../features/UploadFolderButton';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { getFileName } from '../../shared/pathUtils';
import { getFileIcon } from '../FileExplorer/lib/getFileIcon';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import { ChevronRight, ChevronDown } from 'lucide-react';

export const AppSidebar: React.FC = () => {
  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const openedTabs = useAtomValue(openedTabsAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const { openFile } = useOpenFile();
  const containerRef = useRef<HTMLDivElement>(null);

  // Collapsible states
  const [isOpenedFilesCollapsed, setIsOpenedFilesCollapsed] = useState(false);
  const [isFileExplorerCollapsed, setIsFileExplorerCollapsed] = useState(false);

  if (!isSidebarOpen) {
    return null;
  }

  // ViewMode에 따라 헤더 텍스트 변경
  const headerLabel = viewMode === 'codeDoc' ? 'DOCUMENTS' : 'FILES';
  const workspaceLabel = 'Workspace';
  const projectLabel = 'Project';

  return (
    <div ref={containerRef} tabIndex={0} className="relative focus:outline-none">
      <Sidebar
        resizable
        defaultWidth={250}
        minWidth={200}
        maxWidth={800}
        className="h-full shadow-2xl"
      >
        <Sidebar.Header>
          <span className="text-2xs font-medium text-text-secondary normal-case">{headerLabel}</span>
          <UploadFolderButton />
        </Sidebar.Header>

        {/* WORKSPACE */}
        {openedTabs.length > 0 && (
          <div className={isFileExplorerCollapsed ? 'flex-1 flex flex-col overflow-hidden' : ''}>
            <button
              onClick={() => setIsOpenedFilesCollapsed(!isOpenedFilesCollapsed)}
              className="flex w-full h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0 hover:bg-bg-deep transition-colors"
            >
              <span className="text-2xs font-medium text-text-secondary normal-case">{workspaceLabel}</span>
              {isOpenedFilesCollapsed ? (
                <ChevronRight className="w-3 h-3 text-text-tertiary" />
              ) : (
                <ChevronDown className="w-3 h-3 text-text-tertiary" />
              )}
            </button>
            {!isOpenedFilesCollapsed && (
              <div className="flex-1 flex flex-col overflow-y-auto border-b border-border-DEFAULT">
                {openedTabs.map((filePath) => {
                  const fileName = getFileName(filePath);
                  const Icon = getFileIcon(fileName);
                  const isActive = filePath === activeTab;

                  return (
                    <button
                      key={filePath}
                      onClick={() => openFile(filePath)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-bg-deep transition-colors ${
                        isActive ? 'bg-bg-deep text-text-primary' : 'text-text-secondary'
                      }`}
                      title={filePath}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{fileName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROJECT */}
        <div className={!isFileExplorerCollapsed ? 'flex-1 flex flex-col overflow-hidden' : ''}>
          <button
            onClick={() => setIsFileExplorerCollapsed(!isFileExplorerCollapsed)}
            className="flex w-full h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0 hover:bg-bg-deep transition-colors"
          >
            <span className="text-2xs font-medium text-text-secondary normal-case">{projectLabel}</span>
            {isFileExplorerCollapsed ? (
              <ChevronRight className="w-3 h-3 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-3 h-3 text-text-tertiary" />
            )}
          </button>
          {!isFileExplorerCollapsed && <FileExplorer containerRef={containerRef} />}
        </div>
      </Sidebar>
    </div>
  );
};

export default AppSidebar;
