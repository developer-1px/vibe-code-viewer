/**
 * DeadCodeExplorer - Dead code navigation component
 * Single TreeView with all categories for unified keyboard navigation
 */

import { useAtom, useAtomValue } from 'jotai';
import type React from 'react';
import { useMemo } from 'react';
import {
  deadCodeResultsAtom,
  expandedCategoriesAtom,
  isAnalyzingAtom,
} from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms.ts';
import type { FolderNode } from '../../../features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/buildDeadCodeTree.ts';
import type { DeadCodeItem } from '../../../features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';
import { useTreeKeyboardNavigation } from '../../../shared/hooks/useTreeKeyboardNavigation.ts';
import { TreeView } from '../../../shared/ui/TreeView/TreeView.tsx';
import { useCategoryIndices } from './lib/useCategoryIndices.ts';
import { DeadCodeCategoryHeader } from './ui/DeadCodeCategoryHeader.tsx';
import { DeadCodeResultItem } from './ui/DeadCodeResultItem.tsx';

export function DeadCodeExplorer({ containerRef: _containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const isAnalyzing = useAtomValue(isAnalyzingAtom);
  const [expandedCategories] = useAtom(expandedCategoriesAtom);

  // Get all categories
  const categories = useCategoryIndices();

  // Build unified tree with all categories
  const unifiedTree = useMemo(() => {
    const tree: FolderNode[] = [];

    categories.forEach((category) => {
      // Add category header node with children
      const categoryNode: FolderNode = {
        id: `category-${category.key}`,
        parentId: null,
        type: 'category',
        name: category.title,
        path: `category-${category.key}`,
        categoryKey: category.key,
        title: category.title,
        items: category.items,
      };

      // If category is expanded, add children
      if (expandedCategories[category.key]) {
        categoryNode.children = buildDeadCodeTreeWithCategory(category.items, category.key);
      }

      tree.push(categoryNode);
    });

    return tree;
  }, [categories, expandedCategories]);

  // Flat list for keyboard navigation (all visible items)
  const flatItemList = useMemo(() => unifiedTree, [unifiedTree]);

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex, itemRefs } = useTreeKeyboardNavigation({
    flatItemList,
    collapsedFolders: new Set(), // No folders
    onToggleFolder: () => {}, // No folders
    onItemAction: () => {}, // Handled by item itself
  });

  if (!deadCodeResults || isAnalyzing) {
    return null;
  }

  if (categories.length === 0 || categories.every((cat) => cat.items.length === 0)) {
    return <div className="px-3 py-6 text-xs text-text-secondary text-center">No dead code found</div>;
  }

  return (
    <TreeView
      className="flex-1 overflow-y-auto"
      data={unifiedTree}
      getNodeType={(node) => node.type}
      getNodePath={(node) => node.path}
      getNodeChildren={(node) => node.children || []}
      collapsedPaths={new Set()}
      onToggleCollapse={() => {}}
      focusedIndex={focusedIndex}
      onFocusChange={setFocusedIndex}
      itemRefs={itemRefs}
    >
      {({ node, depth, isFocused, itemRef, handleFocus }) => {
        // Category header
        if (node.type === 'category') {
          return (
            <DeadCodeCategoryHeader
              ref={itemRef}
              title={node.title}
              items={node.items}
              categoryKey={node.categoryKey}
              focused={isFocused}
              onFocus={handleFocus}
            />
          );
        }

        // Dead code item
        if (node.type === 'dead-code-item' && node.deadCodeItem) {
          return (
            <DeadCodeResultItem
              ref={itemRef}
              item={node.deadCodeItem}
              depth={depth}
              focused={isFocused}
              onFocus={handleFocus}
            />
          );
        }

        return null;
      }}
    </TreeView>
  );
}

// Helper to build tree with category prefix
function buildDeadCodeTreeWithCategory(items: DeadCodeItem[], categoryKey: string): FolderNode[] {
  // Simplified - just create dead-code-item nodes
  // You can enhance this with folder grouping if needed
  return items.map((item, idx) => ({
    id: `${categoryKey}-item-${idx}`,
    parentId: `category-${categoryKey}`,
    type: 'dead-code-item',
    name: item.symbolName,
    // Include symbolName in path to ensure uniqueness (same file/line can have multiple items)
    path: `${categoryKey}/${item.filePath}:${item.line}:${item.symbolName}`,
    filePath: item.filePath,
    deadCodeItem: item,
  }));
}
