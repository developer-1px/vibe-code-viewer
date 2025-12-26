import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { RotateCcw } from 'lucide-react';
import {
  visibleNodeIdsAtom,
  lastExpandedIdAtom,
  templateRootIdAtom,
  fullNodeMapAtom,
  entryFileAtom
} from '../store/atoms.ts';

const ResetViewButton: React.FC = () => {
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const entryFile = useAtomValue(entryFileAtom);

  const handleReset = () => {
    const initialSet = new Set<string>();
    if (templateRootId) initialSet.add(templateRootId);
    fullNodeMap.forEach(n => {
      if (n.type === 'call' && n.filePath === entryFile) initialSet.add(n.id);
    });
    setVisibleNodeIds(initialSet);
    if (templateRootId) setLastExpandedId(templateRootId);
  };

  if (visibleNodeIds.size <= 1) return null;

  return (
    <div className="absolute top-4 right-4 z-40 flex gap-2">
      <button
        onClick={handleReset}
        className="bg-vibe-panel/90 backdrop-blur px-4 py-2 rounded-lg border border-vibe-border text-slate-200 hover:text-white hover:border-vibe-accent flex items-center gap-2 text-sm shadow-xl transition-all font-medium"
      >
        <RotateCcw className="w-4 h-4 text-pink-500" />
        Reset View
      </button>
    </div>
  );
};

export default ResetViewButton;
