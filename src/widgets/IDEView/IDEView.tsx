/**
 * IDEView - IDE-style full-screen code viewer
 * Shows a single file with vertical scrolling, triggered by double-clicking CodeCardHeader
 */

import React, { useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';
import { ArrowLeft, FileText } from 'lucide-react';
import { focusedNodeIdAtom, viewModeAtom, fullNodeMapAtom, filesAtom } from '../../store/atoms';
import { renderCodeLinesDirect } from '../CodeViewer/core/renderer/renderCodeLinesDirect';
import { renderVueFile } from '../CodeViewer/core/renderer/renderVueFile';
import CodeViewer from '../CodeViewer/CodeViewer';

const IDEView = () => {
  const focusedNodeId = useAtomValue(focusedNodeIdAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const files = useAtomValue(filesAtom);
  const setViewMode = useSetAtom(viewModeAtom);

  const focusedNode = focusedNodeId ? fullNodeMap.get(focusedNodeId) : null;

  // Go back to canvas view
  const handleBackToCanvas = () => {
    setViewMode('canvas');
  };

  // ESC key to go back to canvas
  useHotkeys('esc', handleBackToCanvas, { enableOnFormTags: true });

  // Process code lines
  const processedLines = useMemo(() => {
    if (!focusedNode) return [];

    if (focusedNode.filePath.endsWith('.vue')) {
      return renderVueFile(focusedNode, files);
    }
    return renderCodeLinesDirect(focusedNode, files);
  }, [focusedNode, files]);

  if (!focusedNode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-vibe-panel text-slate-400">
        <p>No node selected</p>
      </div>
    );
  }

  // Get file name from path
  const fileName = focusedNode.filePath?.split('/').pop() || focusedNode.label;

  return (
    <div className="flex-1 h-full flex flex-col bg-vibe-panel overflow-hidden">
      {/* Header with back button */}
      <div className="flex-none border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <button
            onClick={handleBackToCanvas}
            className="p-1 rounded transition-colors text-slate-400 hover:bg-white/10 hover:text-slate-200"
            title="캔버스 뷰로 돌아가기 (ESC)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <FileText className="w-3.5 h-3.5 text-slate-400" />

          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-xs text-slate-100">{fileName}</span>
            <span className="text-[9px] text-slate-500 font-mono">{focusedNode.filePath}</span>
          </div>

          <span className="ml-auto text-[8px] uppercase tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            IDE
          </span>
        </div>
      </div>

      {/* Scrollable code content */}
      <div className="flex-1 overflow-y-auto">
        <CodeViewer
          processedLines={processedLines}
          node={focusedNode}
        />
      </div>
    </div>
  );
};

export default IDEView;
