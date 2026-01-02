/**
 * AppSidebar - File Explorer with LIMN Design System
 * Coordinates file tree display and keyboard navigation
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';
import { Sidebar } from '@/components/ide/Sidebar';
import { filesAtom, isSidebarOpenAtom, viewModeAtom, activeTabAtom } from '../../store/atoms';
import { useOpenFile } from '../../features/Files/lib/useOpenFile';
import UploadFolderButton from '../../features/UploadFolderButton';
import { getInitialCollapsedFolders } from './lib/getInitialCollapsedFolders';
import { buildFileTree } from './lib/buildFileTree';
import { getFlatItemList } from './lib/getFlatItemList';
import { FileTreeRenderer } from './ui/FileTreeRenderer';

const SIDEBAR_HOTKEYS = {
  ARROW_DOWN: 'arrowdown',
  ARROW_UP: 'arrowup',
  ENTER: 'enter',
  ARROW_RIGHT: 'arrowright',
  ARROW_LEFT: 'arrowleft',
} as const;

export const AppSidebar: React.FC = () => {
  const files = useAtomValue(filesAtom);
  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { openFile } = useOpenFile();

  // Refs for auto-scrolling to focused item
  const itemRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Collapsed folders state - initial: root level open, others collapsed
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() =>
    getInitialCollapsedFolders(files)
  );

  // Build file tree from flat file list
  const fileTree = useMemo(() => buildFileTree(files), [files]);

  // Flat list of all visible items for keyboard navigation
  const flatItemList = useMemo(
    () => getFlatItemList(fileTree, collapsedFolders),
    [fileTree, collapsedFolders]
  );

  const toggleFolder = useCallback((path: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleFileClick = useCallback(
    (filePath: string) => {
      openFile(filePath);
    },
    [openFile]
  );

  // Auto-scroll to focused item when focusedIndex changes
  useEffect(() => {
    const focusedElement = itemRefs.current.get(focusedIndex);
    if (focusedElement) {
      focusedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
    }
  }, [focusedIndex]);

  // Keyboard navigation - ref-based scoping
  const sidebarRef = useHotkeys(
    Object.values(SIDEBAR_HOTKEYS),
    (e, { hotkey }) => {
      if (flatItemList.length === 0) return;

      console.log('[AppSidebar] Hotkey pressed:', hotkey);
      e.preventDefault();

      const item = flatItemList[focusedIndex];

      switch (hotkey) {
        case SIDEBAR_HOTKEYS.ARROW_DOWN:
          setFocusedIndex((prev) => Math.min(prev + 1, flatItemList.length - 1));
          break;
        case SIDEBAR_HOTKEYS.ARROW_UP:
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case SIDEBAR_HOTKEYS.ENTER:
          if (item.type === 'file' && item.filePath) {
            handleFileClick(item.filePath);
          } else if (item.type === 'folder') {
            toggleFolder(item.path);
          }
          break;
        case SIDEBAR_HOTKEYS.ARROW_RIGHT:
          if (item.type === 'folder' && collapsedFolders.has(item.path)) {
            toggleFolder(item.path);
          }
          break;
        case SIDEBAR_HOTKEYS.ARROW_LEFT:
          if (item.type === 'folder' && !collapsedFolders.has(item.path)) {
            toggleFolder(item.path);
          }
          break;
      }
    },
    {},
    [flatItemList, focusedIndex, handleFileClick, collapsedFolders, toggleFolder]
  );

  if (!isSidebarOpen) {
    return null;
  }

  // IDE mode: relative positioning, Canvas mode: absolute floating
  const positionClass =
    viewMode === 'ide' ? 'relative' : 'absolute top-0 left-0 z-50 h-full';

  return (
    <div ref={sidebarRef} tabIndex={-1} className={`${positionClass} focus:outline-none`}>
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

        {fileTree.length > 0 ? (
          <FileTreeRenderer
            fileTree={fileTree}
            collapsedFolders={collapsedFolders}
            flatItemList={flatItemList}
            focusedIndex={focusedIndex}
            activeTab={activeTab}
            itemRefs={itemRefs}
            onFocusChange={setFocusedIndex}
            onFileClick={handleFileClick}
            onToggleFolder={toggleFolder}
          />
        ) : (
          <div className="px-3 py-6 text-xs text-text-secondary text-center">No files</div>
        )}
      </Sidebar>
    </div>
  );
};

export default AppSidebar;
