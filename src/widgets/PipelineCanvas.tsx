import React, { useEffect, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { GraphData } from '../entities/VariableNode';
import CodeCard from '../entities/VariableNode/ui/CodeCard.tsx';

// Hooks & Sub-components
import { useCanvasLayout } from './PipelineCanvas/useCanvasLayout.ts';
import { useD3Zoom } from './PipelineCanvas/useD3Zoom.ts';
import CanvasConnections from './PipelineCanvas/CanvasConnections.tsx';
import CanvasBackground from './PipelineCanvas/CanvasBackground.tsx';
import CopyAllCodeButton from '../features/CopyAllCodeButton.tsx';
import ResetViewButton from '../features/ResetViewButton.tsx';

// Atoms
import {
  layoutNodesAtom,
  fullNodeMapAtom,
  entryFileAtom,
  templateRootIdAtom,
  visibleNodeIdsAtom,
  lastExpandedIdAtom
} from '../store/atoms';

interface PipelineCanvasProps {
  initialData: GraphData;
  entryFile: string;
}

const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ initialData, entryFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Jotai atoms
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const [lastExpandedId, setLastExpandedId] = useAtom(lastExpandedIdAtom);
  const setLayoutNodes = useSetAtom(layoutNodesAtom);
  const setFullNodeMap = useSetAtom(fullNodeMapAtom);
  const setEntryFile = useSetAtom(entryFileAtom);
  const setTemplateRootId = useSetAtom(templateRootIdAtom);

  // 1. Layout Logic
  const {
    layoutNodes,
    layoutLinks,
    componentGroups,
    fullNodeMap,
    templateRootId
  } = useCanvasLayout(initialData, entryFile, visibleNodeIds);

  // 2. Zoom Logic
  const { transform, centerOnNode } = useD3Zoom(containerRef);

  // Sync atoms with layout data
  useEffect(() => {
    setLayoutNodes(layoutNodes);
    setFullNodeMap(fullNodeMap);
    setEntryFile(entryFile);
    setTemplateRootId(templateRootId);
  }, [layoutNodes, fullNodeMap, entryFile, templateRootId, setLayoutNodes, setFullNodeMap, setEntryFile, setTemplateRootId]);

  // Initialize visible IDs
  useEffect(() => {
      const initialSet = new Set<string>();
      if (templateRootId) {
          initialSet.add(templateRootId);
      }
      initialData.nodes.forEach(n => {
          if (n.type === 'call' && n.filePath === entryFile) {
              initialSet.add(n.id);
          }
      });
      setVisibleNodeIds(initialSet);
  }, [initialData, templateRootId, entryFile]);

  // Center when node expanded
  useEffect(() => {
    if (lastExpandedId && layoutNodes.length > 0) {
        const targetNode = layoutNodes.find(n => n.id === lastExpandedId);
        if (targetNode) {
            // Wait a bit for layout to settle, then center
            const timer = setTimeout(() => {
                centerOnNode(targetNode);
                setLastExpandedId(null);
            }, 100);

            return () => clearTimeout(timer);
        }
    }
  }, [lastExpandedId, layoutNodes, centerOnNode]);

  // --- Handlers ---

  const handleTokenClick = (token: string, sourceNodeId: string, event: React.MouseEvent) => {
    if (fullNodeMap.has(token)) {
        const isCurrentlyVisible = visibleNodeIds.has(token);
        const forceExpand = event.metaKey || event.ctrlKey; // cmd (Mac) or ctrl (Windows/Linux)

        setVisibleNodeIds(prev => {
            const next = new Set(prev);

            if (isCurrentlyVisible && !forceExpand) {
                // TOGGLE OFF (Fold) - only if not force expanding
                // Just remove the clicked token. Layout logic naturally hides children
                // that become unreachable from the roots.
                next.delete(token);
            } else {
                // TOGGLE ON (Unfold Recursively)
                // Recursively add all downstream dependencies to the visible set
                // Stop at template nodes
                const expandRecursive = (id: string) => {
                    // Prevent infinite recursion in cyclic graphs or if already added in this batch
                    if (next.has(id)) return;

                    next.add(id);

                    const node = fullNodeMap.get(id);
                    if (node) {
                        // Stop expanding if we hit a template node
                        if (node.type === 'template') {
                            return;
                        }

                        node.dependencies.forEach(depId => {
                            if (fullNodeMap.has(depId)) {
                                expandRecursive(depId);
                            }
                        });
                    }
                };

                expandRecursive(token);
            }
            return next;
        });

        // Center camera if we are Unfolding (Expanding) OR force expanding
        if (!isCurrentlyVisible || forceExpand) {
            setLastExpandedId(token);
        }
    }
  };


  const handleSlotClick = (tokenId: string) => {
    // Find the node in layoutNodes
    const targetNode = layoutNodes.find(n => n.id === tokenId);
    if (targetNode) {
      centerOnNode(targetNode);
    }
  };

  const handleToggleAllDependencies = (nodeId: string, shouldExpand: boolean) => {
    const node = fullNodeMap.get(nodeId);
    if (!node || node.dependencies.length === 0) return;

    setVisibleNodeIds(prev => {
      const next = new Set(prev);

      if (shouldExpand) {
        // Expand all dependencies recursively
        const expandRecursive = (id: string) => {
          if (next.has(id)) return;
          next.add(id);

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

        node.dependencies.forEach(depId => {
          if (fullNodeMap.has(depId)) {
            expandRecursive(depId);
          }
        });

        // Center on the first expanded dependency
        if (node.dependencies.length > 0) {
          setLastExpandedId(node.dependencies[0]);
        }
      } else {
        // Collapse all dependencies
        const collapseRecursive = (id: string, toRemove: Set<string>) => {
          toRemove.add(id);
          const depNode = fullNodeMap.get(id);
          if (depNode) {
            depNode.dependencies.forEach(depId => {
              if (fullNodeMap.has(depId)) {
                collapseRecursive(depId, toRemove);
              }
            });
          }
        };

        const toRemove = new Set<string>();
        node.dependencies.forEach(depId => {
          if (fullNodeMap.has(depId)) {
            collapseRecursive(depId, toRemove);
          }
        });

        toRemove.forEach(id => next.delete(id));
      }

      return next;
    });
  };


  return (
    <div className="w-full h-full relative overflow-hidden bg-vibe-dark select-none" ref={containerRef}>
      
      {/* Controls */}
      <ResetViewButton />

      {/* Copy All Code Button - Bottom Right */}
      <CopyAllCodeButton />

      <div 
        ref={contentRef}
        className="origin-top-left absolute top-0 left-0 w-full h-full"
        style={{ 
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
        }}
      >
        {/* Background Groups */}
        <CanvasBackground groups={componentGroups} />

        {/* Connections */}
        <CanvasConnections
            layoutLinks={layoutLinks}
            layoutNodes={layoutNodes}
            transform={transform}
            contentRef={contentRef}
        />

        {/* Nodes */}
        {layoutNodes.map(node => (
            <div
                key={node.visualId}
                className="absolute transition-all duration-500 ease-in-out"
                style={{
                    left: node.x,
                    top: node.y,
                    zIndex: 20
                }}
            >
                <CodeCard
                    node={node}
                    onTokenClick={handleTokenClick}
                    onSlotClick={handleSlotClick}
                    onToggleAllDependencies={handleToggleAllDependencies}
                    activeDependencies={[]}
                    allKnownIds={Array.from(fullNodeMap.keys())}
                    nodeMap={fullNodeMap}
                    visibleNodeIds={visibleNodeIds}
                />
            </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineCanvas;