import React, { useRef } from 'react';
import { useAtomValue } from 'jotai';
import CodeCard from '../entities/VariableNode/ui/CodeCard.tsx';

// Hooks & Sub-components
import { useCanvasLayout } from './PipelineCanvas/useCanvasLayout.ts';
import { useD3Zoom } from './PipelineCanvas/useD3Zoom.ts';
import CanvasConnections from './PipelineCanvas/CanvasConnections.tsx';
import CanvasBackground from './PipelineCanvas/CanvasBackground.tsx';
import CopyAllCodeButton from '../features/CopyAllCodeButton.tsx';
import ResetViewButton from '../features/ResetViewButton.tsx';

// Atoms
import { visibleNodeIdsAtom, graphDataAtom, entryFileAtom } from '../store/atoms';

const PipelineCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Read atoms
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const graphData = useAtomValue(graphDataAtom);
  const entryFile = useAtomValue(entryFileAtom);

  // 1. Layout Logic (handles atom sync & initialization internally)
  const {
    layoutNodes,
    layoutLinks,
    componentGroups
  } = useCanvasLayout(graphData, entryFile, visibleNodeIds);

  // 2. Zoom Logic (handles auto-centering internally)
  const { transform } = useD3Zoom(containerRef);


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
                <CodeCard node={node} />
            </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineCanvas;