/**
 * App Title Bar Widget
 * Top title bar with window controls and file name
 */

import { useAtom } from 'jotai';
import { ListTree } from 'lucide-react';
import { TitleBar } from '@/components/ide/TitleBar';
import { rightPanelOpenAtom } from '../../app/model/atoms';

export function AppTitleBar() {
  const [rightPanelOpen, setRightPanelOpen] = useAtom(rightPanelOpenAtom);

  // Get active file name for TitleBar
  const activeFileName = 'vibe-coding-ide';

  return (
    <TitleBar filename={activeFileName} projectName="teo.v">
      <button
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
          rightPanelOpen
            ? 'bg-accent-DEFAULT/10 text-accent-DEFAULT'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-deep/50'
        }`}
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        title="Toggle Definitions Panel"
      >
        <ListTree size={14} />
        <span>Definitions</span>
      </button>
    </TitleBar>
  );
}
