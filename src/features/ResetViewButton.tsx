import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { RotateCcw as IconRotateCcw } from 'lucide-react';
import {
  visibleNodeIdsAtom,
  openedFilesAtom
} from '../store/atoms.ts';

const ResetViewButton: React.FC = () => {
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const setOpenedFiles = useSetAtom(openedFilesAtom);

  const handleReset = () => {
    // Clear all opened files and visible nodes
    setVisibleNodeIds(new Set());
    setOpenedFiles(new Set());
  };

  if (visibleNodeIds.size <= 1) return null;

  return (
    <div className="absolute top-4 right-4 z-40 flex gap-2">
      <button
        onClick={handleReset}
        className="bg-vibe-panel/90 backdrop-blur px-4 py-2 rounded-lg border border-vibe-border text-slate-200 hover:text-white hover:border-vibe-accent flex items-center gap-2 text-sm shadow-xl transition-all font-medium"
      >
        <IconRotateCcw className="w-4 h-4 text-pink-500" />
        Reset View
      </button>
    </div>
  );
};

export default ResetViewButton;
