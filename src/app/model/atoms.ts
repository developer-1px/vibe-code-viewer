/**
 * App - Global Application State Atoms
 * 앱 전체에서 사용되는 글로벌 상태 atoms
 */
import { atom } from 'jotai';
import { DEFAULT_FILES } from '../../constants';
import type { GraphData, SourceFileNode } from '../../entities/SourceFileNode/model/types';

// ============================================================================
// File Management Atoms
// ============================================================================

// 가상 파일 시스템 (Virtual file system)
export const filesAtom = atom<Record<string, string>>(DEFAULT_FILES);

// Folder Focus Mode - 특정 폴더를 Root로 하는 격리 뷰
// null: 전체 파일 트리 표시
// "src/features": 해당 폴더만 Root로 표시
export const focusedFolderAtom = atom<string | null>(null);

// ============================================================================
// Graph Data Atoms (Parsed Project Data)
// ============================================================================

// 파싱된 프로젝트 데이터 (Parsed project data)
export const graphDataAtom = atom(null as GraphData | null);

// 파싱 에러 (Parse errors)
export const parseErrorAtom = atom(null as string | null);

// 파싱 진행 상태 (Parsing progress) - for Web Worker
export const parseProgressAtom = atom<{
  isLoading: boolean;
  current: number;
  total: number;
  aom;
  currentFile: string | null;
}>({
  isLoading: false,
  current: 0,
  total: 0,
  currentFile: null,
});

// Full node map - derived from graphDataAtom (auto-computed)
export const fullNodeMapAtom = atom((get) => {
  const graphData = get(graphDataAtom);
  if (!graphData) return new Map<string, SourceFileNode>();
  return new Map<string, SourceFileNode>(graphData.nodes.map((n) => [n.id, n]));
});

// ============================================================================
// View Mode Atoms
// ============================================================================

// 뷰 모드 - Canvas vs IDE vs CodeDoc view
export type ViewMode = 'canvas' | 'ide' | 'codeDoc';
export const viewModeAtom = atom<ViewMode>('ide'); // Default to IDE mode

// 문서 모드 - Dark vs Light (for CodeDocView)
export type DocumentMode = 'dark' | 'light';
export const documentModeAtom = atom<DocumentMode>('light'); // Default to light mode (GitBook-style)

// ============================================================================
// Focus Management
// ============================================================================

// 글로벌 포커스 관리 (Global focus management)
export type FocusedPane = 'sidebar' | 'canvas' | 'search' | null;
export const focusedPaneAtom = atom<FocusedPane>('sidebar'); // Default to sidebar when it's open

// ============================================================================
// Code Highlight Atoms
// ============================================================================

// Hover된 identifier 추적 (identifier hover highlight)
export const hoveredIdentifierAtom = atom<string | null>(null);

// ============================================================================
// Right Panel Atoms
// ============================================================================

// 우측 패널 표시 여부 (기본값: true - 미리 열어둠)
export const rightPanelOpenAtom = atom<boolean>(true);

// 우측 패널 타입 ('definition' | 'related')
export const rightPanelTypeAtom = atom<'definition' | 'related'>('related');
