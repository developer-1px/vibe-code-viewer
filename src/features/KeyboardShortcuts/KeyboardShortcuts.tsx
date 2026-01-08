/**
 * 키보드 단축키 관리 컴포넌트
 * - 전역 키보드 이벤트를 한 곳에서 관리
 * - 렌더링 없는 로직 전용 컴포넌트
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { isSidebarOpenAtom } from '@/app/ui/AppSidebar/model/atoms';
import { viewModeAtom } from '@/entities/AppView/model/atoms';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import { searchModalOpenAtom } from '@/features/Search/UnifiedSearch/model/atoms';
import { activeTabIdAtom, openedTabsAtom } from '@/widgets/MainContents/model/atoms';

const GLOBAL_HOTKEYS = {
  TOGGLE_SIDEBAR: 'mod+\\',
  TOGGLE_VIEW_MODE: 'backquote',
  CLOSE_FILE: 'mod+w',
  CLOSE_FILE_ESC: 'escape',
  CONTENT_SEARCH: 'mod+shift+f',
  NEW_SEARCH_TAB: 'mod+shift+tab',
} as const;

export const KeyboardShortcuts = () => {
  const setIsSidebarOpen = useSetAtom(isSidebarOpenAtom);
  const setSearchModalOpen = useSetAtom(searchModalOpenAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const { closeFile } = useOpenFile();
  const [openedTabs, setOpenedTabs] = useAtom(openedTabsAtom);
  const setActiveTabId = useSetAtom(activeTabIdAtom);

  // Global hotkeys (no ref needed - always active)
  useHotkeys(
    Object.values(GLOBAL_HOTKEYS),
    (e, { hotkey }) => {
      console.log('[KeyboardShortcuts] Hotkey pressed:', hotkey);
      e.preventDefault();

      switch (hotkey) {
        case GLOBAL_HOTKEYS.TOGGLE_SIDEBAR:
          setIsSidebarOpen((prev) => !prev);
          break;
        case GLOBAL_HOTKEYS.TOGGLE_VIEW_MODE:
          // IDE ↔ CodeDoc 모드 전환 (Canvas 모드는 제외)
          setViewMode((prev) => (prev === 'ide' ? 'codeDoc' : 'ide'));
          console.log('[KeyboardShortcuts] View mode toggled:', viewMode === 'ide' ? 'codeDoc' : 'ide');
          break;
        case GLOBAL_HOTKEYS.CLOSE_FILE:
        case GLOBAL_HOTKEYS.CLOSE_FILE_ESC:
          closeFile();
          console.log('[KeyboardShortcuts] Close current file');
          break;
        case GLOBAL_HOTKEYS.CONTENT_SEARCH:
          setViewMode('contentSearch');
          console.log('[KeyboardShortcuts] Content search view opened');
          break;
        case GLOBAL_HOTKEYS.NEW_SEARCH_TAB: {
          // 새 Search 탭 열기
          const existingSearchTab = openedTabs.find((tab) => tab.type === 'search');

          if (existingSearchTab) {
            // 이미 Search 탭이 있으면 그 탭으로 전환
            setActiveTabId(existingSearchTab.id);
          } else {
            // 없으면 새로 생성
            const newSearchTab = {
              id: `search-${Date.now()}`,
              type: 'search' as const,
              label: 'Search',
            };
            setOpenedTabs([...openedTabs, newSearchTab]);
            setActiveTabId(newSearchTab.id);
          }

          // viewMode를 TabContainer가 표시되도록 설정
          if (viewMode !== 'ide' && viewMode !== 'contentSearch') {
            setViewMode('contentSearch');
          }

          console.log('[KeyboardShortcuts] New search tab opened');
          break;
        }
      }
    },
    { enableOnFormTags: true },
    [setIsSidebarOpen, setViewMode, viewMode, closeFile, openedTabs, setOpenedTabs, setActiveTabId]
  );

  // Shift+Shift (더블탭) - 검색 모달 열기
  const lastShiftPressRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        const now = Date.now();
        const timeSinceLastPress = now - lastShiftPressRef.current;

        // 더블탭 감지
        if (timeSinceLastPress < 300) {
          e.preventDefault();
          setSearchModalOpen(true);
          lastShiftPressRef.current = 0; // 리셋
        } else {
          lastShiftPressRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchModalOpen]);

  // 렌더링 없음
  return null;
};
