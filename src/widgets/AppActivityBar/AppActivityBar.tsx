/**
 * App Activity Bar Widget
 * Main navigation bar for the application
 */

import React, { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Files, SearchAlertIcon, Search, GitBranch, Sparkles, Settings, Trash2Icon, LucideMap, BookOpenText } from 'lucide-react';
import { ActivityBar, ActivityBarItem } from '@/components/ide/ActivityBar';
import { viewModeAtom } from '../../app/model/atoms';
import { deadCodePanelOpenAtom } from '../DeadCodePanel/model/atoms';
import { DocumentModeToggle } from '@/features/DocumentMode/DocumentModeToggle';

export function AppActivityBar() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const setDeadCodePanelOpen = useSetAtom(deadCodePanelOpenAtom);

  // Active view for ActivityBar (0: Explorer, 1: Search, 2: Dead Code, 3: Canvas, 4: AI)
  const [activeView, setActiveView] = useState(0);

  return (
    <ActivityBar>
      <ActivityBarItem
        icon={Files}
        label="Explorer"
        active={activeView === 0 && viewMode === 'ide'}
        onClick={() => {
          setActiveView(0);
          setViewMode('ide');
          setDeadCodePanelOpen(false);  // ✅ Dead Code Panel 닫기
        }}
      />
      <ActivityBarItem
        icon={BookOpenText}
        label="Code Doc"
        active={viewMode === 'codeDoc'}
        onClick={() => {
          setViewMode('codeDoc');
          setDeadCodePanelOpen(false);
        }}
      />
      <ActivityBarItem
        icon={LucideMap}
        label="Canvas View"
        active={viewMode === 'canvas'}
        onClick={() => {
          setViewMode('canvas');
        }}
      />
      <ActivityBarItem
        icon={SearchAlertIcon}
        label="Dead Code"
        active={activeView === 2}
        onClick={() => {
          setActiveView(2);
          setDeadCodePanelOpen(true);
          setViewMode('ide');
        }}
      />
      <ActivityBarItem
        icon={Sparkles}
        label="AI Assistant"
        active={activeView === 3}
        onClick={() => setActiveView(3)}
      />
      <ActivityBarItem
        icon={GitBranch}
        label="Git"
      />
      <div className="flex-1" />
      <div className="px-1">
        <DocumentModeToggle />
      </div>
      <ActivityBarItem icon={Settings} label="Settings" onClick={() => {}} />
    </ActivityBar>
  );
}
