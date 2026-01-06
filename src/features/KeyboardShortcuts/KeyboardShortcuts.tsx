/**
 * 키보드 단축키 관리 컴포넌트
 * - 전역 키보드 이벤트를 한 곳에서 관리
 * - 렌더링 없는 로직 전용 컴포넌트
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import { searchModalOpenAtom } from '@/features/Search/UnifiedSearch/model/atoms';
import { viewModeAtom } from '../../app/model/atoms';
import { isSidebarOpenAtom } from '../../widgets/AppSidebar/model/atoms';

const GLOBAL_HOTKEYS = {
  TOGGLE_SIDEBAR: 'mod+\\',
  TOGGLE_VIEW_MODE: 'backquote',
  CLOSE_FILE: 'mod+w',
  CLOSE_FILE_ESC: 'escape',
} as const;

export const KeyboardShortcuts = () => {
  const setIsSidebarOpen = useSetAtom(isSidebarOpenAtom);
  const setSearchModalOpen = useSetAtom(searchModalOpenAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const { closeFile } = useOpenFile();

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
      }
    },
    { enableOnFormTags: true },
    [setIsSidebarOpen, setViewMode, viewMode, closeFile]
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
