/**
 * useTreeRenderer - Tree rendering logic hook
 * Handles recursive tree rendering with automatic index tracking
 */
import React, { useCallback, useRef } from 'react';
import type { TreeNodeContext } from '../model/types';

export interface UseTreeRendererProps<TNode> {
  getNodeType: (node: TNode) => string;
  getNodePath: (node: TNode) => string;
  getNodeChildren?: (node: TNode) => TNode[] | undefined;
  collapsedPaths: Set<string>;
  focusedIndex: number;
  itemRefs: React.MutableRefObject<Map<number, HTMLElement>>;
  setFocusedIndex: (index: number) => void;
  toggleCollapse: (path: string) => void;
  children: (context: TreeNodeContext<TNode>) => React.ReactNode;
}

export function useTreeRenderer<TNode>({
  getNodeType,
  getNodePath,
  getNodeChildren = (node: any) => node.children,
  collapsedPaths,
  focusedIndex,
  itemRefs,
  setFocusedIndex,
  toggleCollapse,
  children,
}: UseTreeRendererProps<TNode>) {
  // Track current rendering index (resets on each render)
  const currentIndexRef = useRef(0);

  const renderNode = useCallback((node: TNode, depth: number = 0): React.ReactNode => {
    const nodeType = getNodeType(node);
    const nodePath = getNodePath(node);
    const isCollapsed = collapsedPaths.has(nodePath);
    const nodeChildren = getNodeChildren(node);

    // Get current index and increment
    const itemIndex = currentIndexRef.current++;
    const isFocused = focusedIndex === itemIndex;

    // Create context for this node
    const context: TreeNodeContext<TNode> = {
      node,
      depth,
      isCollapsed,
      isFocused,
      itemIndex,
      itemRef: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(itemIndex, el);
        }
      },
      handleFocus: () => {
        setFocusedIndex(itemIndex);
      },
      handleToggle: () => {
        if (nodeType === 'folder') {
          toggleCollapse(nodePath);
        }
      },
    };

    // Render node using children render prop
    const nodeElement = children(context);

    // If folder and open, render children
    const isFolder = nodeType === 'folder';
    const hasChildren = nodeChildren && nodeChildren.length > 0;
    const shouldRenderChildren = isFolder && !isCollapsed && hasChildren;

    if (shouldRenderChildren) {
      return (
        <React.Fragment key={nodePath}>
          {nodeElement}
          <div>
            {nodeChildren!.map((child) => renderNode(child, depth + 1))}
          </div>
        </React.Fragment>
      );
    }

    return <React.Fragment key={nodePath}>{nodeElement}</React.Fragment>;
  }, [
    getNodeType,
    getNodePath,
    getNodeChildren,
    collapsedPaths,
    focusedIndex,
    itemRefs,
    setFocusedIndex,
    toggleCollapse,
    children,
  ]);

  const renderTree = useCallback((data: TNode[]) => {
    // Reset index counter
    currentIndexRef.current = 0;

    // Render all root nodes
    return data.map((node) => renderNode(node, 0));
  }, [renderNode]);

  return {
    renderTree,
  };
}
