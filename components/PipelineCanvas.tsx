import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphData, CanvasNode } from '../types';
import CodeCard from './CodeCard';
import { RefreshCw, RotateCcw } from 'lucide-react';

interface PipelineCanvasProps {
  initialData: GraphData;
}

// Layout Constants
const LEVEL_SPACING = 720; // Horizontal space between columns
const VERTICAL_GAP = 40; // Gap between vertically stacked nodes

// Visual Tree Structure for Layout Calculation
interface VisualTreeNode extends CanvasNode {
    children: VisualTreeNode[];
    subtreeHeight: number; 
}

// Helper to check if node exists in current branch to prevent infinite cycles
const hasCycle = (path: string[], nextId: string) => {
    return path.includes(nextId);
};

// Helper to find the first usage index of a variable in a code snippet
const getUsageIndex = (code: string, id: string) => {
    try {
        const escapedId = id.replace(/\$/g, '\\$');
        const regex = new RegExp(`(?<![a-zA-Z0-9_$])${escapedId}(?![a-zA-Z0-9_$])`);
        const match = regex.exec(code);
        return match ? match.index : Infinity;
    } catch (e) {
        return code.indexOf(id);
    }
};

// Helper to estimate the rendered height of a node
const estimateNodeHeight = (node: CanvasNode) => {
    const lines = node.codeSnippet.split('\n').length;
    const baseHeight = 60; 
    const lineHeight = 20; 
    return baseHeight + (lines * lineHeight);
};

const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ initialData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  
  const fullNodeMap = useMemo(() => {
    return new Map(initialData.nodes.map(n => [n.id, n]));
  }, [initialData]);
  
  // State for Progressive Exploration
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set(['TEMPLATE_ROOT']));
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);

  const [transform, setTransform] = useState({ k: 0.9, x: 0, y: 0 });
  const [paths, setPaths] = useState<React.ReactElement[]>([]);
  
  const [layoutNodes, setLayoutNodes] = useState<CanvasNode[]>([]);
  const [layoutLinks, setLayoutLinks] = useState<{source: string, target: string}[]>([]);

  // --- Layout Algorithm (Dynamic Subgraph) ---
  useEffect(() => {
    if (fullNodeMap.size === 0) return;

    // Always start layout from Template Root
    const rootId = 'TEMPLATE_ROOT';
    const rawRoot = fullNodeMap.get(rootId);
    if (!rawRoot) return;

    // State for DAG construction to prevent duplicates
    const visited = new Set<string>();
    const extraLinks: {source: string, target: string}[] = [];

    // 1. Build Visual Tree (Only recursively include VISIBLE nodes)
    const buildVisualTree = (nodeId: string, level: number, path: string[], parentId: string | null): VisualTreeNode | null => {
        // Prevent Duplicates: If already visited, register link and stop branch
        if (visited.has(nodeId)) {
            if (parentId) {
                // Dependency (nodeId) -> Consumer (parentId)
                extraLinks.push({ source: nodeId, target: parentId });
            }
            return null;
        }

        visited.add(nodeId);

        const raw = fullNodeMap.get(nodeId)!;
        const visualId = nodeId; // Use real ID for stable visualization in this mode
        
        const node: VisualTreeNode = {
            ...raw,
            level,
            x: 0,
            y: 0,
            isVisible: true,
            visualId,
            children: [],
            subtreeHeight: 0
        };

        // Sort dependencies for consistent visual ordering
        const sortedDeps = [...raw.dependencies].sort((a, b) => {
            const indexA = getUsageIndex(raw.codeSnippet, a);
            const indexB = getUsageIndex(raw.codeSnippet, b);
            if (indexA !== indexB) return indexA - indexB;
            const nodeA = fullNodeMap.get(a);
            const nodeB = fullNodeMap.get(b);
            return (nodeA?.startLine || 0) - (nodeB?.startLine || 0);
        });

        sortedDeps.forEach(depId => {
            // CRITICAL: Only recurse if the dependency is marked as VISIBLE
            if (visibleNodeIds.has(depId) && !hasCycle(path, depId) && fullNodeMap.has(depId)) {
                const child = buildVisualTree(depId, level + 1, [...path, nodeId], nodeId);
                if (child) {
                    node.children.push(child);
                }
            }
        });

        return node;
    };

    const treeRoot = buildVisualTree(rootId, 1, [], null);

    if (!treeRoot) return;

    // 2. Compute Subtree Heights
    const computeHeights = (node: VisualTreeNode) => {
        const myHeight = estimateNodeHeight(node);
        if (node.children.length === 0) {
            node.subtreeHeight = myHeight;
            return;
        }
        let totalChildrenHeight = 0;
        node.children.forEach(child => {
            computeHeights(child);
            totalChildrenHeight += child.subtreeHeight;
        });
        totalChildrenHeight += (node.children.length - 1) * VERTICAL_GAP;
        node.subtreeHeight = Math.max(myHeight, totalChildrenHeight);
    };

    computeHeights(treeRoot);

    // 3. Assign Coordinates
    const flatNodes: CanvasNode[] = [];
    const flatLinks: {source: string, target: string}[] = [];

    const assignCoordinates = (node: VisualTreeNode, startY: number, level: number) => {
        const myHeight = estimateNodeHeight(node);
        node.x = -(level * LEVEL_SPACING);
        node.y = startY + (node.subtreeHeight / 2) - (myHeight / 2);

        flatNodes.push(node);

        let childrenStackHeight = 0;
        node.children.forEach((child, i) => {
           childrenStackHeight += child.subtreeHeight;
           if (i < node.children.length - 1) childrenStackHeight += VERTICAL_GAP;
        });

        let currentChildY = startY + (node.subtreeHeight - childrenStackHeight) / 2;

        node.children.forEach(child => {
            flatLinks.push({ source: child.visualId, target: node.visualId });
            assignCoordinates(child, currentChildY, level + 1);
            currentChildY += child.subtreeHeight + VERTICAL_GAP;
        });
    };

    const totalRootHeight = treeRoot.subtreeHeight;
    const startY = -(totalRootHeight / 2);
    
    assignCoordinates(treeRoot, startY, 1); 

    // Shift everything so Template is roughly centered initially or stable
    flatNodes.forEach(n => n.x += LEVEL_SPACING); // Move Template to x=0
    
    setLayoutNodes(flatNodes);
    setLayoutLinks([...flatLinks, ...extraLinks]);

  }, [visibleNodeIds, fullNodeMap]);


  // 2. Setup Zoom
  useEffect(() => {
    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        const zoom = d3.zoom<HTMLDivElement, unknown>()
            .scaleExtent([0.1, 2])
            .on('zoom', (event) => {
                setTransform(event.transform);
            });
        
        zoomBehaviorRef.current = zoom;
        
        const selection = d3.select(containerRef.current);
        selection.call(zoom)
                 .on("dblclick.zoom", null);
        
        // Initial Center
        selection.call(zoom.transform, d3.zoomIdentity.translate(width/2 - 300, height/2).scale(0.9));
    }
  }, []);

  // 3. Draw Connections
  const drawConnections = useCallback(() => {
    if (!contentRef.current || layoutNodes.length === 0) {
        setPaths([]);
        return;
    }
    
    const contentRect = contentRef.current.getBoundingClientRect();
    const newPaths: React.ReactElement[] = [];

    const getRelativePoint = (rect: DOMRect) => {
      return {
        x: (rect.left - contentRect.left) / transform.k,
        y: (rect.top - contentRect.top) / transform.k,
        w: rect.width / transform.k,
        h: rect.height / transform.k
      };
    };

    // Reset slots styling
    document.querySelectorAll('[data-slot-line]').forEach(el => {
        el.classList.remove('bg-vibe-accent', 'border-vibe-accent', 'shadow-[0_0_8px_rgba(56,189,248,0.8)]', 'scale-125');
        el.classList.add('bg-slate-700', 'border-slate-600');
    });

    layoutLinks.forEach((link) => {
      const sourceNode = layoutNodes.find(n => n.visualId === link.source);
      const targetNode = layoutNodes.find(n => n.visualId === link.target);
      
      if (!sourceNode || !targetNode) return;

      const sourceEl = document.getElementById(`node-${sourceNode.visualId}`);
      const targetEl = document.getElementById(`node-${targetNode.visualId}`);
      
      if (!sourceEl || !targetEl) return;

      // Logic for connection points (Port to Slot)
      const sourcePort = sourceEl.querySelector(`[data-output-port="${sourceNode.id}"]`);
      let startX, startY;
      
      if (sourcePort) {
          const portRect = sourcePort.getBoundingClientRect();
          const portRel = getRelativePoint(portRect);
          startX = portRel.x + (portRel.w / 2);
          startY = portRel.y + (portRel.h / 2);
      } else {
          const sourceRect = sourceEl.getBoundingClientRect();
          const sRel = getRelativePoint(sourceRect);
          startX = sRel.x + sRel.w;
          startY = sRel.y + 60; 
      }

      const targetTokens = targetEl.querySelectorAll(`[data-token="${sourceNode.id}"]`);
      const targetLines = new Set<string>();

      if (targetTokens.length > 0) {
        targetTokens.forEach((tokenEl) => {
            const lineEl = tokenEl.closest('.code-line');
            if (lineEl) {
                const lineNum = lineEl.getAttribute('data-line-num');
                if (lineNum) targetLines.add(lineNum);
            }
        });
      }

      if (targetLines.size > 0) {
          targetLines.forEach(lineNum => {
              const slotEl = targetEl.querySelector(`[data-slot-line="${lineNum}"]`);
              if (slotEl) {
                  const slotRect = slotEl.getBoundingClientRect();
                  const slotRel = getRelativePoint(slotRect);
                  
                  const endX = slotRel.x + (slotRel.w / 2);
                  const endY = slotRel.y + (slotRel.h / 2);

                  const isHorizontal = Math.abs(startY - endY) < 40;
                  const curveStrength = isHorizontal ? 0.15 : 0.4;
                  const dist = Math.abs(endX - startX);
                  
                  const d = `M ${startX} ${startY} C ${startX + dist * curveStrength} ${startY}, ${endX - dist * curveStrength} ${endY}, ${endX} ${endY}`;
                  
                  newPaths.push(
                    <path 
                        key={`${link.source}-${link.target}-${lineNum}`}
                        d={d}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={isHorizontal ? "3" : "2"}
                        strokeOpacity={isHorizontal ? "0.8" : "0.5"}
                        className="transition-all duration-300 pointer-events-none"
                    />
                  );
                  
                  slotEl.classList.remove('bg-slate-700', 'border-slate-600');
                  slotEl.classList.add('bg-vibe-accent', 'border-vibe-accent', 'shadow-[0_0_8px_rgba(56,189,248,0.8)]', 'scale-125');
              }
          });
      }
    });

    setPaths(newPaths);

  }, [layoutLinks, transform.k, layoutNodes]);

  useEffect(() => {
    const handle = requestAnimationFrame(drawConnections);
    return () => cancelAnimationFrame(handle);
  }, [drawConnections, transform]);

  useEffect(() => {
      const t = setTimeout(drawConnections, 50); 
      return () => clearTimeout(t);
  }, [layoutNodes, drawConnections]);


  const centerOnNode = useCallback((node: CanvasNode) => {
    if (!containerRef.current || !zoomBehaviorRef.current) return;

    const nodeEl = document.getElementById(`node-${node.visualId}`);
    if (!nodeEl) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const rect = nodeEl.getBoundingClientRect();
    const currentK = transform.k;
    
    // Calculate unscaled dimensions
    const w = rect.width / currentK;
    const h = rect.height / currentK;

    const centerX = node.x + w / 2;
    const centerY = node.y + h / 2;

    const targetX = width / 2 - centerX * currentK;
    const targetY = height / 2 - centerY * currentK;

    const newTransform = d3.zoomIdentity.translate(targetX, targetY).scale(currentK);

    d3.select(containerRef.current)
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .call(zoomBehaviorRef.current.transform, newTransform);
  }, [transform.k]);

  // Center when a new node is expanded
  useEffect(() => {
    if (lastExpandedId && layoutNodes.length > 0) {
        const targetNode = layoutNodes.find(n => n.id === lastExpandedId);
        if (targetNode) {
            const timer = setTimeout(() => {
                centerOnNode(targetNode);
                setLastExpandedId(null);
            }, 100); 
            return () => clearTimeout(timer);
        }
    }
  }, [lastExpandedId, layoutNodes, centerOnNode]);

  const handleTokenClick = (token: string, sourceNodeId: string) => {
    // 1. If we click a token that is a known node ID
    if (fullNodeMap.has(token)) {
        
        setVisibleNodeIds(prev => {
            const next = new Set(prev);
            
            // Recursive helper to expand the node and ALL its dependencies
            const expandRecursive = (id: string) => {
                // If already visible, we don't need to re-scan this branch
                // (assuming structure is append-only for visibility)
                if (next.has(id)) return;
                
                next.add(id);
                
                const node = fullNodeMap.get(id);
                if (node) {
                    node.dependencies.forEach(depId => {
                        if (fullNodeMap.has(depId)) {
                            expandRecursive(depId);
                        }
                    });
                }
            };

            // Start recursion
            expandRecursive(token);
            
            return next;
        });

        // 3. Mark for centering
        setLastExpandedId(token);
    }
  };

  const handleReset = () => {
    setVisibleNodeIds(new Set(['TEMPLATE_ROOT']));
    setLastExpandedId('TEMPLATE_ROOT'); // Recenter on template
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-vibe-dark select-none" ref={containerRef}>
      
      <div className="absolute top-4 right-4 z-[100] flex gap-2">
         {visibleNodeIds.size > 1 && (
             <button 
                onClick={handleReset} 
                className="bg-vibe-panel/90 backdrop-blur px-4 py-2 rounded-lg border border-vibe-border text-slate-200 hover:text-white hover:border-vibe-accent flex items-center gap-2 text-sm shadow-xl transition-all font-medium"
             >
                <RotateCcw className="w-4 h-4 text-pink-500" />
                Reset View
             </button>
         )}
         <button onClick={() => drawConnections()} className="bg-vibe-panel/80 p-2 rounded-lg border border-vibe-border text-slate-400 hover:text-white shadow-xl">
            <RefreshCw className="w-4 h-4" />
         </button>
      </div>

      <div 
        ref={contentRef}
        className="origin-top-left absolute top-0 left-0 w-full h-full"
        style={{ 
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
        }}
      >
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-50">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" fillOpacity="1" />
                </marker>
            </defs>
            {paths}
        </svg>

        {layoutNodes.map(node => (
            <div 
                key={node.visualId} 
                className="absolute transition-all duration-500 ease-in-out"
                style={{
                    left: node.x,
                    top: node.y,
                    zIndex: 10
                }}
            >
                <div>
                     <CodeCard 
                        node={node} 
                        onTokenClick={handleTokenClick}
                        activeDependencies={[]} 
                        allKnownIds={Array.from(fullNodeMap.keys())}
                    />
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineCanvas;