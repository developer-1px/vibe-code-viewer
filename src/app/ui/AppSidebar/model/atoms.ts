/**
 * AppSidebar Widget - Atoms
 * 사이드바 표시 여부 및 파일 트리 모드 상태
 */
import { atom } from 'jotai';

// 사이드바 열림/닫힘 상태 (Cmd/Ctrl + \ 토글)
export const isSidebarOpenAtom = atom<boolean>(true);

// 파일 트리 모드: 'all' | 'related'
// all: 모든 파일 표시
// related: 활성 파일과 관련된 파일만 표시 (dependencies + dependents)
export const fileTreeModeAtom = atom<'all' | 'related'>('all');
