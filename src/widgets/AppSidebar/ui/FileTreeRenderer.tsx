/**
 * File Tree Renderer - Recursive rendering logic for file tree
 * Generic component with children render prop pattern
 */
import React from 'react';

export interface RenderNodeContext<TNode> {
  node: TNode;
  depth: number;
  isFocused: boolean;
  isCollapsed: boolean;
  itemIndex: number;
  itemRef: (el: HTMLDivElement | null) => void;
  handleFocus: () => void;
  handleDoubleClick: () => void;
}

interface FileTreeRendererProps<TNode, TFlatItem> {
  fileTree: TNode[];
  collapsedFolders: Set<string>;
  flatItemList: TFlatItem[];
  focusedIndex: number;
  itemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onFocusChange: (index: number) => void;
  onToggleFolder: (path: string) => void;

  // Helper functions to extract node properties
  getNodeType: (node: TNode) => 'folder' | 'file' | string;
  getNodePath: (node: TNode) => string;
  getNodeChildren?: (node: TNode) => TNode[] | undefined;
  getFlatItemPath?: (item: TFlatItem) => string;
  getFlatItemType?: (item: TFlatItem) => string;

  // Render prop
  children: (context: RenderNodeContext<TNode>) => React.ReactNode;
}

export function FileTreeRenderer<TNode, TFlatItem>({
  fileTree,
  collapsedFolders,
  flatItemList,
  focusedIndex,
  itemRefs,
  onFocusChange,
  onToggleFolder,
  getNodeType,
  getNodePath,
  getNodeChildren = (node: any) => node.children,
  getFlatItemPath = (item: any) => item.path,
  getFlatItemType = (item: any) => item.type,
  children,
}: FileTreeRendererProps<TNode, TFlatItem>) {
  // Track current rendering index (matches flatItemList order exactly)
  let currentIndex = 0;

  const renderNode = (node: TNode, depth: number = 0): React.ReactNode => {
    const nodeType = getNodeType(node);
    const nodePath = getNodePath(node);
    const isCollapsed = collapsedFolders.has(nodePath);
    const nodeChildren = getNodeChildren(node);

    // Use rendering order index instead of findIndex
    // This ensures each FileTreeRenderer instance has independent indices
    const itemIndex = currentIndex++;
    const isFocused = focusedIndex === itemIndex;

    // Shared handlers
    const itemRef = (el: HTMLDivElement | null) => {
      if (el) {
        itemRefs.current.set(itemIndex, el);
      }
    };

    const handleFocus = () => {
      onFocusChange(itemIndex);
    };

    const handleDoubleClick = () => {
      if (nodeType === 'folder') {
        onToggleFolder(nodePath);
      }
    };

    // Render using children prop
    const nodeElement = children({
      node,
      depth,
      isFocused,
      isCollapsed,
      itemIndex,
      itemRef,
      handleFocus,
      handleDoubleClick,
    });

    // If folder and open, render children
    if (nodeType === 'folder' && !isCollapsed && nodeChildren && nodeChildren.length > 0) {
      return (
        <React.Fragment key={nodePath}>
          {nodeElement}
          <div>{nodeChildren.map((child) => renderNode(child, depth + 1))}</div>
        </React.Fragment>
      );
    }

    return <React.Fragment key={nodePath}>{nodeElement}</React.Fragment>;
  };

  return <div>{fileTree.map((node) => renderNode(node, 0))}</div>;
}
