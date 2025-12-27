/**
 * Node Visibility Logic - Pure Functions
 *
 * Handles expansion and collapse of node dependencies while maintaining
 * graph connectivity (nodes remain visible if reachable from other paths).
 */

import { VariableNode } from '../types';

/**
 * Check if all dependencies of a node are expanded (visible)
 */
export const checkAllDepsExpanded = (
  dependencies: string[],
  visibleNodeIds: Set<string>
): boolean => {
  if (dependencies.length === 0) return false;
  return dependencies.every(depId => visibleNodeIds.has(depId));
};

/**
 * Recursively expand all dependencies of a node
 * Stops at template nodes to prevent expanding templates
 */
export const expandDependenciesRecursive = (
  nodeId: string,
  fullNodeMap: Map<string, VariableNode>,
  visibleNodeIds: Set<string>
): Set<string> => {
  const newVisible = new Set(visibleNodeIds);

  const expandRecursive = (id: string) => {
    if (newVisible.has(id)) return;
    newVisible.add(id);

    const depNode = fullNodeMap.get(id);
    if (depNode) {
      // Stop expanding if we hit a template node
      if (depNode.type === 'template') return;

      depNode.dependencies.forEach(depId => {
        if (fullNodeMap.has(depId)) {
          expandRecursive(depId);
        }
      });
    }
  };

  const node = fullNodeMap.get(nodeId);
  if (node) {
    node.dependencies.forEach(depId => {
      if (fullNodeMap.has(depId)) {
        expandRecursive(depId);
      }
    });
  }

  return newVisible;
};

/**
 * Collapse dependencies while keeping nodes reachable from other paths
 *
 * Algorithm:
 * 1. Collect all candidates for removal (node's dependency subtree)
 * 2. Remove candidates temporarily from visible set
 * 3. Find which candidates are still reachable from remaining visible nodes
 * 4. Restore reachable nodes
 *
 * This ensures that nodes with multiple parents remain visible
 * as long as at least one parent is still expanded.
 */
export const collapseDependencies = (
  nodeId: string,
  fullNodeMap: Map<string, VariableNode>,
  visibleNodeIds: Set<string>
): Set<string> => {
  const next = new Set(visibleNodeIds);
  const toRemove = new Set<string>();

  // Step 1: Collect all candidates for removal (this node's dependency subtree)
  const collectSubtree = (id: string) => {
    if (toRemove.has(id)) return;
    toRemove.add(id);
    const depNode = fullNodeMap.get(id);
    if (depNode) {
      depNode.dependencies.forEach(depId => {
        if (fullNodeMap.has(depId)) {
          collectSubtree(depId);
        }
      });
    }
  };

  const node = fullNodeMap.get(nodeId);
  if (node) {
    node.dependencies.forEach(depId => {
      if (fullNodeMap.has(depId)) {
        collectSubtree(depId);
      }
    });
  }

  // Step 2: Remove candidates temporarily
  toRemove.forEach(id => next.delete(id));

  // Step 3: Find which candidates are still reachable from other visible nodes
  const stillReachable = new Set<string>();

  const findReachableFromNode = (nodeId: string) => {
    const n = fullNodeMap.get(nodeId);
    if (!n) return;

    n.dependencies.forEach(depId => {
      if (toRemove.has(depId) && !stillReachable.has(depId)) {
        stillReachable.add(depId);
        // Recursively mark this subtree as reachable
        findReachableFromNode(depId);
      }
    });
  };

  // Check from all remaining visible nodes
  next.forEach(visibleId => {
    findReachableFromNode(visibleId);
  });

  // Step 4: Restore nodes that are still reachable
  stillReachable.forEach(id => next.add(id));

  return next;
};

/**
 * Get the first dependency ID (used for centering after expand)
 */
export const getFirstDependency = (
  nodeId: string,
  fullNodeMap: Map<string, VariableNode>
): string | null => {
  const node = fullNodeMap.get(nodeId);
  if (!node || node.dependencies.length === 0) return null;
  return node.dependencies[0];
};
