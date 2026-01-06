import { useAtomValue, useSetAtom } from 'jotai';
import { RotateCcw as IconRotateCcw } from 'lucide-react';
import type React from 'react';
import { openedFilesAtom, visibleNodeIdsAtom } from '@/widgets/MainContents/PipelineCanvas/model/atoms';

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
        type="button"
        onClick={handleReset}
        className="bg-theme-panel/90 backdrop-blur px-4 py-2 rounded-lg border border-theme-border text-theme-text-primary hover:text-theme-text-accent hover:border-theme-text-accent flex items-center gap-2 text-sm shadow-xl transition-all font-medium"
      >
        <IconRotateCcw className="w-4 h-4 text-pink-500" />
        Reset View
      </button>
    </div>
  );
};

export default ResetViewButton;
