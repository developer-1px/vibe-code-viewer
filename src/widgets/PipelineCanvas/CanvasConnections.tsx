import React, { useCallback, useEffect, useState } from 'react';
import { CanvasNode } from '../../entities/VariableNode';
import { getEdgeColor } from '../../entities/VariableNode/lib/styleUtils.ts';

interface CanvasConnectionsProps {
    layoutLinks: {source: string, target: string}[];
    layoutNodes: CanvasNode[];
    transform: { k: number, x: number, y: number };
    contentRef: React.RefObject<HTMLDivElement>;
}

const CanvasConnections: React.FC<CanvasConnectionsProps> = ({ layoutLinks, layoutNodes, transform, contentRef }) => {
    const [paths, setPaths] = useState<React.ReactElement[]>([]);

    const drawConnections = useCallback(() => {
        if (!contentRef.current || layoutNodes.length === 0) {
            setPaths([]);
            return;
        }

        console.log('🎨 Drawing connections for', layoutNodes.length, 'nodes');
        
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
    
        // No highlight effects needed
    
        layoutLinks.forEach((link) => {
          // link.source = Dependency (Left Node)
          // link.target = Consumer (Right Node)
          const dependencyNode = layoutNodes.find(n => n.visualId === link.source);
          const consumerNode = layoutNodes.find(n => n.visualId === link.target);
          
          if (!dependencyNode || !consumerNode) return;
    
          const depEl = document.getElementById(`node-${dependencyNode.visualId}`);
          const consEl = document.getElementById(`node-${consumerNode.visualId}`);
          
          if (!depEl || !consEl) return;
    
          // 1. Start Point (Source/Left Node - Output)
          const outputPort = depEl.querySelector(`[data-output-port="${dependencyNode.id}"]`);
          let startX, startY;
    
          if (outputPort) {
              const portRect = outputPort.getBoundingClientRect();
              const portRel = getRelativePoint(portRect);
              startX = portRel.x + portRel.w;
              startY = portRel.y + (portRel.h / 2);
          } else {
              const defLine = depEl.querySelector(`[data-line-num="${dependencyNode.startLine}"]`);
              if (defLine) {
                  const rect = defLine.getBoundingClientRect();
                  const rel = getRelativePoint(rect);
                  startX = rel.x + rel.w;
                  startY = rel.y + (rel.h / 2);
              } else {
                  const rect = depEl.getBoundingClientRect();
                  const rel = getRelativePoint(rect);
                  startX = rel.x + rel.w;
                  startY = rel.y + 60;
              }
          }
    
          // 2. End Point (Target/Right Node - Input Slots)
          // Find ALL slots for this dependency (may be used in multiple lines)
          const inputSlots = consEl.querySelectorAll(`[data-input-slot-for="${dependencyNode.id}"]`);

          const endPoints: Array<{x: number, y: number}> = [];

          if (inputSlots.length > 0) {
              inputSlots.forEach(inputSlot => {
                  const slotRect = inputSlot.getBoundingClientRect();
                  const slotRel = getRelativePoint(slotRect);
                  endPoints.push({
                      x: slotRel.x + (slotRel.w / 2),
                      y: slotRel.y + (slotRel.h / 2)
                  });
              });
          } else {
              // Fallback to token if slot not found
              const usageToken = consEl.querySelector(`[data-token="${dependencyNode.id}"]`);
              if (usageToken) {
                  const tokenRect = usageToken.getBoundingClientRect();
                  const tokenRel = getRelativePoint(tokenRect);
                  endPoints.push({
                      x: tokenRel.x,
                      y: tokenRel.y + (tokenRel.h / 2)
                  });
              } else {
                  const rect = consEl.getBoundingClientRect();
                  const rel = getRelativePoint(rect);
                  endPoints.push({
                      x: rel.x,
                      y: rel.y + 60
                  });
              }
          }
    
          // 3. Draw Bezier for each end point
          const isCrossFile = consumerNode.filePath !== dependencyNode.filePath;
          const edgeColor = getEdgeColor(dependencyNode.type);

          endPoints.forEach((endPoint, idx) => {
              const endX = endPoint.x;
              const endY = endPoint.y;

              const isHorizontal = Math.abs(startY - endY) < 40;
              const curveStrength = isHorizontal ? 0.15 : 0.4;
              const dist = Math.abs(endX - startX);
              const d = `M ${startX} ${startY} C ${startX + dist * curveStrength} ${startY}, ${endX - dist * curveStrength} ${endY}, ${endX} ${endY}`;

              newPaths.push(
                <path
                    key={`${link.source}-${link.target}-${idx}`}
                    d={d}
                    fill="none"
                    stroke={isCrossFile ? "#94a3b8" : edgeColor}
                    strokeWidth={isHorizontal ? "3" : "2"}
                    strokeOpacity={isHorizontal ? "0.8" : "0.5"}
                    strokeDasharray={isCrossFile ? "8,8" : "none"}
                    className="transition-all duration-300 pointer-events-none"
                />
              );
          });
        });
    
        setPaths(newPaths);
    
    }, [layoutLinks, transform.k, layoutNodes]);

    // Draw on zoom/pan transform changes (during manual pan/zoom)
    useEffect(() => {
        const handle = requestAnimationFrame(drawConnections);
        return () => cancelAnimationFrame(handle);
    }, [drawConnections, transform, layoutNodes]);

    return (
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-5">
            {paths}
        </svg>
    );
};

export default CanvasConnections;