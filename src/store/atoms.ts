
import { atom } from 'jotai';
import type { SourceFileNode, GraphData } from '../entities/SourceFileNode/model/types';
import type { CanvasNode } from '../entities/CanvasNode/model/types';
import { DEFAULT_FILES, DEFAULT_ENTRY_FILE } from '../constants';

// File management atoms
export const filesAtom = atom<Record<string, string>>(DEFAULT_FILES);
export const activeFileAtom = atom<string>(''); // Active file in editor
export const isSidebarOpenAtom = atom<boolean>(true);

// Graph data atom (parsed project data)
export const graphDataAtom = atom(null as GraphData | null);
export const parseErrorAtom = atom(null as string | null);

// Canvas layout atoms (write-only from PipelineCanvas)
export const layoutNodesAtom = atom([] as CanvasNode[]);
export const layoutLinksAtom = atom([] as {source: string, target: string}[]);

// Full node map - derived from graphDataAtom (auto-computed)
export const fullNodeMapAtom = atom((get) => {
  const graphData = get(graphDataAtom);
  if (!graphData) return new Map<string, SourceFileNode>();
  return new Map<string, SourceFileNode>(graphData.nodes.map(n => [n.id, n]));
});

// Canvas transform atom (from useD3Zoom)
export const transformAtom = atom({ k: 1, x: 0, y: 0 });

// Visibility and navigation atoms (read-write)
export const visibleNodeIdsAtom = atom(new Set<string>());
export const lastExpandedIdAtom = atom(null as string | null);

// Multiple opened files (for overlapping view)
export const openedFilesAtom = atom(new Set<string>());

// Go to Definition - target line to highlight and scroll to
export const targetLineAtom = atom(null as { nodeId: string; lineNum: number } | null);

// File Explorer atoms
export const fileSearchQueryAtom = atom('');
export const focusedFileIndexAtom = atom(0);
export const collapsedFoldersAtom = atom(new Set<string>()); // 접힌 폴더들

// Unified Search atoms (Shift+Shift)
import type { SearchResult } from '../features/UnifiedSearch/model/types';
import type { CodeSymbolMetadata } from '../entities/CodeSymbol/model/types';

// Re-export for external use
export type { SearchResult, CodeSymbolMetadata };

export const searchModalOpenAtom = atom(false);
export const searchQueryAtom = atom('');
export const searchResultsAtom = atom([] as SearchResult[]);
export const searchFocusedIndexAtom = atom(0);
export const symbolMetadataAtom = atom(new Map<string, CodeSymbolMetadata>());

// Code Fold atoms - Re-export from feature
export { foldedLinesAtom } from '../features/CodeFold/model/atoms';

// Card Position atoms - Map<nodeId, {x: number, y: number}>
export const cardPositionsAtom = atom(new Map<string, {x: number, y: number}>());

// Selected nodes for dragging (FigJam-style)
export const selectedNodeIdsAtom = atom(new Set<string>());

// Focus Mode - Re-export from feature
export { activeLocalVariablesAtom } from '../features/FocusMode/model/atoms';

// Global Focus Management
export type FocusedPane = 'sidebar' | 'canvas' | 'search' | null;
export const focusedPaneAtom = atom<FocusedPane>('sidebar'); // Default to sidebar when it's open

// Theme Settings
export type ThemeName = 'default' | 'jetbrains' | 'vscode';
export const currentThemeAtom = atom<ThemeName>('default');

// View Mode - Canvas vs IDE view
export type ViewMode = 'canvas' | 'ide';
export const viewModeAtom = atom<ViewMode>('ide'); // Default to IDE mode
export const focusedNodeIdAtom = atom<string | null>(null); // IDE 모드에서 보여줄 노드 ID

// IDE Tab Management
export const openedTabsAtom = atom<string[]>([]); // 열린 탭들 (파일 경로)
export const activeTabAtom = atom<string | null>(null); // 현재 활성 탭 (파일 경로)

// IDE Outline Panel
export const outlinePanelOpenAtom = atom(true); // Outline Panel 열림/닫힘 상태

