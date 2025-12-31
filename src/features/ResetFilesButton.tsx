import React from 'react';
import { useSetAtom } from 'jotai';
import { Eraser as IconEraser } from 'lucide-react';
import { filesAtom, activeFileAtom } from '../store/atoms';
import { DEFAULT_FILES, DEFAULT_ENTRY_FILE } from '../constants';

const ResetFilesButton: React.FC = () => {
  const setFiles = useSetAtom(filesAtom);
  const setActiveFile = useSetAtom(activeFileAtom);

  const handleReset = () => {
    if (window.confirm("Reset all files to default?")) {
      setFiles(DEFAULT_FILES);
      setActiveFile(DEFAULT_ENTRY_FILE);
    }
  };

  return (
    <button
      onClick={handleReset}
      className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
      title="Reset to sample code"
    >
      <IconEraser className="w-3 h-3" />
      Reset
    </button>
  );
};

export default ResetFilesButton;
