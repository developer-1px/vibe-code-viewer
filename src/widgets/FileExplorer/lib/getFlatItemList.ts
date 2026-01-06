/**
 * Get flat list of all visible items for keyboard navigation
 */
import type { FlatItem, FolderNode } from '../model/types';

export function getFlatItemList(fileTree: FolderNode[], collapsedFolders: Set<string>): FlatItem[] {
  const items: FlatItem[] = [];

  // Match FileTreeRenderer's exact recursion order
  const traverseNode = (node: FolderNode) => {
    if (node.type === 'folder') {
      items.push({
        id: node.id, // 고유 ID
        parentId: node.parentId, // 부모 ID
        type: 'folder',
        path: node.path,
      });

      // If folder is open and has children, recursively traverse them
      const isCollapsed = collapsedFolders.has(node.path);
      if (!isCollapsed && node.children && node.children.length > 0) {
        node.children.forEach((child) => traverseNode(child));
      }
    } else if (node.type === 'file' && node.filePath) {
      items.push({
        id: node.id, // 고유 ID
        parentId: node.parentId, // 부모 ID
        type: 'file',
        path: node.path,
        filePath: node.filePath,
      });
    }
  };

  // Traverse all top-level nodes
  fileTree.forEach((node) => traverseNode(node));

  return items;
}
