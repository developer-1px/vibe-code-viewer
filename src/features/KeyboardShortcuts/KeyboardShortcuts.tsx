/**
 * 키보드 단축키 관리 컴포넌트
 * - 전역 키보드 이벤트를 한 곳에서 관리
 * - 렌더링 없는 로직 전용 컴포넌트
 */

import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useSetAtom } from 'jotai';
import { isSidebarOpenAtom, searchModalOpenAtom } from '../../store/atoms';

export const KeyboardShortcuts = () => {
  const setIsSidebarOpen = useSetAtom(isSidebarOpenAtom);
  const setSearchModalOpen = useSetAtom(searchModalOpenAtom);

  // Cmd+\ (또는 Ctrl+\) - 사이드바 토글
  useHotkeys('mod+\\', (e) => {
    e.preventDefault();
    setIsSidebarOpen(prev => !prev);
  }, { enableOnFormTags: true });

  // Shift+Shift (더블탭) - 검색 모달 열기
  const lastShiftPressRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        const now = Date.now();
        const timeSinceLastPress = now - lastShiftPressRef.current;

        if (timeSinceLastPress < 300) {
          // 더블탭 감지
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
