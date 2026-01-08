/**
 * FileExplorer - File tree navigation component
 * Handles file tree display, keyboard navigation, and file opening
 */

import { useAtom, useAtomValue } from 'jotai';
import { Folder, FolderOpen } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileTreeItem } from '@/components/ide/FileTreeItem';
import { filesAtom, focusedFolderAtom } from '@/entities/AppView/model/atoms';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import { activeTabAtom, openedTabsAtom } from '@/features/File/OpenFiles/model/atoms';
import { FileIcon } from '../../entities/SourceFileNode/ui/FileIcon.tsx';
import { useTreeKeyboardNavigation } from '../../shared/hooks/useTreeKeyboardNavigation';
import { TreeView } from '../../shared/ui/TreeView/TreeView';
import { buildFileTree } from './lib/buildFileTree';
import { getFlatItemList } from './lib/getFlatItemList';
import { getInitialCollapsedFolders } from './lib/getInitialCollapsedFolders';
import { FolderBreadcrumb } from './ui/FolderBreadcrumb';

interface FileExplorerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  filteredFiles?: Record<string, string>;
}

export function FileExplorer({ containerRef, filteredFiles }: FileExplorerProps) {
  const files = useAtomValue(filesAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const openedTabs = useAtomValue(openedTabsAtom);
  const { openFile } = useOpenFile();
  const [focusedFolder, setFocusedFolder] = useAtom(focusedFolderAtom);

  // Use filtered files if provided, otherwise use all files
  const displayFiles = filteredFiles || files;

  // Collapsed folders state - initial: root level open, others collapsed
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => getInitialCollapsedFolders(displayFiles));

  // Build file tree from flat file list (with Folder Focus Mode support)
  const fileTree = useMemo(() => buildFileTree(displayFiles, focusedFolder), [displayFiles, focusedFolder]);

  // Flat list of all visible items for keyboard navigation
  const flatItemList = useMemo(() => getFlatItemList(fileTree, collapsedFolders), [fileTree, collapsedFolders]);

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

  // Folder Focus Mode handlers
  const handleFolderFocus = useCallback(
    (folderPath: string) => {
      setFocusedFolder(folderPath);
    },
    [setFocusedFolder]
  );

  const handleExitFocus = useCallback(() => {
    setFocusedFolder(null);
  }, [setFocusedFolder]);

  // Keyboard navigation with custom hook
  const { focusedIndex, setFocusedIndex, itemRefs } = useTreeKeyboardNavigation({
    flatItemList,
    collapsedFolders,
    onToggleFolder: toggleFolder,
    onItemAction: (item) => {
      if (item.filePath) {
        handleFileClick(item.filePath);
      }
    },
    onFolderFocus: handleFolderFocus,
    onExitFocus: handleExitFocus,
    scope: 'sidebar',
    enabled: true,
  });

  // Reset focusedIndex when focusedFolder changes
  useEffect(() => {
    setFocusedIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFocusedIndex]);

  if (fileTree.length === 0) {
    return <div className="px-3 py-6 text-xs text-text-secondary text-center">No files</div>;
  }

  return (
    <>
      {/* Folder Focus Mode Breadcrumb */}
      {focusedFolder && (
        <FolderBreadcrumb focusedFolder={focusedFolder} onNavigate={(path) => setFocusedFolder(path)} />
      )}

      <TreeView
        className="flex-1 overflow-y-auto py-1"
        data={fileTree}
        getNodeType={(node) => node.type}
        getNodePath={(node) => node.path}
        collapsedPaths={collapsedFolders}
        onToggleCollapse={toggleFolder}
        focusedIndex={focusedIndex}
        onFocusChange={setFocusedIndex}
        itemRefs={itemRefs}
      >
        {({ node, depth, isFocused, isCollapsed, itemRef, handleFocus, handleToggle }) => {
          const isActive = activeTab === node.filePath;
          const isOpened = node.filePath ? openedTabs.includes(node.filePath) : false;
          const fileExtension = node.name.includes('.') ? `.${node.name.split('.').pop()}` : undefined;
          const icon =
            node.type === 'folder'
              ? isCollapsed
                ? Folder
                : FolderOpen
              : ((() => <FileIcon fileName={node.name} />) as React.ComponentType);

          return (
            <FileTreeItem
              ref={itemRef}
              icon={icon}
              label={node.name}
              active={isActive}
              opened={isOpened}
              focused={isFocused}
              isFolder={node.type === 'folder'}
              isOpen={!isCollapsed}
              indent={depth}
              fileExtension={fileExtension}
              onFocus={handleFocus}
              onDoubleClick={() => {
                if (node.type === 'file' && node.filePath) {
                  handleFileClick(node.filePath);
                } else {
                  handleToggle();
                }
              }}
            />
          );
        }}
      </TreeView>
    </>
  );
}
