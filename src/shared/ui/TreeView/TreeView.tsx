/**
 * TreeView - Generic, reusable tree component
 *
 * Features:
 * - Generic type support <TNode>
 * - Render props pattern for full customization
 * - Automatic index tracking for keyboard navigation
 * - Collapse/expand state management
 * - Focus state management
 * - Auto-scroll with margin on keyboard navigation
 * - Zero-opinion styling (completely customizable)
 *
 * @example
 * <TreeView
 *   className="flex-1 overflow-y-auto p-2"
 *   data={fileTree}
 *   getNodeType={(node) => node.type}
 *   getNodePath={(node) => node.path}
 *   collapsedPaths={collapsedFolders}
 *   onToggleCollapse={toggleFolder}
 * >
 *   {({ node, depth, isFocused, isCollapsed, itemRef, handleFocus }) => (
 *     <FileTreeItem
 *       ref={itemRef}
 *       label={node.name}
 *       focused={isFocused}
 *       indent={depth}
 *       onFocus={handleFocus}
 *     />
 *   )}
 * </TreeView>
 */
import { useRef } from 'react';
import { useTreeRenderer } from './lib/useTreeRenderer';
import { useTreeState } from './lib/useTreeState';
import type { TreeViewProps } from './model/types';

export function TreeView<TNode>({
  data,
  getNodeType,
  getNodePath,
  getNodeChildren,
  collapsedPaths: externalCollapsed,
  onToggleCollapse: externalToggle,
  focusedIndex: externalFocused,
  onFocusChange: externalFocusChange,
  itemRefs: externalRefs,
  children,
  className,
}: TreeViewProps<TNode>) {
  // ScrollContainer ref - TreeView itself is the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State management (supports both internal and external state)
  const { collapsedPaths, toggleCollapse, focusedIndex, setFocusedIndex, itemRefs } = useTreeState({
    collapsedPaths: externalCollapsed,
    onToggleCollapse: externalToggle,
    focusedIndex: externalFocused,
    onFocusChange: externalFocusChange,
    itemRefs: externalRefs,
    scrollContainerRef,
  });

  // Rendering logic
  const { renderTree } = useTreeRenderer({
    getNodeType,
    getNodePath,
    getNodeChildren,
    collapsedPaths,
    focusedIndex,
    itemRefs,
    setFocusedIndex,
    toggleCollapse,
    children,
  });

  return (
    <div ref={scrollContainerRef} className={className}>
      {renderTree(data)}
    </div>
  );
}
