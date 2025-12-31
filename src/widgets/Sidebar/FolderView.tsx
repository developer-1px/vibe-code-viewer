/**
 * Traditional Folder Tree View
 * VSCode-style folder structure with collapsible folders
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';
import { focusedPaneAtom, openedFilesAtom } from '../../store/atoms';
import FolderItemView from './FolderItemView';
import FileItemView from './FileItemView';

interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: FolderNode[];
  filePath?: string; // file일 경우 전체 경로
}

const FolderView = ({ files }: { files: Record<string, string> }) => {
  const setOpenedFiles = useSetAtom(openedFilesAtom);
  const [focusedPane, setFocusedPane] = useAtom(focusedPaneAtom);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // 초기 상태: 루트 레벨 폴더는 열어두고, 그 하위 폴더들은 모두 접어둠
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => {
    const allFolders = new Set<string>();
    Object.keys(files).forEach((filePath) => {
      const parts = filePath.split('/').filter(Boolean);
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        // 루트 레벨 폴더(depth 0)는 제외, 그 이하만 접어둠
        if (i > 0) {
          allFolders.add(folderPath);
        }
      }
    });
    return allFolders;
  });

  // 파일 경로를 트리 구조로 변환
  const fileTree = useMemo(() => {
    const root: FolderNode = { name: 'root', path: '', type: 'folder', children: [] };

    Object.keys(files)
      .sort()
      .forEach((filePath) => {
        const parts = filePath.split('/').filter(Boolean);
        let currentNode = root;

        parts.forEach((part, index) => {
          const isFile = index === parts.length - 1;
          const currentPath = parts.slice(0, index + 1).join('/');

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

    // Folder 먼저, File 나중에 정렬
    const sortChildren = (nodes: FolderNode[]): FolderNode[] => {
      return nodes.sort((a, b) => {
        // 폴더를 먼저
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        // 같은 타입이면 이름순
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
    // Open file - add to openedFiles
    setOpenedFiles(prev => new Set([...prev, filePath]));
  }, [setOpenedFiles]);

  // Get flat list of all visible items (folders + files for keyboard navigation)
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
    console.log('[FolderView] Setting focusedPane to sidebar on mount');
    setFocusedPane('sidebar');
  }, [setFocusedPane]);

  // Log focusedPane changes
  useEffect(() => {
    console.log('[FolderView] focusedPane changed:', focusedPane);
  }, [focusedPane]);


  // TEST: Always-enabled hotkey
  useHotkeys('g', () => {
    console.log('[FolderView] G key pressed - FolderView hotkey WORKS!');
    console.log('[FolderView] Current focusedPane:', focusedPane);
    console.log('[FolderView] Current flatItemList:', flatItemList);
  });

  // Keyboard navigation - Up/Down for both folders and files
  useHotkeys('down', () => {
    console.log('[FolderView] down key pressed');
    if (flatItemList.length === 0) return;
    setFocusedIndex(prev => Math.min(prev + 1, flatItemList.length - 1));
  }, {
    scopes: ['sidebar'],
    enabled: focusedPane === 'sidebar'
  });

  useHotkeys('up', () => {
    console.log('[FolderView] up key pressed');
    if (flatItemList.length === 0) return;
    setFocusedIndex(prev => Math.max(prev - 1, 0));
  }, {
    scopes: ['sidebar'],
    enabled: focusedPane === 'sidebar'
  });

  // Enter - open file or toggle folder
  useHotkeys('enter', () => {
    console.log('[FolderView] enter key pressed, focusedIndex:', focusedIndex);
    if (flatItemList.length === 0) return;
    const item = flatItemList[focusedIndex];
    if (item.type === 'file' && item.filePath) {
      handleFileClick(item.filePath);
    } else if (item.type === 'folder') {
      toggleFolder(item.path);
    }
  }, {
    scopes: ['sidebar'],
    enabled: focusedPane === 'sidebar'
  });

  // Right - expand folder
  useHotkeys('right', () => {
    console.log('[FolderView] right key pressed');
    if (flatItemList.length === 0) return;
    const item = flatItemList[focusedIndex];
    if (item.type === 'folder') {
      // If collapsed, expand it
      if (collapsedFolders.has(item.path)) {
        toggleFolder(item.path);
      }
    }
  }, {
    scopes: ['sidebar'],
    enabled: focusedPane === 'sidebar'
  });

  // Left - collapse folder
  useHotkeys('left', () => {
    console.log('[FolderView] left key pressed');
    if (flatItemList.length === 0) return;
    const item = flatItemList[focusedIndex];
    if (item.type === 'folder') {
      // If expanded, collapse it
      if (!collapsedFolders.has(item.path)) {
        toggleFolder(item.path);
      }
    }
  }, {
    scopes: ['sidebar'],
    enabled: focusedPane === 'sidebar'
  });

  const renderNode = (node: FolderNode, depth: number = 0): React.ReactNode => {
    const isCollapsed = collapsedFolders.has(node.path);

    if (node.type === 'file' && node.filePath) {
      return (
        <FileItemView
          key={node.path}
          node={node}
          depth={depth}
          isFocused={flatItemList[focusedIndex]?.type === 'file' && flatItemList[focusedIndex].filePath === node.filePath}
          onFileFocus={(filePath) => {
            // Single click - update focus
            const itemIndex = flatItemList.findIndex(item => item.type === 'file' && item.filePath === filePath);
            if (itemIndex >= 0) setFocusedIndex(itemIndex);
          }}
          onFileClick={(filePath) => {
            // Double click - open file
            handleFileClick(filePath);
          }}
        />
      );
    }

    if (node.type === 'folder') {
      return (
        <FolderItemView
          key={node.path}
          node={node}
          depth={depth}
          isCollapsed={isCollapsed}
          isFocused={flatItemList[focusedIndex]?.type === 'folder' && flatItemList[focusedIndex].path === node.path}
          onFolderFocus={(path) => {
            // Single click - update focus
            const itemIndex = flatItemList.findIndex(item => item.type === 'folder' && item.path === path);
            if (itemIndex >= 0) setFocusedIndex(itemIndex);
          }}
          onFolderClick={(path) => {
            // Double click - toggle folder
            toggleFolder(path);
          }}
          renderChildren={(childDepth) =>
            !isCollapsed && node.children ? (
              <div>{node.children.map((child) => renderNode(child, childDepth))}</div>
            ) : null
          }
        />
      );
    }

    return null;
  };

  return (
    <div className="flex-1 bg-[#0f172a] border-b border-vibe-border overflow-y-auto py-1">
      {/* Folder Tree */}
      {fileTree.length > 0 ? (
        <div>{fileTree.map((node) => renderNode(node, 0))}</div>
      ) : (
        <div className="px-3 py-6 text-[11px] text-slate-500 text-center">No files</div>
      )}
    </div>
  );
};

export default FolderView;
