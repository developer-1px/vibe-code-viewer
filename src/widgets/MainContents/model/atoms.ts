/**
 * MainContents Tab State
 * Dynamic tab system for main content area
 */

import { atom } from 'jotai';

export type TabType = 'ide' | 'search';

export interface ContentTab {
  id: string;
  type: TabType;
  label: string;
}

// Opened tabs (array of tabs)
export const openedTabsAtom = atom<ContentTab[]>([{ id: 'ide-default', type: 'ide', label: 'IDE' }]);

// Active tab ID
export const activeTabIdAtom = atom<string>('ide-default');
