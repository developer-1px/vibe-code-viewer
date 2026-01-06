/**
 * Get flat list of all visible items in dead code tree for keyboard navigation
 * Includes folders, files, AND dead code items
 */

import type { FolderNode } from '@/app/ui/AppSidebar/model/types';
import type { DeadCodeItem } from '../../../../features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';

export interface DeadCodeFlatItem {
  id: string; // 고유 ID
  parentId: string | null; // 부모 ID
  type: 'folder' | 'file' | 'dead-code-item';
  path: string;
  filePath?: string;
  deadCodeItem?: DeadCodeItem;
}

export function getDeadCodeFlatList(
  tree: FolderNode[],
  collapsedFolders: Set<string>,
  deadCodeItems: DeadCodeItem[]
): DeadCodeFlatItem[] {
  const result: DeadCodeFlatItem[] = [];

  // Group dead code items by file path
  const itemsByFile = new Map<string, DeadCodeItem[]>();
  deadCodeItems.forEach((item) => {
    const existing = itemsByFile.get(item.filePath) || [];
    existing.push(item);
    itemsByFile.set(item.filePath, existing);
  });

  // Match FileTreeRenderer's exact recursion order
  function traverseNode(node: FolderNode) {
    // Process folder
    if (node.type === 'folder') {
      result.push({
        id: node.id, // 고유 ID
        parentId: node.parentId, // 부모 ID
        type: 'folder',
        path: node.path,
      });

      // If folder is open and has children, recursively traverse them
      const isCollapsed = collapsedFolders.has(node.path);
      if (!isCollapsed && node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          traverseNode(child);
        });
      }
    }

    // Process dead-code-item nodes
    if (node.type === 'dead-code-item' && node.deadCodeItem) {
      result.push({
        id: node.id, // 고유 ID
        parentId: node.parentId, // 부모 ID
        type: 'dead-code-item',
        path: node.path,
        filePath: node.filePath,
        deadCodeItem: node.deadCodeItem,
      });
    }
  }

  // Traverse all top-level nodes
  tree.forEach((node) => {
    traverseNode(node);
  });

  return result;
}
