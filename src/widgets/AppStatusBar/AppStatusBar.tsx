/**
 * App Status Bar Widget
 * Bottom status bar with git info, cursor position, and AI status
 */

import React from 'react';
import { StatusBar } from '@/components/ide/StatusBar';

export function AppStatusBar() {
  // TODO: Replace with actual data from atoms
  // For now, using static values - to be connected to real state later
  const branch = 'main';
  const ahead = 0;
  const behind = 0;
  const line = 1;
  const column = 1;
  const aiActive = false;

  return (
    <StatusBar
      branch={branch}
      ahead={ahead}
      behind={behind}
      line={line}
      column={column}
      aiActive={aiActive}
    />
  );
}
