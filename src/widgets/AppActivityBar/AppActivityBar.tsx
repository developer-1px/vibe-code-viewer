/**
 * App Activity Bar Widget
 * Main navigation bar for the application
 */

import React, { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Files, Search, GitBranch, Sparkles, Settings } from 'lucide-react';
import { ActivityBar, ActivityBarItem } from '@/components/ide/ActivityBar';
import { viewModeAtom, searchModalOpenAtom } from '../../store/atoms';

export function AppActivityBar() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const setSearchModalOpen = useSetAtom(searchModalOpenAtom);

  // Active view for ActivityBar (0: Explorer, 1: Search, 2: Canvas, 3: AI)
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
        }}
      />
      <ActivityBarItem
        icon={Search}
        label="Search"
        active={activeView === 1}
        onClick={() => {
          setActiveView(1);
          setSearchModalOpen(true);
        }}
      />
      <ActivityBarItem
        icon={GitBranch}
        label="Canvas View"
        active={viewMode === 'canvas'}
        onClick={() => {
          setViewMode('canvas');
        }}
      />
      <ActivityBarItem
        icon={Sparkles}
        label="AI Assistant"
        active={activeView === 3}
        onClick={() => setActiveView(3)}
      />
      <div className="flex-1" />
      <ActivityBarItem icon={Settings} label="Settings" onClick={() => {}} />
    </ActivityBar>
  );
}
