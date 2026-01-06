/**
 * Tab Navigation Hook
 * Provides functions to navigate between opened tabs
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { activeTabAtom, openedTabsAtom } from '@/features/File/OpenFiles/model/atoms';

export function useTabNavigation() {
  const openedTabs = useAtomValue(openedTabsAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const setActiveTab = useSetAtom(activeTabAtom);

  const goToPreviousTab = () => {
    if (openedTabs.length === 0) return;

    const currentActiveIndex = activeTab ? openedTabs.indexOf(activeTab) : -1;

    if (currentActiveIndex === -1) {
      // No active tab, activate first
      setActiveTab(openedTabs[0]);
      return;
    }

    // Go to previous tab (wrap around to last if at first)
    const previousIndex = currentActiveIndex === 0 ? openedTabs.length - 1 : currentActiveIndex - 1;

    setActiveTab(openedTabs[previousIndex]);
  };

  const goToNextTab = () => {
    if (openedTabs.length === 0) return;

    const currentActiveIndex = activeTab ? openedTabs.indexOf(activeTab) : -1;

    if (currentActiveIndex === -1) {
      // No active tab, activate first
      setActiveTab(openedTabs[0]);
      return;
    }

    // Go to next tab (wrap around to first if at last)
    const nextIndex = currentActiveIndex === openedTabs.length - 1 ? 0 : currentActiveIndex + 1;

    setActiveTab(openedTabs[nextIndex]);
  };

  return {
    goToPreviousTab,
    goToNextTab,
  };
}
