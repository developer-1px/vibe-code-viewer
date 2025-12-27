import React, { useRef } from 'react';
import { useAtomValue } from 'jotai';
import CodeCard from '../entities/VariableNode/ui/CodeCard.tsx';

// Hooks & Sub-components
import { useCanvasLayout } from './PipelineCanvas/useCanvasLayout.ts';
import D3ZoomContainer from './PipelineCanvas/D3ZoomContainer.tsx';
import CanvasConnections from './PipelineCanvas/CanvasConnections.tsx';
import CanvasBackground from './PipelineCanvas/CanvasBackground.tsx';
import CopyAllCodeButton from '../features/CopyAllCodeButton.tsx';
import ResetViewButton from '../features/ResetViewButton.tsx';

// Atoms & Hooks
import { visibleNodeIdsAtom, entryFileAtom } from '../store/atoms';
import { useGraphData } from '../hooks/useGraphData';

const PipelineCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Read atoms
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const { data: graphData } = useGraphData();

  // 1. Layout Logic (handles atom sync & initialization internally)
  const { layoutNodes } = useCanvasLayout(graphData, entryFile, visibleNodeIds);

  return (
    <div className="w-full h-full relative overflow-hidden bg-vibe-dark select-none" ref={containerRef}>

      {/* Controls */}
      <ResetViewButton />

      {/* Copy All Code Button - Bottom Right */}
      <CopyAllCodeButton />

      <D3ZoomContainer containerRef={containerRef}>
        {/* Background Groups */}
        {/*<CanvasBackground />*/}

        {/* Connections */}
        <CanvasConnections />

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
      </D3ZoomContainer>
    </div>
  );
};

export default PipelineCanvas;