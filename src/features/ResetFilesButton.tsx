import { useSetAtom } from 'jotai';
import { Eraser as IconEraser } from 'lucide-react';
import type React from 'react';
import { activeTabAtom, openedTabsAtom } from '@/features/File/OpenFiles/model/atoms';
import { filesAtom } from '../app/model/atoms';
import { DEFAULT_ENTRY_FILE, DEFAULT_FILES } from '../constants';

const ResetFilesButton: React.FC = () => {
  const setFiles = useSetAtom(filesAtom);
  const setOpenedTabs = useSetAtom(openedTabsAtom);
  const setActiveTab = useSetAtom(activeTabAtom);

  const handleReset = () => {
    if (window.confirm('Reset all files to default?')) {
      setFiles(DEFAULT_FILES);
      setOpenedTabs([DEFAULT_ENTRY_FILE]);
      setActiveTab(DEFAULT_ENTRY_FILE);
    }
  };

  return (
    <button
      onClick={handleReset}
      className="text-xs flex items-center gap-1.5 text-theme-text-secondary hover:text-theme-text-primary px-2 py-1 rounded hover:bg-theme-hover transition-colors"
      title="Reset to sample code"
    >
      <IconEraser className="w-3 h-3" />
      Reset
    </button>
  );
};

export default ResetFilesButton;
