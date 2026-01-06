/**
 * Build nested folder tree from flat dead code items
 * Each DeadCodeItem becomes an independent node for keyboard navigation
 */

import type { DeadCodeItem } from '../../../../../shared/deadCodeAnalyzer.ts';
import type { FolderNode } from '../../../../../widgets/FileExplorer/model/types.ts';

export function buildDeadCodeTree(items: DeadCodeItem[]): FolderNode[] {
  const rootChildren: FolderNode[] = [];
  const folderMap = new Map<string, FolderNode>();

  // Each DeadCodeItem becomes an independent node
  items.forEach((item) => {
    const parts = item.filePath.split('/');
    const fileName = parts[parts.length - 1];

    // Build folder hierarchy first to get parentId
    let currentParent: FolderNode[] = rootChildren;
    let currentPath = '';
    let parentId: string | null = null;

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      // Find or create folder at current level
      let folder = currentParent.find((n) => n.id === currentPath);

      if (!folder) {
        folder = {
          id: currentPath, // 고유 ID
          parentId: parentId, // 부모 ID
          type: 'folder',
          name: folderName,
          path: currentPath,
          children: [],
        };
        currentParent.push(folder);
        folderMap.set(currentPath, folder);
      }

      parentId = currentPath;
      currentParent = folder.children!;
    }

    // Create dead-code-item node
    const itemNode: FolderNode = {
      id: `${item.filePath}:${item.line}:${item.symbolName}`, // 고유 ID
      parentId: parentId, // 부모 ID
      type: 'dead-code-item',
      name: `${fileName}:${item.line} - ${item.symbolName}`,
      path: `${item.filePath}:${item.line}:${item.symbolName}`,
      filePath: item.filePath,
      deadCodeItem: item,
    };

    // If no folders (root file), add to root
    if (parts.length === 1) {
      rootChildren.push(itemNode);
      return;
    }

    // Add dead-code-item node to deepest folder
    currentParent.push(itemNode);
  });

  // Sort: folders first, then by line number
  const sortNodes = (nodes: FolderNode[]): FolderNode[] => {
    nodes.sort((a, b) => {
      // Folders first
      if (a.type !== b.type) {
        if (a.type === 'folder') return -1;
        if (b.type === 'folder') return 1;
      }

      // For dead-code-items, sort by line number
      if (a.type === 'dead-code-item' && b.type === 'dead-code-item') {
        const lineA = a.deadCodeItem?.line || 0;
        const lineB = b.deadCodeItem?.line || 0;
        return lineA - lineB;
      }

      // Default: alphabetically
      return a.name.localeCompare(b.name);
    });

    nodes.forEach((node) => {
      if (node.type === 'folder' && node.children) {
        sortNodes(node.children);
      }
    });

    return nodes;
  };

  return sortNodes(rootChildren);
}
