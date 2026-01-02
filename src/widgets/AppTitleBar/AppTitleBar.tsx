/**
 * App Title Bar Widget
 * Top title bar with window controls and file name
 */

import React from 'react';
import { useAtomValue } from 'jotai';
import { TitleBar } from '@/components/ide/TitleBar';
import { activeTabAtom } from '../../store/atoms';

export function AppTitleBar() {
  const activeTab = useAtomValue(activeTabAtom);

  // Get active file name for TitleBar
  const activeFileName = activeTab || 'vibe-code-viewer';

  return <TitleBar filename={activeFileName} projectName="vibe-code-viewer" />;
}
