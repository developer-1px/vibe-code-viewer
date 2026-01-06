import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { fullNodeMapAtom } from '../../app/model/atoms';
import type { CanvasNode } from '../../entities/CanvasNode/model/types';
import type { GraphData } from '../../entities/SourceFileNode/model/types';
import { layoutLinksAtom, layoutNodesAtom } from './model/atoms';

export const useCanvasLayout = (_initialData: GraphData | null, visibleNodeIds: Set<string>) => {
  const [layoutNodes, setLayoutNodes] = useState<CanvasNode[]>([]);
  const [layoutLinks, setLayoutLinks] = useState<{ source: string; target: string }[]>([]);

  // Atom setters
  const setLayoutNodesAtom = useSetAtom(layoutNodesAtom);
  const setLayoutLinksAtom = useSetAtom(layoutLinksAtom);

  // Read fullNodeMap from atom (now derived from graphDataAtom)
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  // --- Simple Layout: Just display visible nodes without auto-positioning ---
  useEffect(() => {
    // Create canvas nodes for all visible nodes
    const canvasNodes: CanvasNode[] = [];
    const links: { source: string; target: string }[] = [];

    visibleNodeIds.forEach((nodeId) => {
      const node = fullNodeMap.get(nodeId);

      if (node?.codeSnippet && node.codeSnippet.trim() !== '') {
        canvasNodes.push({
          ...node,
          level: 0,
          x: 0, // No auto-positioning, user will drag
          y: 0,
          isVisible: true,
          visualId: nodeId,
        });

        // Create links based on dependencies
        // source = dependency (left), target = consumer (right)
        node.dependencies.forEach((depId) => {
          if (visibleNodeIds.has(depId)) {
            links.push({ source: depId, target: nodeId });
          }
        });
      }
    });

    setLayoutNodes(canvasNodes);
    setLayoutLinks(links);
  }, [visibleNodeIds, fullNodeMap]);

  // --- Sync atoms with layout data ---
  useEffect(() => {
    setLayoutNodesAtom(layoutNodes);
    setLayoutLinksAtom(layoutLinks);
  }, [layoutNodes, layoutLinks, setLayoutNodesAtom, setLayoutLinksAtom]);

  return {
    layoutNodes,
    layoutLinks,
    fullNodeMap,
  };
};
