import { useEffect, useRef, useState, RefObject } from 'react';
import { useSetAtom } from 'jotai';
import * as d3 from 'd3';
import { transformAtom } from '../../store/atoms';

export const useD3Zoom = (containerRef: RefObject<HTMLDivElement>) => {
    const [transform, setTransform] = useState({ k: 0.9, x: 0, y: 0 });
    const setTransformAtom = useSetAtom(transformAtom);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            
            const zoom = d3.zoom<HTMLDivElement, unknown>()
                .scaleExtent([0.1, 2])
                .filter((event: any) => {
                   // Ignore events from cards (they handle their own dragging)
                   const target = event.target as HTMLElement;
                   const isCard = target.closest('.canvas-code-card');
                   if (isCard && (event.type === 'mousedown' || event.type === 'touchstart')) {
                     return false;
                   }

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
    
            // Initial Center
            selection.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));
        }
      }, []);

      // --- Sync transform to atom ---
      useEffect(() => {
        setTransformAtom(transform);
      }, [transform, setTransformAtom]);

      return { transform };
};