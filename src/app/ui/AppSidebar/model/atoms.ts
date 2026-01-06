/**
 * AppSidebar Widget - Atoms
 * 사이드바 표시 여부 상태
 */
import { atom } from 'jotai';

// 사이드바 열림/닫힘 상태 (Cmd/Ctrl + \ 토글)
export const isSidebarOpenAtom = atom<boolean>(true);
