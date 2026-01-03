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
 */
export function buildFileTree(files: Record<string, string>): FolderNode[] {
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

  // Sort the tree
  if (root.children) {
    root.children = sortChildren(root.children);
    root.children.forEach(sortTree);
  }

  return root.children || [];
}
