/**
 * FileExplorer - File tree navigation component
 * Handles file tree display, keyboard navigation, and file opening
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { filesAtom, activeTabAtom } from '../../store/atoms';
import { useOpenFile } from '../../features/Files/lib/useOpenFile';
import { getInitialCollapsedFolders } from './lib/getInitialCollapsedFolders';
import { buildFileTree } from './lib/buildFileTree';
import { getFlatItemList } from './lib/getFlatItemList';
import { TreeView } from '../../shared/ui/TreeView/TreeView';
import { useTreeKeyboardNavigation } from '../../shared/hooks/useTreeKeyboardNavigation';
import { Folder, FolderOpen } from 'lucide-react';
import { FileTreeItem } from '@/components/ide/FileTreeItem';
import { getFileIcon } from './lib/getFileIcon';

export function FileExplorer({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const files = useAtomValue(filesAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const { openFile } = useOpenFile();

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

  // Keyboard navigation with custom hook
  const { focusedIndex, setFocusedIndex, itemRefs } =
    useTreeKeyboardNavigation({
      flatItemList,
      collapsedFolders,
      onToggleFolder: toggleFolder,
      onItemAction: (item) => {
        if (item.filePath) {
          handleFileClick(item.filePath);
        }
      },
    });

  if (fileTree.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-text-secondary text-center">
        No files
      </div>
    );
  }

  return (
    <TreeView
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
        const fileExtension = node.name.includes('.')
          ? '.' + node.name.split('.').pop()
          : undefined;
        const icon = node.type === 'folder'
          ? (isCollapsed ? Folder : FolderOpen)
          : getFileIcon(node.name);

        return (
          <FileTreeItem
            ref={itemRef}
            icon={icon}
            label={node.name}
            active={isActive}
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
  );
}
