
import { atom } from 'jotai';
import type { VariableNode, GraphData } from '../entities/SourceFileNode';
import type { CanvasNode } from '../entities/CanvasNode';
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
export const fullNodeMapAtom = atom(new Map<string, VariableNode>());

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
export type { SearchResult, SymbolMetadata } from '../features/UnifiedSearch/model/types';

export const searchModalOpenAtom = atom(false);
export const searchQueryAtom = atom('');
export const searchResultsAtom = atom([] as SearchResult[]);
export const searchFocusedIndexAtom = atom(0);
export const symbolMetadataAtom = atom(new Map<string, SymbolMetadata>());

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

