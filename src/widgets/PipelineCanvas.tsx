import React, { useRef, useMemo, useEffect } from 'react';
import { useAtomValue, useSetAtom, useAtom } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';

// Hooks & Sub-components
import { useCanvasLayout } from './PipelineCanvas/useCanvasLayout.ts';
import D3ZoomContainer from './PipelineCanvas/D3ZoomContainer.tsx';
import CanvasConnections from './PipelineCanvas/CanvasConnections.tsx';
import CanvasBackground from './PipelineCanvas/CanvasBackground.tsx';
import { CanvasCodeCard } from './PipelineCanvas/CanvasCodeCard.tsx';
import CopyAllCodeButton from '../features/CopyAllCodeButton.tsx';
import ResetViewButton from '../features/ResetViewButton.tsx';

// Atoms & Hooks
import { visibleNodeIdsAtom, selectedNodeIdsAtom, openedFilesAtom, fullNodeMapAtom, symbolMetadataAtom, filesAtom, focusedPaneAtom, graphDataAtom } from '../store/atoms';
import { extractSymbolMetadata } from '@/shared/symbolMetadataExtractor';

const PipelineCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Read atoms
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const [openedFiles, setOpenedFiles] = useAtom(openedFilesAtom);
  const graphData = useAtomValue(graphDataAtom);
  const [selectedNodeIds, setSelectedNodeIds] = useAtom(selectedNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const files = useAtomValue(filesAtom);
  const setSymbolMetadata = useSetAtom(symbolMetadataAtom);
  const [focusedPane, setFocusedPane] = useAtom(focusedPaneAtom);

  // Extract symbol metadata after parsing completes
  useEffect(() => {
    if (fullNodeMap.size > 0 && files && Object.keys(files).length > 0) {
      const metadata = extractSymbolMetadata(fullNodeMap, files);
      setSymbolMetadata(metadata);
    }
  }, [fullNodeMap, files, setSymbolMetadata]);

  // Sync openedFiles with visibleNodeIds - auto-add files when nodes are opened
  useEffect(() => {
    if (!fullNodeMap || fullNodeMap.size === 0) return;

    const filePaths = new Set<string>();
    visibleNodeIds.forEach(nodeId => {
      const node = fullNodeMap.get(nodeId);
      if (node) {
        filePaths.add(node.filePath);
      }
    });

    // Add missing files to openedFiles
    let needsUpdate = false;
    filePaths.forEach(filePath => {
      if (!openedFiles.has(filePath)) {
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      setOpenedFiles(prev => new Set([...prev, ...filePaths]));
    }
  }, [visibleNodeIds, fullNodeMap, openedFiles, setOpenedFiles]);

  // Expand visibleNodeIds to include file nodes from opened files
  // (but not individual function/variable nodes)
  const expandedVisibleNodeIds = useMemo(() => {
    if (openedFiles.size === 0) return visibleNodeIds;

    const expanded = new Set(visibleNodeIds);

    // Add file nodes from opened files (check fullNodeMap for all files including orphaned)
    openedFiles.forEach(filePath => {
      // Check if file exists in fullNodeMap (for connected files)
      const fileNode = fullNodeMap.get(filePath);
      if (fileNode) {
        expanded.add(filePath);
      } else {
        // For orphaned files not in fullNodeMap, still add the filePath as ID
        // (they will be rendered directly from filesAtom)
        expanded.add(filePath);
      }
    });

    return expanded;
  }, [openedFiles, visibleNodeIds, fullNodeMap]);

  // 1. Layout Logic (simple display of visible nodes)
  const { layoutNodes } = useCanvasLayout(graphData, expandedVisibleNodeIds);

  // Clear selection when clicking on canvas background
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Set focus to canvas
    setFocusedPane('canvas');

    // Only clear if clicking directly on canvas, not on children (cards)
    if (e.target === e.currentTarget) {
      setSelectedNodeIds(new Set());
    }
  };

  // Delete/Backspace key handler - close selected files
  useHotkeys('delete, backspace', (e) => {
    console.log('[PipelineCanvas] Delete/Backspace pressed, focusedPane:', focusedPane, 'selectedNodeIds:', selectedNodeIds.size);

    if (selectedNodeIds.size === 0) return;

    // Prevent default backspace navigation
    e.preventDefault();

    // Extract file paths from selected node IDs
    const filesToClose = new Set<string>();
    selectedNodeIds.forEach(nodeId => {
      // Check if nodeId is a file path (orphaned file)
      if (files[nodeId]) {
        filesToClose.add(nodeId);
      } else {
        // Check if nodeId exists in fullNodeMap
        const node = fullNodeMap.get(nodeId);
        if (node) {
          filesToClose.add(node.filePath);
        }
      }
    });

    console.log('[PipelineCanvas] Files to close:', Array.from(filesToClose));

    // Remove files from openedFiles
    if (filesToClose.size > 0) {
      setOpenedFiles(prev => {
        const next = new Set(prev);
        filesToClose.forEach(filePath => next.delete(filePath));
        return next;
      });

      // Clear selection
      setSelectedNodeIds(new Set());
    }
  }, {
    scopes: ['canvas'],
    enabled: focusedPane === 'canvas'
  });

  return (
    <div
      className="w-full h-full relative overflow-hidden bg-vibe-dark select-none"
      ref={containerRef}
      onClick={handleCanvasClick}
    >

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
          <CanvasCodeCard key={node.visualId} node={node} />
        ))}
      </D3ZoomContainer>
    </div>
  );
};

export default PipelineCanvas;