/**
 * Build file tree from flat file list
 */
import { splitPath, joinPath } from '@/shared/pathUtils';
import type { FolderNode } from '../model/types';

/**
 * Sort tree nodes: folders first, then files (alphabetically)
 */
function sortChildren(nodes: FolderNode[]): FolderNode[] {
  return nodes.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Recursively sort all nodes in the tree
 */
function sortTree(node: FolderNode) {
  if (node.children) {
    node.children = sortChildren(node.children);
    node.children.forEach(sortTree);
  }
}

/**
 * Build hierarchical file tree from flat file list
 * @param files - Record of file paths to content
 * @param focusedFolder - Optional folder path to use as root (Folder Focus Mode)
 */
export function buildFileTree(files: Record<string, string>, focusedFolder: string | null = null): FolderNode[] {
  const root: FolderNode = {
    id: '__root__',
    parentId: null,
    name: 'root',
    path: '',
    type: 'folder',
    children: []
  };

  // Folder Focus Mode: 특정 폴더만 표시
  let filteredFiles = files;
  if (focusedFolder) {
    filteredFiles = {};
    const prefix = focusedFolder.endsWith('/') ? focusedFolder : focusedFolder + '/';

    Object.keys(files).forEach((filePath) => {
      if (filePath.startsWith(prefix)) {
        // Remove prefix from path (e.g., "src/features/Search/ui/Modal.tsx" -> "ui/Modal.tsx")
        const relativePath = filePath.substring(prefix.length);
        filteredFiles[relativePath] = files[filePath];
      }
    });
  }

  Object.keys(filteredFiles)
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

        let childNode = currentNode.children.find((child) => child.id === currentPath);

        if (!childNode) {
          childNode = {
            id: currentPath,                    // 고유 ID
            parentId: currentNode.id,           // 부모 ID
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

  // Sort the tree
  if (root.children) {
    root.children = sortChildren(root.children);
    root.children.forEach(sortTree);
  }

  return root.children || [];
}
