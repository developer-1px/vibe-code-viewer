/**
 * App Title Bar Widget
 * Top title bar with window controls and file name
 */

import { useAtom } from 'jotai';
import { FolderOpen, X } from 'lucide-react';
import { TitleBar } from '@/components/ide/TitleBar.tsx';
import { rightPanelOpenAtom, rightPanelTypeAtom } from '@/entities/AppView/model/atoms';

export function AppTitleBar() {
  const [rightPanelOpen, setRightPanelOpen] = useAtom(rightPanelOpenAtom);
  const [rightPanelType, setRightPanelType] = useAtom(rightPanelTypeAtom);

  // Get active file name for TitleBar
  const activeFileName = 'vibe-coding-ide';

  return (
    <TitleBar filename={activeFileName} projectName="teo.v">
      {/* Right Panel Tabs */}
      <div className="flex items-center gap-0.5 border border-border-DEFAULT rounded overflow-hidden">
        {/* Workspace Tab */}
        <button
          type="button"
          className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-colors ${
            rightPanelOpen && rightPanelType === 'workspace'
              ? 'bg-warm-300/15 text-warm-300'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-deep/50'
          }`}
          onClick={() => {
            setRightPanelType('workspace');
            if (!rightPanelOpen) setRightPanelOpen(true);
          }}
          title="Workspace Panel"
        >
          <FolderOpen size={14} />
          <span>Workspace</span>
        </button>

        {/* Close Button */}
        {rightPanelOpen && (
          <button
            type="button"
            className="flex items-center justify-center px-1.5 py-1 text-xs border-l border-border-DEFAULT text-text-tertiary hover:text-text-primary hover:bg-bg-deep/50 transition-colors"
            onClick={() => setRightPanelOpen(false)}
            title="Close Panel"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </TitleBar>
  );
}
