
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { getEdgeColor } from '../../entities/SourceFileNode/lib/styleUtils.ts';
import { layoutLinksAtom, layoutNodesAtom, transformAtom, cardPositionsAtom } from '../../store/atoms';

/**
 * Convert absolute rect to relative coordinates based on container and zoom
 */
const getRelativePoint = (
  rect: DOMRect,
  containerRect: DOMRect,
  zoomScale: number
) => {
  return {
    x: (rect.left - containerRect.left) / zoomScale,
    y: (rect.top - containerRect.top) / zoomScale,
    w: rect.width / zoomScale,
    h: rect.height / zoomScale
  };
};

/**
 * Find output port matching the definition line
 */
const findOutputPort = (
  depEl: HTMLElement,
  nodeId: string,
  defLine?: number
): Element | null => {
  // Try to find port matching definition line
  if (defLine) {
    const matchingPort = depEl.querySelector(
      `[data-output-port="${nodeId}"][data-output-port-line="${defLine}"]`
    );
    if (matchingPort) return matchingPort;
  }

  // Fallback to any output port
  return depEl.querySelector(`[data-output-port="${nodeId}"]`);
};

const CanvasConnections: React.FC = () => {
    const [paths, setPaths] = useState<React.ReactElement[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    // Read atoms
    const layoutLinks = useAtomValue(layoutLinksAtom);
    const layoutNodes = useAtomValue(layoutNodesAtom);
    const transform = useAtomValue(transformAtom);
    const cardPositions = useAtomValue(cardPositionsAtom);

    const drawConnections = useCallback(() => {
        // Find the content container (parent of this SVG)
        const contentElement = svgRef.current?.parentElement;
        if (!contentElement || layoutNodes.length === 0) {
            setPaths([]);
            return;
        }

        const contentRect = contentElement.getBoundingClientRect();
        const newPaths: React.ReactElement[] = [];
    
        layoutLinks.forEach((link) => {
          // link.source = Dependency (Left Node)
          // link.target = Consumer (Right Node)
          const dependencyNode = layoutNodes.find(n => n.visualId === link.source);
          const consumerNode = layoutNodes.find(n => n.visualId === link.target);
          
          if (!dependencyNode || !consumerNode) return;
    
          const depEl = document.getElementById(`node-${dependencyNode.visualId}`);
          const consEl = document.getElementById(`node-${consumerNode.visualId}`);
          
          if (!depEl || !consEl) return;

          // End Point (Target/Right Node - Input Slots)
          // Find ALL slots for this dependency (may be used in multiple lines)
          const inputSlots = consEl.querySelectorAll(`[data-input-slot-for="${dependencyNode.id}"]`);

          const endPoints: Array<{x: number, y: number, defLine?: number}> = [];

          if (inputSlots.length > 0) {
              inputSlots.forEach(inputSlot => {
                  const slotRect = inputSlot.getBoundingClientRect();
                  const slotRel = getRelativePoint(slotRect, contentRect, transform.k);

                  // Get definition line from slot data attribute
                  const defLine = (inputSlot as HTMLElement).dataset.inputSlotDefLine;

                  endPoints.push({
                      x: slotRel.x + (slotRel.w / 2),
                      y: slotRel.y + (slotRel.h / 2),
                      defLine: defLine ? parseInt(defLine) : undefined
                  });
              });
          } else {
              // Fallback to token if slot not found
              const usageToken = consEl.querySelector(`[data-token="${dependencyNode.id}"]`);
              if (usageToken) {
                  const tokenRect = usageToken.getBoundingClientRect();
                  const tokenRel = getRelativePoint(tokenRect, contentRect, transform.k);
                  endPoints.push({
                      x: tokenRel.x,
                      y: tokenRel.y + (tokenRel.h / 2)
                  });
              }
              // Removed generic fallback to top of node to prevent incorrect visual connections
          }
    
          // 3. Draw Bezier for each end point
          const isCrossFile = consumerNode.filePath !== dependencyNode.filePath;
          const edgeColor = getEdgeColor(dependencyNode.type);

          endPoints.forEach((endPoint) => {
              const endX = endPoint.x;
              const endY = endPoint.y;

              console.log('🔍 [Connection Debug]', {
                  dependency: dependencyNode.id,
                  consumer: consumerNode.id,
                  endPoint,
                  defLine: endPoint.defLine
              });

              // Find matching output port by definition line
              const outputPort = findOutputPort(depEl, dependencyNode.id, endPoint.defLine);

              console.log('📍 [Output Port Found]', {
                  found: !!outputPort,
                  defLine: endPoint.defLine,
                  portLine: outputPort ? (outputPort as HTMLElement).dataset.outputPortLine : null
              });

              // Calculate start point
              let startX: number, startY: number;
              if (outputPort) {
                  const portRect = outputPort.getBoundingClientRect();
                  const portRel = getRelativePoint(portRect, contentRect, transform.k);
                  startX = portRel.x + portRel.w;
                  startY = portRel.y + (portRel.h / 2);
              } else {
                  // Fallback to node center-right
                  const rect = depEl.getBoundingClientRect();
                  const rel = getRelativePoint(rect, contentRect, transform.k);
                  startX = rel.x + rel.w;
                  startY = rel.y + (rel.h / 2);
              }

              const isHorizontal = Math.abs(startY - endY) < 40;
              const curveStrength = isHorizontal ? 0.15 : 0.4;
              const dist = Math.abs(endX - startX);
              const d = `M ${startX} ${startY} C ${startX + dist * curveStrength} ${startY}, ${endX - dist * curveStrength} ${endY}, ${endX} ${endY}`;

              // Use global counter for unique key
              const uniqueKey = `${link.source}-${link.target}-${newPaths.length}`;

              newPaths.push(
                <path
                    key={uniqueKey}
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

    }, [layoutLinks, transform.k, layoutNodes, cardPositions]);

    // Draw on zoom/pan transform changes (during manual pan/zoom)
    useEffect(() => {
        const handle = requestAnimationFrame(drawConnections);
        return () => cancelAnimationFrame(handle);
    }, [drawConnections, transform, layoutNodes]);

    return (
        <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-5">
            {paths}
        </svg>
    );
};

export default CanvasConnections;
