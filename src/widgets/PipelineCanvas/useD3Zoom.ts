import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import * as d3 from 'd3';
import { CanvasNode } from '../../entities/CanvasNode';
import { lastExpandedIdAtom, layoutNodesAtom, transformAtom } from '../../store/atoms';

export const useD3Zoom = (containerRef: RefObject<HTMLDivElement>) => {
    const [transform, setTransform] = useState({ k: 0.9, x: 0, y: 0 });
    const setTransformAtom = useSetAtom(transformAtom);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);

    // Atoms for auto-centering
    const [lastExpandedId, setLastExpandedId] = useAtom(lastExpandedIdAtom);
    const layoutNodes = useAtomValue(layoutNodesAtom);

    useEffect(() => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            
            const zoom = d3.zoom<HTMLDivElement, unknown>()
                .scaleExtent([0.1, 2])
                .filter((event: any) => {
                   if (event.type === 'mousedown' || event.type === 'touchstart') {
                     return !event.ctrlKey && !event.button;
                   }
                   if (event.type === 'wheel') return event.ctrlKey || event.metaKey;
                   return true;
                })
                .on('zoom', (event) => {
                    setTransform(event.transform);
                });
            
            zoomBehaviorRef.current = zoom;
            
            const selection = d3.select(containerRef.current);
            selection.call(zoom)
                     .on("dblclick.zoom", null);
            
            selection.on("wheel.customPan", (event: any) => {
                if (event.ctrlKey || event.metaKey) return;
                event.preventDefault();
                const currentTransform = d3.zoomTransform(containerRef.current!);
                const newX = currentTransform.x - event.deltaX;
                const newY = currentTransform.y - event.deltaY;
                const newTransform = d3.zoomIdentity.translate(newX, newY).scale(currentTransform.k);
                zoom.transform(selection, newTransform);
            });
    
            // Initial Center (Offset to right for LTR)
            selection.call(zoom.transform, d3.zoomIdentity.translate(width - 400, height/2).scale(0.8));
        }
      }, []);

      const centerOnNode = useCallback((node: CanvasNode) => {
        if (!containerRef.current || !zoomBehaviorRef.current) return;

        const nodeEl = document.getElementById(`node-${node.visualId}`);
        if (!nodeEl) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const rect = nodeEl.getBoundingClientRect();
        const currentK = transform.k;

        const w = rect.width / currentK;

        // 선언된 위치(노드 상단)로 이동
        const definitionX = node.x + w / 2;  // 가로는 중앙
        const definitionY = node.y + 50;      // 세로는 상단 (정의 라인 위치)

        const targetX = width / 2 - definitionX * currentK;
        const targetY = height / 2 - definitionY * currentK;

        const newTransform = d3.zoomIdentity.translate(targetX, targetY).scale(currentK);
        d3.select(containerRef.current)
            .transition()
            .duration(600)
            .ease(d3.easeCubicOut)
            .call(zoomBehaviorRef.current.transform, newTransform);
      }, [transform.k]);

      // --- Auto-center when node expanded ---
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
      }, [lastExpandedId, layoutNodes, centerOnNode, setLastExpandedId]);

      // --- Sync transform to atom ---
      useEffect(() => {
        setTransformAtom(transform);
      }, [transform, setTransformAtom]);

      return { transform, centerOnNode };
};