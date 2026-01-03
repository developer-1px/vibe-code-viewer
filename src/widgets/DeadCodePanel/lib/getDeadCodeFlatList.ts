/**
 * Get flat list of all visible items in dead code tree for keyboard navigation
 * Includes folders, files, AND dead code items
 */
import type { FolderNode } from '../../AppSidebar/model/types';
import type { DeadCodeItem } from '../../../shared/deadCodeAnalyzer';

export interface DeadCodeFlatItem {
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
  deadCodeItems.forEach(item => {
    const existing = itemsByFile.get(item.filePath) || [];
    existing.push(item);
    itemsByFile.set(item.filePath, existing);
  });

  // Match FileTreeRenderer's exact recursion order
  function traverseNode(node: FolderNode) {
    // Process folder
    if (node.type === 'folder') {
      result.push({
        type: 'folder',
        path: node.path,
      });

      // If folder is open and has children, recursively traverse them
      const isCollapsed = collapsedFolders.has(node.path);
      if (!isCollapsed && node.children && node.children.length > 0) {
        node.children.forEach(child => traverseNode(child));
      }
    }

    // Process file and its dead code items
    if (node.type === 'file' && node.filePath) {
      const items = itemsByFile.get(node.filePath) || [];

      // Add each dead code item in order
      items.forEach(item => {
        result.push({
          type: 'dead-code-item',
          path: `${item.filePath}:${item.line}:${item.symbolName}`,
          filePath: item.filePath,
          deadCodeItem: item,
        });
      });
    }
  }

  // Traverse all top-level nodes
  tree.forEach(node => traverseNode(node));

  return result;
}
