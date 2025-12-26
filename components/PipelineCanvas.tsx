import React, { useEffect, useRef, useState } from 'react';
import { GraphData } from '../entities/VariableNode';
import CodeCard from '../entities/VariableNode/ui/CodeCard';
import { RefreshCw, RotateCcw, Copy, Check } from 'lucide-react';

// Hooks & Sub-components
import { useCanvasLayout } from './PipelineCanvas/useCanvasLayout';
import { useD3Zoom } from './PipelineCanvas/useD3Zoom';
import CanvasConnections from './PipelineCanvas/CanvasConnections';
import CanvasBackground from './PipelineCanvas/CanvasBackground';

interface PipelineCanvasProps {
  initialData: GraphData;
  entryFile: string;
}

const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ initialData, entryFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // State for Progressive Exploration
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
  const [isAllCopied, setIsAllCopied] = useState(false);

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

  const handleReset = () => {
    const initialSet = new Set<string>();
    if (templateRootId) initialSet.add(templateRootId);
    fullNodeMap.forEach(n => {
        if (n.type === 'call' && n.filePath === entryFile) initialSet.add(n.id);
    });
    setVisibleNodeIds(initialSet);
    if (templateRootId) setLastExpandedId(templateRootId);
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

  const handleCopyAllCode = async () => {
    try {
      // Calculate dependency depth for each node (deeper = more dependencies)
      const getDepth = (nodeId: string, visited = new Set<string>()): number => {
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        const node = fullNodeMap.get(nodeId);
        if (!node || node.dependencies.length === 0) return 0;

        const depths = node.dependencies.map(depId => getDepth(depId, new Set(visited)));
        return 1 + Math.max(...depths, 0);
      };

      // Sort nodes by dependency depth (reverse: dependencies first, dependents last)
      const sortedNodes = [...layoutNodes].sort((a, b) => {
        const depthA = getDepth(a.id);
        const depthB = getDepth(b.id);
        if (depthA !== depthB) return depthA - depthB; // Shallower (fewer deps) first
        return a.filePath.localeCompare(b.filePath); // Same depth: sort by file path
      });

      // Simple format: Path -> Code
      let text = `# Code Context (Dependency Order)\n\n`;
      text += `Entry: ${entryFile}\n`;
      text += `Total: ${sortedNodes.length} blocks\n\n`;
      text += `---\n\n`;

      sortedNodes.forEach((node, index) => {
        // File path and position
        text += `## ${index + 1}. ${node.filePath}\n\n`;

        // Code block
        text += '```typescript\n';
        text += node.codeSnippet;
        text += '\n```\n\n';
      });

      await navigator.clipboard.writeText(text);
      setIsAllCopied(true);
      setTimeout(() => setIsAllCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy all code:', err);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-vibe-dark select-none" ref={containerRef}>
      
      {/* Controls */}
      <div className="absolute top-4 right-4 z-40 flex gap-2">
         {visibleNodeIds.size > 1 && (
             <button onClick={handleReset} className="bg-vibe-panel/90 backdrop-blur px-4 py-2 rounded-lg border border-vibe-border text-slate-200 hover:text-white hover:border-vibe-accent flex items-center gap-2 text-sm shadow-xl transition-all font-medium">
                <RotateCcw className="w-4 h-4 text-pink-500" />
                Reset View
             </button>
         )}
         <button className="bg-vibe-panel/80 p-2 rounded-lg border border-vibe-border text-slate-400 hover:text-white shadow-xl">
            <RefreshCw className="w-4 h-4" />
         </button>
      </div>

      {/* Copy All Code Button - Bottom Right */}
      {layoutNodes.length > 0 && (
        <div className="absolute bottom-6 right-6 z-40">
          <button
            onClick={handleCopyAllCode}
            className="bg-vibe-panel/90 backdrop-blur px-4 py-2.5 rounded-lg border border-vibe-border text-slate-200 hover:text-white hover:border-vibe-accent flex items-center gap-2 text-sm shadow-xl transition-all font-medium group"
            title="Copy all visible code for AI analysis"
          >
            {isAllCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                <span>Copy All for AI</span>
                <span className="text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                  {layoutNodes.length} nodes
                </span>
              </>
            )}
          </button>
        </div>
      )}

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