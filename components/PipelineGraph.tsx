import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types';

interface PipelineGraphProps {
  data: GraphData;
  activeId: string | null;
}

const PipelineGraph: React.FC<PipelineGraphProps> = ({ data, activeId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId || !svgRef.current || !containerRef.current) return;

    // 1. Filter Logic: Trace backward from activeId
    const relevantNodes = new Set<string>();
    const relevantLinks: GraphLink[] = [];
    const queue = [activeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (relevantNodes.has(currentId)) continue;
      relevantNodes.add(currentId);

      const nodeData = data.nodes.find(n => n.id === currentId);
      if (nodeData && nodeData.dependencies) {
        nodeData.dependencies.forEach(depId => {
          relevantLinks.push({ source: depId, target: currentId });
          queue.push(depId);
        });
      }
    }

    const filteredNodes: GraphNode[] = data.nodes
      .filter(n => relevantNodes.has(n.id))
      .map(n => ({ ...n })); // Clone

    // 2. Assign Levels (Simple Topological Sort / BFS for Depth)
    const getDepth = (id: string, currentDepth = 0): number => {
      const node = data.nodes.find(n => n.id === id);
      if (!node || !node.dependencies || node.dependencies.length === 0) return currentDepth;
      
      const depths = node.dependencies.map(d => getDepth(d, currentDepth + 1));
      return Math.max(...depths, currentDepth);
    };

    // Calculate max depth to inverse the drawing (Input -> Output left to right)
    // Actually, for pipeline: Source (Left) -> Target (Right)
    // Dependency: Target depends on Source.
    // So Source should be Left.
    // If A depends on B. B -> A.
    // B has 0 dependencies. A has 1. 
    
    // Let's compute "Longest Path from a Root"
    const nodeMap = new Map(filteredNodes.map(n => [n.id, n]));
    
    // Find "roots" in this subgraph (nodes that are dependencies but don't have dependencies in the subgraph)
    filteredNodes.forEach(n => {
       n.depth = 0;
    });

    // Simple relaxation for layers
    for(let i=0; i<filteredNodes.length; i++) {
        relevantLinks.forEach(link => {
            const src = nodeMap.get(link.source as string);
            const tgt = nodeMap.get(link.target as string);
            if(src && tgt) {
                if((tgt.depth || 0) <= (src.depth || 0)) {
                    tgt.depth = (src.depth || 0) + 1;
                }
            }
        });
    }

    // 3. D3 Rendering
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Group by depth
    const levels: GraphNode[][] = [];
    filteredNodes.forEach(n => {
        const d = n.depth || 0;
        if(!levels[d]) levels[d] = [];
        levels[d].push(n);
    });

    // Assign X and Y
    const maxDepth = levels.length;
    const xStep = innerWidth / (maxDepth > 1 ? maxDepth - 1 : 1);

    filteredNodes.forEach(n => {
        const d = n.depth || 0;
        const levelNodes = levels[d];
        const indexInLevel = levelNodes.indexOf(n);
        
        n.x = d * xStep;
        n.y = (innerHeight / (levelNodes.length + 1)) * (indexInLevel + 1);
    });

    // Draw Links
    const linkGen = d3.linkHorizontal<any, GraphNode>()
        .x(d => d.x!)
        .y(d => d.y!);

    // Map links to node objects with coords
    const activeLinks = relevantLinks.map(l => ({
        source: filteredNodes.find(n => n.id === l.source),
        target: filteredNodes.find(n => n.id === l.target)
    })).filter(l => l.source && l.target);

    // Defs for marker
    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25) // Offset slightly
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#64748b");

    g.selectAll(".link")
        .data(activeLinks)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", (d) => linkGen({ source: d.source!, target: d.target! }))
        .attr("fill", "none")
        .attr("stroke", "#475569")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)");

    // Draw Nodes
    const nodes = g.selectAll(".node")
        .data(filteredNodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    // Node Box
    nodes.append("rect")
        .attr("width", 140)
        .attr("height", 60)
        .attr("x", -70)
        .attr("y", -30)
        .attr("rx", 6)
        .attr("fill", d => d.id === activeId ? "rgba(167, 139, 250, 0.2)" : "#1e293b")
        .attr("stroke", d => {
            if (d.id === activeId) return "#a78bfa";
            if (d.type === 'ref' || d.type === 'computed') return "#38bdf8";
            return "#475569";
        })
        .attr("stroke-width", d => d.id === activeId ? 2 : 1);

    // Node Label (Variable Name)
    nodes.append("text")
        .attr("dy", "-0.5em")
        .attr("text-anchor", "middle")
        .text(d => d.label)
        .attr("fill", "#f1f5f9")
        .attr("font-weight", "600")
        .attr("font-size", "12px");

    // Node Type Label
    nodes.append("text")
        .attr("dy", "1.2em")
        .attr("text-anchor", "middle")
        .text(d => `<${d.type}>`)
        .attr("fill", "#94a3b8")
        .attr("font-family", "monospace")
        .attr("font-size", "10px");

    // Tooltip / Snippet (Foreign Object for HTML text wrapping)
    // Keeping it simple with SVG title for now
    nodes.append("title")
        .text(d => d.codeSnippet || "");

  }, [data, activeId]);

  if (!activeId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <div className="text-center">
            <p className="mb-2 text-4xl">👆</p>
            <p>Select a highlighted variable in the Template Code <br/> to visualize its pipeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-vibe-dark">
        <svg ref={svgRef} className="w-full h-full block" />
    </div>
  );
};

export default PipelineGraph;
