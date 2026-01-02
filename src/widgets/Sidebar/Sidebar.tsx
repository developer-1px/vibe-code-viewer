/**
 * Sidebar - File Explorer with LIMN Design System
 * Uses LIMN Sidebar + FileTreeItem components
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';
import { Folder, FolderOpen, CodeXml, SquareFunction, Code2 } from 'lucide-react';
import { Sidebar as LIMNSidebar, FileTreeItem } from '@/components/ide/Sidebar';
import { filesAtom, isSidebarOpenAtom, viewModeAtom, focusedPaneAtom, openedTabsAtom, activeTabAtom } from '../../store/atoms';
import { useOpenFile } from '../../features/Files/lib/useOpenFile';
import UploadFolderButton from '../../features/UploadFolderButton';
import { splitPath, joinPath } from '../../shared/pathUtils';

interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: FolderNode[];
  filePath?: string; // file일 경우 전체 경로
}

export const Sidebar: React.FC = () => {
  const files = useAtomValue(filesAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const [focusedPane, setFocusedPane] = useAtom(focusedPaneAtom);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { openFile } = useOpenFile();
  const openedTabs = useAtomValue(openedTabsAtom);
  const activeTab = useAtomValue(activeTabAtom);

  // Refs for auto-scrolling to focused item
  const itemRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Collapsed folders state - initial: root level open, others collapsed
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => {
    const allFolders = new Set<string>();
    Object.keys(files).forEach((filePath) => {
      const parts = filePath.split('/').filter(Boolean);
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        if (i > 0) {
          allFolders.add(folderPath);
        }
      }
    });
    return allFolders;
  });

  // Build file tree from flat file list
  const fileTree = useMemo(() => {
    const root: FolderNode = { name: 'root', path: '', type: 'folder', children: [] };

    Object.keys(files)
      .sort()
      .forEach((filePath) => {
        const parts = splitPath(filePath);
        let currentNode = root;

        parts.forEach((part, index) => {
          const isFile = index === parts.length - 1;
          const currentPath = joinPath(parts.slice(0, index + 1));

          if (!currentNode.children) {
            currentNode.children = [];
          }

          let childNode = currentNode.children.find((child) => child.name === part);

          if (!childNode) {
            childNode = {
              name: part,
              path: currentPath,
              type: isFile ? 'file' : 'folder',
              children: isFile ? undefined : [],
              filePath: isFile ? filePath : undefined,
            };
            currentNode.children.push(childNode);
          }

          if (!isFile) {
            currentNode = childNode;
          }
        });
      });

    // Sort: folders first, then files
    const sortChildren = (nodes: FolderNode[]): FolderNode[] => {
      return nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
    };

    const sortTree = (node: FolderNode) => {
      if (node.children) {
        node.children = sortChildren(node.children);
        node.children.forEach(sortTree);
      }
    };

    if (root.children) {
      root.children = sortChildren(root.children);
      root.children.forEach(sortTree);
    }

    return root.children || [];
  }, [files]);

  const toggleFolder = (path: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = useCallback((filePath: string) => {
    openFile(filePath);
  }, [openFile]);

  // Flat list of all visible items for keyboard navigation
  const flatItemList = useMemo(() => {
    const items: { type: 'folder' | 'file'; path: string; filePath?: string }[] = [];
    const traverse = (nodes: FolderNode[]) => {
      nodes.forEach((node) => {
        if (node.type === 'folder') {
          items.push({ type: 'folder', path: node.path });
          if (!collapsedFolders.has(node.path) && node.children) {
            traverse(node.children);
          }
        } else if (node.type === 'file' && node.filePath) {
          items.push({ type: 'file', path: node.path, filePath: node.filePath });
        }
      });
    };
    traverse(fileTree);
    return items;
  }, [fileTree, collapsedFolders]);

  // Set sidebar as focused pane on mount
  useEffect(() => {
    setFocusedPane('sidebar');
  }, [setFocusedPane]);

  // Auto-scroll to focused item when focusedIndex changes
  useEffect(() => {
    const focusedElement = itemRefs.current.get(focusedIndex);
    if (focusedElement) {
      focusedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [focusedIndex]);

  // Keyboard navigation hooks
  const useHotkeysSidebar = (keys: string, callback: (e: KeyboardEvent) => void, deps: any[]) => {
    useHotkeys(keys, callback, {
      scopes: ['sidebar'],
      enabled: focusedPane === 'sidebar'
    }, deps);
  };

  useHotkeysSidebar('down', () => {
    if (flatItemList.length === 0) return;
    setFocusedIndex(prev => Math.min(prev + 1, flatItemList.length - 1));
  }, [flatItemList.length]);

  useHotkeysSidebar('up', () => {
    if (flatItemList.length === 0) return;
    setFocusedIndex(prev => Math.max(prev - 1, 0));
  }, [flatItemList.length]);

  useHotkeysSidebar('enter', () => {
    if (flatItemList.length === 0) return;
    const item = flatItemList[focusedIndex];
    if (item.type === 'file' && item.filePath) {
      handleFileClick(item.filePath);
    } else if (item.type === 'folder') {
      toggleFolder(item.path);
    }
  }, [flatItemList, focusedIndex, handleFileClick]);

  useHotkeysSidebar('right', () => {
    if (flatItemList.length === 0) return;
    const item = flatItemList[focusedIndex];
    if (item.type === 'folder' && collapsedFolders.has(item.path)) {
      toggleFolder(item.path);
    }
  }, [flatItemList, focusedIndex, collapsedFolders]);

  useHotkeysSidebar('left', () => {
    if (flatItemList.length === 0) return;
    const item = flatItemList[focusedIndex];
    if (item.type === 'folder' && !collapsedFolders.has(item.path)) {
      toggleFolder(item.path);
    }
  }, [flatItemList, focusedIndex, collapsedFolders]);

  // Get icon component based on file extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';

    switch (ext.toLowerCase()) {
      case '.tsx':
      case '.vue':
        return CodeXml; // <code-xml> icon for TSX and Vue
      case '.ts':
      case '.js':
      case '.jsx':
        return SquareFunction; // square-function icon for TS/JS
      default:
        return Code2; // Default: </> icon for other code files
    }
  };

  // Render tree nodes recursively
  const renderNode = (node: FolderNode, depth: number = 0): React.ReactNode => {
    const isCollapsed = collapsedFolders.has(node.path);

    if (node.type === 'file' && node.filePath) {
      const itemIndex = flatItemList.findIndex(item => item.type === 'file' && item.filePath === node.filePath);
      const isFocused = focusedIndex === itemIndex;
      const isActive = activeTab === node.filePath; // Check if file is currently open

      // Extract file extension
      const fileExtension = node.name.includes('.')
        ? '.' + node.name.split('.').pop()
        : undefined;

      const FileIconComponent = getFileIcon(node.name);

      return (
        <FileTreeItem
          key={node.path}
          ref={(el) => {
            if (el && itemIndex >= 0) {
              itemRefs.current.set(itemIndex, el);
            }
          }}
          icon={FileIconComponent}
          label={node.name}
          active={isActive}
          focused={isFocused}
          indent={depth}
          fileExtension={fileExtension}
          onFocus={() => {
            if (itemIndex >= 0) setFocusedIndex(itemIndex);
          }}
          onDoubleClick={() => {
            if (node.filePath) handleFileClick(node.filePath);
          }}
        />
      );
    }

    if (node.type === 'folder') {
      const itemIndex = flatItemList.findIndex(item => item.type === 'folder' && item.path === node.path);
      const isFocused = focusedIndex === itemIndex;
      const isOpen = !isCollapsed;
      const FolderIconComponent = isOpen ? FolderOpen : Folder;

      return (
        <React.Fragment key={node.path}>
          <FileTreeItem
            ref={(el) => {
              if (el && itemIndex >= 0) {
                itemRefs.current.set(itemIndex, el);
              }
            }}
            icon={FolderIconComponent}
            label={node.name}
            isFolder
            isOpen={isOpen}
            focused={isFocused}
            indent={depth}
            onFocus={() => {
              if (itemIndex >= 0) setFocusedIndex(itemIndex);
            }}
            onDoubleClick={() => {
              toggleFolder(node.path);
            }}
          />
          {isOpen && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </React.Fragment>
      );
    }

    return null;
  };

  if (!isSidebarOpen) {
    return null;
  }

  // IDE mode: relative positioning, Canvas mode: absolute floating
  const positionClass = viewMode === 'ide' ? 'relative' : 'absolute top-0 left-0 z-50 h-full';

  return (
    <div className={positionClass}>
      <LIMNSidebar
        resizable
        defaultWidth={300}
        minWidth={250}
        maxWidth={800}
        className="h-full shadow-2xl"
      >
        <LIMNSidebar.Header>
          <span className="label text-2xs">PROJECT</span>
          <UploadFolderButton />
        </LIMNSidebar.Header>

        {fileTree.length > 0 ? (
          <div>{fileTree.map((node) => renderNode(node, 0))}</div>
        ) : (
          <div className="px-3 py-6 text-xs text-text-secondary text-center">No files</div>
        )}
      </LIMNSidebar>
    </div>
  );
};

export default Sidebar;
